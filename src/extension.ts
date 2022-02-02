import * as fs from "fs";
import * as metalsLanguageClient from "metals-languageclient";
import {
  checkDottyIde,
  ClientCommands,
  downloadProgress,
  fetchMetals,
  getJavaConfig,
  getJavaHome,
  getServerOptions,
  installJava,
  JavaConfig,
  MetalsDidFocus,
  MetalsInitializationOptions,
  MetalsInputBox,
  MetalsQuickPick,
  MetalsSlowTask,
  MetalsStatus,
  MetalsTreeViewReveal,
  MetalsTreeViews,
  MetalsWindowStateDidChange,
  restartServer,
  TestUIKind,
} from "metals-languageclient";
import * as path from "path";
import { ChildProcessPromise } from "promisify-child-process";
import { clearTimeout } from "timers";
import {
  CodeLensProvider,
  commands,
  ConfigurationTarget,
  DecorationOptions,
  DecorationRangeBehavior,
  EventEmitter,
  ExtensionContext,
  Hover,
  IndentAction,
  languages,
  OutputChannel,
  Position,
  ProgressLocation,
  ProviderResult,
  Range,
  StatusBarAlignment,
  TextDocument,
  TextEditorDecorationType,
  Uri,
  window,
  workspace,
} from "vscode";
import {
  CancellationToken,
  CodeLensRefreshRequest,
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
} from "vscode-languageclient/node";
import { registerClientCommands } from "./commands/client-commands";
import { registerExecuteClientCommands } from "./commands/execute-client-command";
import { registerServerCommands } from "./commands/server-comands";
import { registerTextEditorCommands } from "./commands/text-editor-commands";
import { registerMetalsDecodeCommands } from "./decode-file/decode-file-commands";
import { DecorationsRangesDidChange } from "./decoration-protocol";
import { registerFindInFilesProvider } from "./find-in-files/find-in-file-provider";
import * as ext from "./hoverExtension";
import { increaseIndentPattern } from "./indentPattern";
import { LazyProgress } from "./lazy-progress";
import { openSymbolSearch } from "./openSymbolSearch";
import * as scalaDebugger from "./scalaDebugger";
import { createTestManager } from "./test-explorer/test-manager";
import { startTreeView } from "./treeview";
import {
  getJavaHomeFromConfig,
  getTextDocumentPositionParams,
  getValueFromConfig,
  toggleBooleanWorkspaceSetting,
} from "./util";
const outputChannel = window.createOutputChannel("Metals");
const openSettingsAction = "Open settings";
const downloadJava = "Download Java";
const openSettingsCommand = "workbench.action.openSettings";
const installJava8Action = "Install Java (JDK 8)";
const installJava11Action = "Install Java (JDK 11)";
let treeViews: MetalsTreeViews | undefined;
let currentClient: LanguageClient | undefined;

// Inline needs to be first to be shown always first
const inlineDecorationType: TextEditorDecorationType =
  window.createTextEditorDecorationType({
    rangeBehavior: DecorationRangeBehavior.OpenOpen,
  });

const decorationType: TextEditorDecorationType =
  window.createTextEditorDecorationType({
    isWholeLine: true,
    rangeBehavior: DecorationRangeBehavior.OpenClosed,
  });

const config = workspace.getConfiguration("metals");

export async function activate(context: ExtensionContext): Promise<void> {
  detectLaunchConfigurationChanges();
  checkServerVersion();
  configureSettingsDefaults();

  return window.withProgress(
    {
      location: ProgressLocation.Window,
      title: `Starting Metals server...`,
      cancellable: false,
    },
    async () => {
      commands.executeCommand("setContext", "metals:enabled", true);
      try {
        const javaHome = await getJavaHome(getJavaHomeFromConfig());
        return fetchAndLaunchMetals(context, javaHome);
      } catch (err) {
        outputChannel.appendLine(`${err}`);
        showMissingJavaMessage();
      }
    }
  );
}

export function deactivate(): Thenable<void> | undefined {
  return currentClient?.stop();
}

function showMissingJavaMessage(): Thenable<void> {
  const message =
    "Unable to find a Java 8 or Java 11 installation on this computer. " +
    "To fix this problem, update the 'metals.javaHome' setting to point to a Java 8 or Java 11 home directory " +
    "or select a version to install automatically";

  outputChannel.appendLine(message);

  return window
    .showErrorMessage(
      message,
      openSettingsAction,
      installJava8Action,
      installJava11Action
    )
    .then(chooseJavaToInstall);
}

