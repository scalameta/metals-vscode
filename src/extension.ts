"use strict";

import * as path from "path";
import { ChildProcessPromise } from "promisify-child-process";
import {
  workspace,
  ExtensionContext,
  window,
  env,
  commands,
  CodeLensProvider,
  EventEmitter,
  StatusBarAlignment,
  ProgressLocation,
  IndentAction,
  languages,
  WebviewPanel,
  ViewColumn,
  OutputChannel,
  Uri,
  Range,
  DecorationRangeBehavior,
  DecorationOptions,
  Position,
  TextEditorDecorationType,
  TextEditor,
  TextEditorEdit,
  ConfigurationTarget,
  TextDocumentContentProvider,
  CompletionList,
  CompletionItem,
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  ExecuteCommandRequest,
  Location,
  TextDocumentPositionParams,
  TextDocument,
} from "vscode-languageclient/node";
import { LazyProgress } from "./lazy-progress";
import * as fs from "fs";
import {
  getJavaHome,
  restartServer,
  checkDottyIde,
  getJavaConfig,
  fetchMetals,
  JavaConfig,
  getServerOptions,
  downloadProgress,
  installJava,
  ClientCommands,
  MetalsTreeViews,
  MetalsTreeViewReveal,
  MetalsInitializationOptions,
  ServerCommands,
  MetalsSlowTask,
  ExecuteClientCommand,
  MetalsOpenWindowParams,
  MetalsStatus,
  MetalsDidFocus,
  MetalsWindowStateDidChange,
  MetalsInputBox,
  MetalsQuickPick,
  DebugDiscoveryParams,
  RunType,
} from "metals-languageclient";
import * as metalsLanguageClient from "metals-languageclient";
import { startTreeView } from "./treeview";
import * as scalaDebugger from "./scalaDebugger";
import {
  DecorationTypeDidChange,
  DecorationsRangesDidChange,
} from "./decoration-protocol";
import { clearTimeout } from "timers";
import { increaseIndentPattern } from "./indentPattern";
import { TastyResponse } from "./executeCommand";
import { gotoLocation } from "./goToLocation";
import { openSymbolSearch } from "./openSymbolSearch";
import MetalsFileProvider from "./metalsContentProvider";
import {
  createFindInFilesTreeView,
  executeFindInFiles,
  startFindInFilesProvider,
} from "./findinfiles";

const outputChannel = window.createOutputChannel("Metals");
const openSettingsAction = "Open settings";
const downloadJava = "Download Java";
const openSettingsCommand = "workbench.action.openSettings";
const installJava8Action = "Install Java (JDK 8)";
const installJava11Action = "Install Java (JDK 11)";
let treeViews: MetalsTreeViews | undefined;
let currentClient: LanguageClient | undefined;

let worksheetDecorationType: TextEditorDecorationType =
  window.createTextEditorDecorationType({
    isWholeLine: true,
    rangeBehavior: DecorationRangeBehavior.OpenClosed,
  });

let decorationType: TextEditorDecorationType =
  window.createTextEditorDecorationType({
    rangeBehavior: DecorationRangeBehavior.OpenClosed,
  });

const config = workspace.getConfiguration("metals");

export async function activate(context: ExtensionContext) {
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
        const javaHome = await getJavaHome(
          workspace.getConfiguration("metals").get("javaHome")
        );
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

  const serverVersionConfig: string = config.get<string>("serverVersion")!;
  const defaultServerVersion =
    config.inspect<string>("serverVersion")!.defaultValue!;
  const serverVersion = serverVersionConfig
    ? serverVersionConfig.trim()
    : defaultServerVersion;

  outputChannel.appendLine(`Metals version: ${serverVersion}`);

  const serverProperties = config.get<string[]>("serverProperties")!;
  const customRepositories = config.get<string[]>("customRepositories")!;

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
  if (configProperty?.workspaceValue != undefined)
    config.update("javaHome", javaHome, false);
  else config.update("javaHome", javaHome, true);
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
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "scala" }],
    synchronize: {
      configurationSection: "metals",
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    outputChannel: outputChannel,
    initializationOptions,
    middleware: {
      // VSCode might reorder items in case if items were matched by fuzzySearch
      // This workarond is taken from:
      //   https://github.com/llvm/llvm-project/commit/c86f794bd555a272f0f74a0b0a48f158e84b26b4
      provideCompletionItem: async (
        document,
        position,
        context,
        token,
        next
      ) => {
        // Get the incomplete identifier before the cursor.
        let word = document.getWordRangeAtPosition(position);
        let prefix = word && document.getText(new Range(word.start, position));

        let list = await next(document, position, context, token);

        let isIncomplete = false;
        let originalItems: CompletionItem[] = [];
        if (Array.isArray(list)) {
          originalItems = list;
          isIncomplete = false;
        } else if (list) {
          originalItems = list.items;
        }

        let items = originalItems.map((item) => {
          if (prefix) item.filterText = prefix + "_" + item.filterText;
          return item;
        });
        return new CompletionList(items, isIncomplete);
      },
    },
  };

  const client = new LanguageClient(
    "metals",
    "Metals",
    serverOptions,
    clientOptions
  );

  currentClient = client;
  function registerCommand(command: string, callback: (...args: any[]) => any) {
    context.subscriptions.push(commands.registerCommand(command, callback));
  }

  function registerTextEditorCommand(
    command: string,
    callback: (
      textEditor: TextEditor,
      edit: TextEditorEdit,
      ...args: any[]
    ) => any
  ) {
    context.subscriptions.push(
      commands.registerTextEditorCommand(command, callback)
    );
  }

  function registerTextDocumentContentProvider(
    scheme: string,
    provider: TextDocumentContentProvider
  ) {
    context.subscriptions.push(
      workspace.registerTextDocumentContentProvider(scheme, provider)
    );
  }

  const metalsFileProvider = new MetalsFileProvider(client);

  registerTextDocumentContentProvider("metalsDecode", metalsFileProvider);
  registerTextDocumentContentProvider("jar", metalsFileProvider);

  async function decodeAndShowFile(
    uri: Uri,
    additionalExtension: string,
    decoder: string,
    alwaysUpdate: boolean,
    ...args: [string, string | number | boolean][]
  ) {
    if (!uri) {
      // no uri supplied then use the current active file
      const editor = window.visibleTextEditors.find(
        (e) =>
          isSupportedLanguage(e.document.languageId) ||
          e.document.fileName.endsWith(additionalExtension)
      );
      if (editor) uri = editor.document.uri;
    }
    if (uri) {
      // don't re-add extension. Refreshing the output file.
      const newPath = uri.path.endsWith(additionalExtension)
        ? uri.path
        : `${uri.path}.${additionalExtension}`;
      var query = `decoder=${encodeURIComponent(decoder)}`;
      for (const keyValue of args) {
        const additionalParam = `${encodeURIComponent(
          keyValue[0]
        )}=${encodeURIComponent(keyValue[1])}`;
        query = `${query}&${additionalParam}`;
      }
      // don't re-add scheme. Refreshing the output file.
      const additionalScheme =
        uri.scheme == "metalsDecode" ? "" : "metalsDecode:";
      const uriWithParams = Uri.parse(
        additionalScheme + uri.scheme + ":" + newPath
      ).with({
        query: query,
      });
      // VSCode by default caches the output and won't refresh it
      if (alwaysUpdate)
        metalsFileProvider.onDidChangeEmitter.fire(uriWithParams);
      let doc = await workspace.openTextDocument(uriWithParams);
      await window.showTextDocument(doc, { preview: false });
    }
  }

  registerCommand("metals.show-javap-verbose", async (uri: Uri) => {
    await decodeAndShowFile(uri, "javap-verbose", "javap", true, [
      "verbose",
      true,
    ]);
  });

  registerCommand("metals.show-javap", async (uri: Uri) => {
    await decodeAndShowFile(uri, "javap", "javap", true, ["verbose", false]);
  });

  registerCommand("metals.show-semanticdb-compact", async (uri: Uri) => {
    await decodeAndShowFile(uri, "semanticdb-compact", "semanticdb", true, [
      "format",
      "compact",
    ]);
  });

  registerCommand("metals.show-semanticdb-detailed", async (uri: Uri) => {
    await decodeAndShowFile(uri, "semanticdb-detailed", "semanticdb", true, [
      "format",
      "detailed",
    ]);
  });

  registerCommand(
    "metals.restartServer",
    restartServer(
      // NOTE(gabro): this is due to mismatching versions of vscode-languageserver-protocol
      // which are not trivial to fix, currently
      // @ts-ignore
      client,
      window
    )
  );

  context.subscriptions.push(client.start());

  return client.onReady().then(
    () => {
      let doctor: WebviewPanel | undefined;
      let stacktrace: WebviewPanel | undefined;
      let tastyView: WebviewPanel | undefined;

      function getDoctorPanel(isReload: boolean): WebviewPanel {
        if (!doctor) {
          doctor = window.createWebviewPanel(
            "metals-doctor",
            "Metals Doctor",
            ViewColumn.Active,
            { enableCommandUris: true }
          );
          context.subscriptions.push(doctor);
          doctor.onDidDispose(() => {
            doctor = undefined;
          });
        } else if (!isReload) {
          doctor.reveal();
        }
        return doctor;
      }

      function getStacktracePanel(): WebviewPanel {
        if (!stacktrace) {
          stacktrace = window.createWebviewPanel(
            "metals-stacktrace",
            "Analyze Stacktrace",
            ViewColumn.Beside,
            { enableCommandUris: true }
          );
          context.subscriptions.push(stacktrace);
          stacktrace.onDidDispose(() => {
            stacktrace = undefined;
          });
        }
        stacktrace.reveal();
        return stacktrace;
      }

      function getTastyPreview(): WebviewPanel {
        if (!tastyView) {
          tastyView = window.createWebviewPanel(
            "metals-show-tasty",
            "Show TASTy",
            ViewColumn.Beside,
            { enableCommandUris: true }
          );
          context.subscriptions.push(tastyView);
          tastyView.onDidDispose(() => {
            tastyView = undefined;
          });
        }
        tastyView.reveal();
        return tastyView;
      }

      [
        ServerCommands.BuildImport,
        ServerCommands.BuildRestart,
        ServerCommands.BuildConnect,
        ServerCommands.BuildDisconnect,
        ServerCommands.GenerateBspConfig,
        ServerCommands.BspSwitch,
        ServerCommands.SourcesScan,
        ServerCommands.DoctorRun,
        ServerCommands.CascadeCompile,
        ServerCommands.CleanCompile,
        ServerCommands.CancelCompilation,
        ServerCommands.AmmoniteStart,
        ServerCommands.AmmoniteStop,
      ].forEach((command) => {
        registerCommand("metals." + command, async () =>
          client.sendRequest(ExecuteCommandRequest.type, { command: command })
        );
      });

      let channelOpen = false;

      registerCommand(ClientCommands.FocusDiagnostics, () =>
        commands.executeCommand("workbench.action.problems.focus")
      );

      registerCommand(ClientCommands.RunDoctor, () =>
        commands.executeCommand(ClientCommands.RunDoctor)
      );

      registerCommand(ClientCommands.ToggleLogs, () => {
        if (channelOpen) {
          client.outputChannel.hide();
          channelOpen = false;
        } else {
          client.outputChannel.show(true);
          channelOpen = true;
        }
      });

      registerCommand(ClientCommands.StartDebugSession, (...args: any[]) => {
        scalaDebugger.start(false, ...args).then((wasStarted) => {
          if (!wasStarted) {
            window.showErrorMessage("Debug session not started");
          }
        });
      });

      registerCommand(ClientCommands.StartRunSession, (...args: any[]) => {
        scalaDebugger.start(true, ...args).then((wasStarted) => {
          if (!wasStarted) {
            window.showErrorMessage("Run session not started");
          }
        });
      });

      // should be the compilation of a currently opened file
      // but some race conditions may apply
      let compilationDoneEmitter = new EventEmitter<void>();

      let codeLensRefresher: CodeLensProvider = {
        onDidChangeCodeLenses: compilationDoneEmitter.event,
        provideCodeLenses: () => undefined,
      };

      languages.registerCodeLensProvider(
        { scheme: "file", language: "scala" },
        codeLensRefresher
      );

      // Handle the metals/executeClientCommand extension notification.
      client.onNotification(ExecuteClientCommand.type, (params) => {
        switch (params.command) {
          case ClientCommands.GotoLocation:
            const location =
              params.arguments && (params.arguments[0] as Location);
            const otherWindow =
              (params.arguments && (params.arguments[1] as Boolean)) || false;
            if (location) {
              gotoLocation(location, otherWindow);
            }
            break;
          case ClientCommands.RefreshModel:
            compilationDoneEmitter.fire();
            break;
          case ClientCommands.OpenFolder:
            const openWindowParams = params
              .arguments?.[0] as MetalsOpenWindowParams;
            if (openWindowParams) {
              commands.executeCommand(
                "vscode.openFolder",
                Uri.parse(openWindowParams.uri),
                openWindowParams.openNewWindow
              );
            }
            break;
          case "metals-show-stacktrace":
            const html = params.arguments && params.arguments[0];
            if (typeof html === "string") {
              const panel = getStacktracePanel();
              panel.webview.html = html;
            }
            break;
          case "metals-show-tasty":
            if (params.arguments && params.arguments[0]) {
              const { tasty, error } = params.arguments[0] as TastyResponse;
              if (tasty) {
                const panel = getTastyPreview();
                panel.webview.html = tasty;
              } else if (error) {
                window.showErrorMessage(error);
              }
            }
            break;
          case ClientCommands.RunDoctor:
          case ClientCommands.ReloadDoctor:
            const isRun = params.command === ClientCommands.RunDoctor;
            const isReload = params.command === ClientCommands.ReloadDoctor;
            if (isRun || (doctor && isReload)) {
              const html = params.arguments && params.arguments[0];
              if (typeof html === "string") {
                const panel = getDoctorPanel(isReload);
                panel.webview.html = html;
              }
            }
            break;
          case ClientCommands.FocusDiagnostics:
            commands.executeCommand(ClientCommands.FocusDiagnostics);
            break;
          default:
            outputChannel.appendLine(`unknown command: ${params.command}`);
        }

        // Ignore other commands since they are less important.
      });

      // The server updates the client with a brief text message about what
      // it is currently doing, for example "Compiling..".
      const item = window.createStatusBarItem(StatusBarAlignment.Right, 100);
      item.command = ClientCommands.ToggleLogs;
      item.hide();
      client.onNotification(MetalsStatus.type, (params) => {
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
          item.command = params.command;
          commands.getCommands().then((values) => {
            if (params.command && values.includes(params.command)) {
              registerCommand(params.command, () => {
                client.sendRequest(ExecuteCommandRequest.type, {
                  command: params.command!,
                });
              });
            }
          });
        } else {
          item.command = undefined;
        }
      });

      registerTextEditorCommand(
        `metals.run-current-file`,
        (editor, _edit, _args) => {
          const args: DebugDiscoveryParams = {
            path: editor.document.uri.toString(true),
            runType: RunType.Run,
          };
          scalaDebugger.start(true, args).then((wasStarted) => {
            if (!wasStarted) {
              window.showErrorMessage("Debug session not started");
            }
          });
        }
      );

      registerTextEditorCommand(
        `metals.test-current-file`,
        (editor, _edit, _args) => {
          const args: DebugDiscoveryParams = {
            path: editor.document.uri.toString(true),
            runType: RunType.TestFile,
          };
          scalaDebugger.start(true, args).then((wasStarted) => {
            if (!wasStarted) {
              window.showErrorMessage("Debug session not started");
            }
          });
        }
      );

      registerTextEditorCommand(
        `metals.test-current-target`,
        (editor, _edit, _args) => {
          const args: DebugDiscoveryParams = {
            path: editor.document.uri.toString(true),
            runType: RunType.TestTarget,
          };
          scalaDebugger.start(true, args).then((wasStarted) => {
            if (!wasStarted) {
              window.showErrorMessage("Debug session not started");
            }
          });
        }
      );

      registerTextEditorCommand(
        `metals.${ServerCommands.GotoSuperMethod}`,
        (editor, _edit, _args) => {
          client.sendRequest(ExecuteCommandRequest.type, {
            command: ServerCommands.GotoSuperMethod,
            arguments: [
              {
                document: editor.document.uri.toString(true),
                position: editor.selection.start,
              },
            ],
          });
        }
      );

      registerTextEditorCommand(
        `metals.${ServerCommands.SuperMethodHierarchy}`,
        (editor, _edit, _args) => {
          client.sendRequest(ExecuteCommandRequest.type, {
            command: ServerCommands.SuperMethodHierarchy,
            arguments: [
              {
                document: editor.document.uri.toString(true),
                position: editor.selection.start,
              },
            ],
          });
        }
      );

      registerCommand(`metals.${ServerCommands.AnalyzeStacktrace}`, () => {
        env.clipboard.readText().then((clip) => {
          if (clip.trim().length < 1) {
            window.showInformationMessage(
              "Clipboard appears to be empty, copy stacktrace to clipboard and retry this command"
            );
          } else {
            client.sendRequest(ExecuteCommandRequest.type, {
              command: "analyze-stacktrace",
              arguments: [clip],
            });
          }
        });
      });

      registerTextEditorCommand(`metals.show-tasty`, (editor) => {
        const uri = editor.document.uri;
        client.sendRequest(ExecuteCommandRequest.type, {
          command: "show-tasty",
          arguments: [uri.toString()],
        });
      });

      registerTextEditorCommand(
        `metals.${ServerCommands.CopyWorksheetOutput}`,
        (editor, _edit, _args) => {
          const uri = editor.document.uri;
          if (uri.toString().endsWith("worksheet.sc")) {
            client
              .sendRequest(ExecuteCommandRequest.type, {
                command: ServerCommands.CopyWorksheetOutput,
                arguments: [uri.toString()],
              })
              .then((result) => {
                window.showInformationMessage(result);
                if (result.value) {
                  env.clipboard.writeText(result.value);
                  window.showInformationMessage(
                    "Copied worksheet evaluation to clipboard."
                  );
                }
              });
          } else {
            window.showWarningMessage(
              "You must be in a worksheet to use this feature."
            );
          }
        }
      );

      registerCommand("metals.goto-path-uri", (...args) => {
        const uri = args[0] as string;
        const line = args[1] as number;
        const otherWindow = args[2] as boolean;
        const pos = new Position(line, 0);
        const range = new Range(pos, pos);
        const location = Location.create(uri, range);
        gotoLocation(location, otherWindow);
      });

      registerCommand(`metals.${ServerCommands.ResetChoice}`, (args = []) => {
        client.sendRequest(ExecuteCommandRequest.type, {
          command: ServerCommands.ResetChoice,
          arguments: args,
        });
      });

      registerCommand(`metals.${ServerCommands.Goto}`, (args) => {
        client.sendRequest(ExecuteCommandRequest.type, {
          command: ServerCommands.Goto,
          arguments: args,
        });
      });

      registerCommand("metals.reveal-active-file", () => {
        if (treeViews) {
          const editor = window.visibleTextEditors.find((e) =>
            isSupportedLanguage(e.document.languageId)
          );
          if (editor) {
            const pos = editor.selection.start;
            const params: TextDocumentPositionParams = {
              textDocument: { uri: editor.document.uri.toString() },
              position: { line: pos.line, character: pos.character },
            };
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

      registerCommand(ClientCommands.EchoCommand, (arg: string) => {
        client.sendRequest(ExecuteCommandRequest.type, {
          command: arg,
        });
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

      registerCommand(
        `metals.${ServerCommands.NewScalaFile}`,
        async (directory: Uri) => {
          return client.sendRequest(ExecuteCommandRequest.type, {
            command: ServerCommands.NewScalaFile,
            arguments: [directory?.toString()],
          });
        }
      );

      const findInFilesProvider = startFindInFilesProvider(context);
      const findInFilesView = createFindInFilesTreeView(
        findInFilesProvider,
        context
      );

      registerCommand(`metals.find-text-in-dependency-jars`, async () =>
        executeFindInFiles(
          client,
          findInFilesProvider,
          findInFilesView,
          outputChannel
        )
      );

      registerCommand(`metals.new-scala-worksheet`, async () => {
        const sendRequest = (args: Array<string | undefined>) => {
          return client.sendRequest(ExecuteCommandRequest.type, {
            command: ServerCommands.NewScalaFile,
            arguments: args,
          });
        };
        const currentUri = window.activeTextEditor?.document.uri;
        if (currentUri != null) {
          const parentUri = path.dirname(currentUri.toString());
          const name = path.basename(parentUri);
          const parentPath = Uri.parse(parentUri).fsPath;
          const fullPath = path.join(parentPath, `${name}.worksheet.sc`);
          if (fs.existsSync(fullPath)) {
            window.showWarningMessage(
              `A worksheet ${name}.worksheet.sc already exists, opening it instead`
            );
            return workspace
              .openTextDocument(fullPath)
              .then((textDocument) => window.showTextDocument(textDocument));
          } else {
            return sendRequest([parentUri, name, "worksheet"]);
          }
        } else {
          return sendRequest([undefined, undefined, "worksheet"]);
        }
      });

      registerCommand(`metals.${ServerCommands.NewScalaProject}`, async () => {
        return client.sendRequest(ExecuteCommandRequest.type, {
          command: ServerCommands.NewScalaProject,
        });
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
          let delay = Math.max(0, waitTime - (params.secondsElapsed || 0));
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
      scalaDebugger
        .initialize(outputChannel)
        .forEach((disposable) => context.subscriptions.push(disposable));
      client.onNotification(DecorationTypeDidChange.type, (options) => {
        decorationType = window.createTextEditorDecorationType(options);
      });
      client.onNotification(DecorationsRangesDidChange.type, (params) => {
        const editors = window.visibleTextEditors;
        const path = Uri.parse(params.uri).toString();
        const editor = editors.find(
          (editor) => editor.document.uri.toString() == path
        );
        if (editor) {
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
          if (params.uri.endsWith(".worksheet.sc"))
            editor.setDecorations(worksheetDecorationType, options);
          else editor.setDecorations(decorationType, options);
        } else {
          outputChannel.appendLine(
            `Ignoring decorations for non-active document '${params.uri}'.`
          );
        }
      });
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
    if (seconds === 0) return `${minutes}m`;
    else return `${minutes}m${seconds}s`;
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

function toggleBooleanWorkspaceSetting(setting: string) {
  const config = workspace.getConfiguration("metals");
  const configProperty = config.inspect<boolean>(setting);
  const currentValues = configProperty?.workspaceValue ?? false;
  config.update(setting, !currentValues, ConfigurationTarget.Workspace);
}