function showInstallJavaMessage(): Thenable<void> {
  const message =
    "Which version would you like to install?" +
    "Currently supported are JDK 8 and JDK 11: ";

  outputChannel.appendLine(message);

  return window
    .showInformationMessage(
      message,
      openSettingsAction,
      installJava8Action,
      installJava11Action
    )
    .then(chooseJavaToInstall);
}

function chooseJavaToInstall(choice: string | undefined) {
  switch (choice) {
    case openSettingsAction: {
      commands.executeCommand(openSettingsCommand);
      break;
    }
    case installJava8Action: {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Installing Java (JDK 8), please wait...`,
          cancellable: true,
        },
        () =>
          installJava({ javaVersion: "adopt@1.8", outputChannel }).then(
            updateJavaConfig
          )
      );
      break;
    }
    case installJava11Action: {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Installing Java (JDK 11), please wait...`,
          cancellable: true,
        },
        () =>
          installJava({ javaVersion: "adopt@1.11", outputChannel }).then(
            updateJavaConfig
          )
      );
      break;
    }
  }
}

function fetchAndLaunchMetals(context: ExtensionContext, javaHome: string) {
  if (!workspace.workspaceFolders) {
    outputChannel.appendLine(
      `Metals will not start because you've opened a single file and not a project directory.`
    );
    return;
  }
  const dottyIde = checkDottyIde(workspace.workspaceFolders[0]?.uri.fsPath);
  if (dottyIde.enabled) {
    outputChannel.appendLine(
      `Metals will not start since Dotty is enabled for this workspace. ` +
        `To enable Metals, remove the file ${dottyIde.path} and run 'Reload window'`
    );
    return;
  }

  outputChannel.appendLine(`Java home: ${javaHome}`);

  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const serverVersionConfig = config.get<string>("serverVersion")!;
  const defaultServerVersion =
    config.inspect<string>("serverVersion")!.defaultValue!;
  const serverVersion = serverVersionConfig
    ? serverVersionConfig.trim()
    : defaultServerVersion;

  outputChannel.appendLine(`Metals version: ${serverVersion}`);

  const serverProperties = config.get<string[]>("serverProperties")!;
  const customRepositories = config.get<string[]>("customRepositories")!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */

  const javaConfig = getJavaConfig({
    workspaceRoot: workspace.workspaceFolders[0]?.uri.fsPath,
    javaHome,
    customRepositories,
    extensionPath: context.extensionPath,
  });

  const fetchProcess = fetchMetals({
    serverVersion,
    serverProperties,
    javaConfig,
  });

  const title = `Downloading Metals v${serverVersion}`;
  return trackDownloadProgress(title, outputChannel, fetchProcess).then(
    (classpath) => {
      return launchMetals(
        outputChannel,
        context,
        classpath,
        serverProperties,
        javaConfig
      );
    },
    (reason) => {
      if (reason instanceof Error) {
        outputChannel.appendLine(
          "Downloading Metals failed with the following:"
        );
        outputChannel.appendLine(reason.message);
      }
      const msg = (() => {
        const proxy =
          `See https://scalameta.org/metals/docs/editors/vscode.html#http-proxy for instructions ` +
          `if you are using an HTTP proxy.`;
        if (process.env.FLATPAK_SANDBOX_DIR) {
          return (
            `Failed to download Metals. It seems you are running Visual Studio Code inside the ` +
            `Flatpak sandbox, which is known to interfere with the download of Metals. ` +
            `Please, try running Visual Studio Code without Flatpak.`
          );
        } else if (serverVersion === defaultServerVersion) {
          return (
            `Failed to download Metals, make sure you have an internet connection and ` +
            `the Java Home '${javaHome}' is valid. You can configure the Java Home in the settings.` +
            proxy
          );
        } else {
          return (
            `Failed to download Metals, make sure you have an internet connection, ` +
            `the Metals version '${serverVersion}' is correct and the Java Home '${javaHome}' is valid. ` +
            `You can configure the Metals version and Java Home in the settings.` +
            proxy
          );
        }
      })();
      outputChannel.show();
      window
        .showErrorMessage(msg, openSettingsAction, downloadJava)
        .then((choice) => {
          if (choice === openSettingsAction) {
            commands.executeCommand(openSettingsCommand);
          } else if (choice === downloadJava) {
            showInstallJavaMessage();
          }
        });
    }
  );
}

function updateJavaConfig(javaHome: string) {
  const config = workspace.getConfiguration("metals");
  const configProperty = config.inspect<Record<string, string>>("javaHome");
  if (configProperty?.workspaceValue != undefined) {
    config.update("javaHome", javaHome, false);
  } else {
    config.update("javaHome", javaHome, true);
  }
}

function launchMetals(
  outputChannel: OutputChannel,
  context: ExtensionContext,
  metalsClasspath: string,
  serverProperties: string[],
  javaConfig: JavaConfig
) {
  // Make editing Scala docstrings slightly nicer.
  enableScaladocIndentation();

  const serverOptions = getServerOptions({
    metalsClasspath,
    serverProperties,
    javaConfig,
    clientName: "vscode",
  });

  const initializationOptions: MetalsInitializationOptions = {
    compilerOptions: {
      completionCommand: "editor.action.triggerSuggest",
      overrideDefFormat: "unicode",
      parameterHintsCommand: "editor.action.triggerParameterHints",
    },
    copyWorksheetOutputProvider: true,
    decorationProvider: true,
    inlineDecorationProvider: true,
    debuggingProvider: true,
    doctorProvider: "html",
    didFocusProvider: true,
    executeClientCommandProvider: true,
    globSyntax: "vscode",
    icons: "vscode",
    inputBoxProvider: true,
    openFilesOnRenameProvider: true,
    openNewWindowProvider: true,
    quickPickProvider: true,
    slowTaskProvider: true,
    statusBarProvider: "on",
    treeViewProvider: true,
    testExplorerProvider: true,
    commandInHtmlFormat: "vscode",
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "scala" },
      { scheme: "file", language: "java" },
    ],
    synchronize: {
      configurationSection: "metals",
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    outputChannel: outputChannel,
    initializationOptions,
    middleware: {
      provideHover: hoverLinksMiddlewareHook,
    },
    markdown: {
      isTrusted: true,
    },
  };

  function hoverLinksMiddlewareHook(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): ProviderResult<Hover> {
    const editor = window.activeTextEditor;
    const pos = client.code2ProtocolConverter.asPosition(position);
    const range = editor?.selection?.contains(position)
      ? client.code2ProtocolConverter.asRange(editor.selection)
      : undefined;
    return client
      .sendRequest(
        ext.hover,
        {
          textDocument:
            client.code2ProtocolConverter.asTextDocumentIdentifier(document),
          position: pos,
          range: range,
        },
        token
      )
      .then(
        (result) => {
          return client.protocol2CodeConverter.asHover(result);
        },
        () => {
          return Promise.resolve(null);
        }
      );
  }

  const client = new LanguageClient(
    "metals",
    "Metals",
    serverOptions,
    clientOptions
  );

  currentClient = client;
  function registerCommand(
    command: string,
    callback: (...args: any[]) => unknown
  ) {
    context.subscriptions.push(commands.registerCommand(command, callback));
  }

  registerCommand(
    "metals.restartServer",
    restartServer(
      // NOTE(gabro): this is due to mismatching versions of vscode-languageserver-protocol
      // which are not trivial to fix, currently
      client,
      window
    )
  );

  context.subscriptions.push(client.start());

  return client.onReady().then(
    () => {
      // should be the compilation of a currently opened file
      // but some race conditions may apply
      const compilationDoneEmitter = new EventEmitter<void>();

      const codeLensRefresher: CodeLensProvider = {
        onDidChangeCodeLenses: compilationDoneEmitter.event,
        provideCodeLenses: () => undefined,
      };

      languages.registerCodeLensProvider(
        { scheme: "file", language: "scala" },
        codeLensRefresher
      );

      const getTestUI = () =>
        getValueFromConfig<TestUIKind>(
          config,
          "testUserInterface",
          "Test Explorer"
        );

      const istTestManagerDisabled = getTestUI() === "Code Lenses";
      const testManager = createTestManager(client, istTestManagerDisabled);

      const disableTestExplorer = workspace.onDidChangeConfiguration(() => {
        const testUI = getTestUI();
        if (testUI === "Code Lenses") {
          testManager.disable();
        } else {
          testManager.enable();
        }
      });

      const refreshTests = client.onRequest(CodeLensRefreshRequest.type, () => {
        testManager.discoverTestSuites();
      });

      context.subscriptions.push(disableTestExplorer);
      context.subscriptions.push(refreshTests);
      context.subscriptions.push(testManager.testController);

      // The server updates the client with a brief text message about what
      // it is currently doing, for example "Compiling..".
      const item = window.createStatusBarItem(StatusBarAlignment.Right, 100);
      item.command = ClientCommands.ToggleLogs;
      item.hide();
      const metalsStatusDisposable = client.onNotification(
        MetalsStatus.type,
        (params) => {
          item.text = params.text;
          if (params.show) {
            item.show();
          } else if (params.hide) {
            item.hide();
          }
          if (params.tooltip) {
            item.tooltip = params.tooltip;
          }
          if (params.command) {
            const command = params.command;
            item.command = params.command;
            commands.getCommands().then((values) => {
              if (values.includes(command)) {
                commands.executeCommand(command);
              }
            });
          } else {
            item.command = undefined;
          }
        }
      );
      context.subscriptions.push(metalsStatusDisposable);

      registerClientCommands(context, client);
      registerServerCommands(context, client);
      registerMetalsDecodeCommands(context, client);
      registerTextEditorCommands(context, client);
      registerExecuteClientCommands(context, client, {
        compilationDoneEmitter,
        outputChannel,
      });
      registerFindInFilesProvider(context, client, outputChannel);

      registerCommand("metals.reveal-active-file", () => {
        if (treeViews) {
          const editor = window.visibleTextEditors.find((e) =>
            isSupportedLanguage(e.document.languageId)
          );
          if (editor) {
            const params = getTextDocumentPositionParams(editor);
            return window.withProgress(
              {
                location: ProgressLocation.Window,
                title: "Metals: Reveal Active File in Side Bar",
              },
              (progress) => {
                return client
                  .sendRequest(MetalsTreeViewReveal.type, params)
                  .then((result) => {
                    progress.report({ increment: 100 });
                    if (treeViews) {
                      treeViews.reveal(result);
                    }
                  });
              }
            );
          }
        } else {
          window.showErrorMessage(
            "This version of Metals does not support tree views."
          );
        }
      });

      registerCommand("metals.toggle-implicit-conversions-and-classes", () => {
        toggleBooleanWorkspaceSetting("showImplicitConversionsAndClasses");
      });

      registerCommand("metals.toggle-implicit-parameters", () => {
        toggleBooleanWorkspaceSetting("showImplicitArguments");
      });

      registerCommand("metals.toggle-show-inferred-type", () => {
        toggleBooleanWorkspaceSetting("showInferredType");
      });

      // NOTE: we offer a custom symbol search command to work around the limitations of the built-in one, see https://github.com/microsoft/vscode/issues/98125 for more details.
      registerCommand(`metals.symbol-search`, () => openSymbolSearch(client));

      window.onDidChangeActiveTextEditor((editor) => {
        if (editor && isSupportedLanguage(editor.document.languageId)) {
          client.sendNotification(
            MetalsDidFocus.type,
            editor.document.uri.toString()
          );
        }
      });

      window.onDidChangeWindowState((windowState) => {
        client.sendNotification(MetalsWindowStateDidChange.type, {
          focused: windowState.focused,
        });
      });

      client.onRequest(MetalsInputBox.type, (options, requestToken) => {
        return window
          .showInputBox(options, requestToken)
          .then(MetalsInputBox.handleInput);
      });

      client.onRequest(MetalsQuickPick.type, (params, requestToken) => {
        return window
          .showQuickPick(params.items, params, requestToken)
          .then((result) => {
            if (result === undefined) {
              return { cancelled: true };
            } else {
              return { itemId: result.id };
            }
          });
      });
      languages.registerCompletionItemProvider;

      // Long running tasks such as "import project" trigger start a progress
      // bar with a "cancel" button.
      client.onRequest(MetalsSlowTask.type, (params, requestToken) => {
        return new Promise((requestResolve) => {
          const showLogs = ` ([show logs](command:${ClientCommands.ToggleLogs} "Show Metals logs"))`;

          // Wait a bit before showing the progress notification
          const waitTime = 2;
          const delay = Math.max(0, waitTime - (params.secondsElapsed || 0));
          const timeout = setTimeout(() => {
            window.withProgress(
              {
                location: ProgressLocation.Notification,
                title: params.message + showLogs,
                cancellable: true,
              },
              (progress, progressToken) => {
                // Update total running time every second.
                let seconds = params.secondsElapsed || waitTime;
                progress.report({ message: readableSeconds(seconds) });
                const interval = setInterval(() => {
                  seconds += 1;
                  progress.report({ message: readableSeconds(seconds) });
                }, 1000);

                // Hide logs and clean up resources on completion.
                function onComplete() {
                  clearInterval(interval);
                }

                // Client triggered cancelation from the progress notification.
                progressToken.onCancellationRequested(() => {
                  onComplete();
                  requestResolve({ cancel: true });
                });

                return new Promise((progressResolve) => {
                  // Server completed long running task.
                  requestToken.onCancellationRequested(() => {
                    onComplete();
                    progress.report({ increment: 100 });
                    setTimeout(() => progressResolve(undefined), 1000);
                  });
                });
              }
            );
          }, delay * 1000);

          // do not show the notification at all if the task already completed
          requestToken.onCancellationRequested(() => {
            clearTimeout(timeout);
          });
        });
      });
      // NOTE(olafur): `require("./package.json")` should work in theory but it
      // seems to read a stale version of package.json when I try it.
      const packageJson = JSON.parse(
        fs.readFileSync(
          path.join(context.extensionPath, "package.json"),
          "utf8"
        )
      );
      const viewIds = packageJson.contributes.views["metals-explorer"].map(
        (view: { id: string }) => view.id
      );
      treeViews = startTreeView(client, outputChannel, context, viewIds);
      context.subscriptions.concat(treeViews.disposables);
      scalaDebugger.initialize(outputChannel).forEach((disposable) => {
        context.subscriptions.push(disposable);
      });
      const decorationsRangesDidChangeDispoasable = client.onNotification(
        DecorationsRangesDidChange.type,
        (params) => {
          const editors = window.visibleTextEditors;
          const path = Uri.parse(params.uri).toString();
          const workheetEditors = editors.filter(
            (editor) => editor.document.uri.toString() == path
          );
          if (workheetEditors.length > 0) {
            const options = params.options.map<DecorationOptions>((o) => {
              return {
                range: new Range(
                  new Position(o.range.start.line, o.range.start.character),
                  new Position(o.range.end.line, o.range.end.character)
                ),
                hoverMessage: o.hoverMessage?.value,
                renderOptions: o.renderOptions,
              };
            });
            workheetEditors.forEach((editor) => {
              if (params.isInline) {
                editor.setDecorations(inlineDecorationType, options);
              } else {
                editor.setDecorations(decorationType, options);
              }
            });
          } else {
            outputChannel.appendLine(
              `Ignoring decorations for non-active document '${params.uri}'.`
            );
          }
        }
      );
      context.subscriptions.push(decorationsRangesDidChangeDispoasable);
    },
    (reason) => {
      if (reason instanceof Error) {
        outputChannel.appendLine("Could not launch Metals Language Server:");
        outputChannel.appendLine(reason.message);
      }
    }
  );
}

function trackDownloadProgress(
  title: string,
  output: OutputChannel,
  download: ChildProcessPromise
): Promise<string> {
  const progress = new LazyProgress();
  return downloadProgress({
    download,
    onError: (stdout) =>
      stdout.forEach((buffer) => output.append(buffer.toString())),
    onProgress: (msg) => {
      output.appendLine(msg);
      progress.startOrContinue(title, output, download);
    },
  });
}

function readableSeconds(totalSeconds: number): string {
  const minutes = (totalSeconds / 60) | 0;
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    if (seconds === 0) {
      return `${minutes}m`;
    } else {
      return `${minutes}m${seconds}s`;
    }
  } else {
    return `${seconds}s`;
  }
}

function enableScaladocIndentation() {
  // Adapted from:
  // https://github.com/Microsoft/vscode/blob/9d611d4dfd5a4a101b5201b8c9e21af97f06e7a7/extensions/typescript/src/typescriptMain.ts#L186
  languages.setLanguageConfiguration("scala", {
    indentationRules: {
      // ^(.*\*/)?\s*\}.*$
      decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
      // ^.*\{[^}"']*$
      increaseIndentPattern: /^.*\{[^}"']*$/,
    },
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    onEnterRules: [
      {
        // e.g. /** | */
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: { indentAction: IndentAction.IndentOutdent, appendText: " * " },
      },
      {
        // indent in places with optional braces
        beforeText: increaseIndentPattern(),
        action: { indentAction: IndentAction.Indent },
      },
      {
        // stop vscode from indenting automatically to last known indentation
        beforeText: /^\s*/,
        /* we still want {} to be nicely split with two new lines into
         *{
         *  |
         *}
         */
        afterText: /[^\]\}\)]+/,
        action: { indentAction: IndentAction.None },
      },
      {
        // e.g. /** ...|
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        action: { indentAction: IndentAction.None, appendText: " * " },
      },
      {
        // e.g.  * ...| Javadoc style
        beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
        action: { indentAction: IndentAction.None, appendText: "* " },
      },
      {
        // e.g.  * ...| Scaladoc style
        beforeText: /^(\t|(\ \ ))*\*(\ ([^\*]|\*(?!\/))*)?$/,
        action: { indentAction: IndentAction.None, appendText: "* " },
      },
      {
        // e.g.  */|
        beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
        action: { indentAction: IndentAction.None, removeText: 1 },
      },
      {
        // e.g.  *-----*/|
        beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
        action: { indentAction: IndentAction.None, removeText: 1 },
      },
    ],
  });
}

function detectLaunchConfigurationChanges() {
  metalsLanguageClient.detectLaunchConfigurationChanges(
    workspace,
    ({ message, reloadWindowChoice, dismissChoice }) =>
      window
        .showInformationMessage(message, reloadWindowChoice, dismissChoice)
        .then((choice) => {
          if (choice === reloadWindowChoice) {
            commands.executeCommand("workbench.action.reloadWindow");
          }
        })
  );
}

function checkServerVersion() {
  const config = workspace.getConfiguration("metals");
  metalsLanguageClient.checkServerVersion({
    config,
    updateConfig: ({
      configSection,
      latestServerVersion,
      configurationTarget,
    }) =>
      config.update(configSection, latestServerVersion, configurationTarget),
    onOutdated: ({
      message,
      upgradeChoice,
      openSettingsChoice,
      dismissChoice,
      upgrade,
    }) =>
      window
        .showWarningMessage(
          message,
          upgradeChoice,
          openSettingsChoice,
          dismissChoice
        )
        .then((choice) => {
          switch (choice) {
            case upgradeChoice:
              upgrade();
              break;
            case openSettingsChoice:
              commands.executeCommand(openSettingsCommand);
              break;
          }
        }),
  });
}

function isSupportedLanguage(languageId: TextDocument["languageId"]): boolean {
  switch (languageId) {
    case "scala":
    case "sc":
    case "java":
      return true;
    default:
      return false;
  }
}

// NOTE(gabro): we would normally use the `configurationDefaults` contribution point in the
// extension manifest but that's currently limited to language-scoped settings in VSCode.
// We use this method to set global configuration settings such as `files.watcherExclude`.
function configureSettingsDefaults() {
  function updateFileConfig(
    configKey: string,
    propertyKey: string,
    newValues: Record<string, boolean>,
    configurationTarget:
      | ConfigurationTarget.Global
      | ConfigurationTarget.Workspace
  ) {
    const config = workspace.getConfiguration(configKey);
    const configProperty = config.inspect<Record<string, boolean>>(propertyKey);
    const currentValues = ((): Record<string, boolean> => {
      switch (configurationTarget) {
        case ConfigurationTarget.Global:
          return configProperty?.globalValue ?? {};
        case ConfigurationTarget.Workspace:
          return configProperty?.workspaceValue ?? {};
      }
    })();
    config.update(
      propertyKey,
      { ...currentValues, ...newValues },
      configurationTarget
    );
  }
  updateFileConfig(
    "files",
    "watcherExclude",
    {
      "**/.bloop": true,
      "**/.metals": true,
      "**/.ammonite": true,
    },
    ConfigurationTarget.Global
  );
  updateFileConfig(
    "files",
    "watcherExclude",
    {
      "**/target": true,
    },
    ConfigurationTarget.Workspace
  );
}
