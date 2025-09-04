import * as vscode from "vscode";
import { ResponseError } from "vscode-languageserver-protocol";
import {
  commands,
  DebugConfiguration,
  Disposable,
  WorkspaceFolder,
  DebugAdapterDescriptor,
  DebugConfigurationProviderTriggerKind,
  tasks,
  Task,
  ShellExecution,
} from "vscode";
import { ExtendedScalaRunMain, ScalaCodeLensesParams } from "./types";
import { platform } from "os";
import { currentWorkspaceFolder } from "../util";
import {
  DebugDiscoveryParams,
  RunType,
} from "../interfaces/DebugDiscoveryParams";
import { ServerCommands } from "../interfaces/ServerCommands";

const configurationType = "scala";

const workspaceHadErrors = 543; // custom code we picked to represent this

export interface DebugSession {
  name: string;
  uri: string;
}

export function initialize(outputChannel: vscode.OutputChannel): Disposable[] {
  outputChannel.appendLine("Initializing Scala Debugger");
  return [
    vscode.debug.registerDebugConfigurationProvider(
      configurationType,
      new ScalaMainConfigProvider(),
      DebugConfigurationProviderTriggerKind.Initial,
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory(
      configurationType,
      new ScalaDebugServerFactory(),
    ),
  ];
}

function isExtendedScalaRunMain(
  runMain: ScalaCodeLensesParams,
): runMain is ExtendedScalaRunMain {
  return (
    runMain.dataKind === "scala-main-class" &&
    runMain.data.shellCommand != undefined
  );
}

/**
 * Return platform specific options for task.
 *
 * By default, task will use whatever shell user has defined as a default one.
 * However, for Windows tasks seems to not work properly with Powershell,
 * that's why we want to explicitly specify executable as plain old cmd
 */
function platformSpecificOptions(): vscode.ShellExecutionOptions {
  if (platform() == "win32") {
    return { executable: "cmd.exe", shellArgs: ["/c"] };
  } else {
    return {};
  }
}

function taskFromArgs(
  classpath: string,
  javaBinary: string,
  jvmOptions: string[],
  args: string[],
  mainClass: string,
  shellOptions: vscode.ShellExecutionOptions,
): vscode.ShellExecution {
  const allArgs = ["-classpath", classpath, ...jvmOptions, mainClass, ...args];
  const shellArgs: vscode.ShellQuotedString[] = allArgs.map((arg) => ({
    value: arg,
    quoting: vscode.ShellQuoting.Strong,
  }));

  const shellCommand: vscode.ShellQuotedString = {
    value: javaBinary,
    quoting: vscode.ShellQuoting.Strong,
  };
  return new ShellExecution(shellCommand, shellArgs, shellOptions);
}

function escapedShellCommand(
  main: ExtendedScalaRunMain,
  env: Record<string, string>,
): vscode.ShellExecution {
  const classpath = main.data.classpath;
  const jvmOptions = main.data.jvmOptions;
  const javaBinary = main.data.javaBinary;
  const mainClass = main.data.class;
  const args = main.data.arguments;
  if (classpath && javaBinary) {
    const shellOptions = { env };
    return taskFromArgs(
      classpath,
      javaBinary,
      jvmOptions,
      args,
      mainClass,
      shellOptions,
    );
  } else {
    const shellOptions = { ...platformSpecificOptions(), env };
    return new ShellExecution(main.data.shellCommand, shellOptions);
  }
}

async function runMain(main: ExtendedScalaRunMain): Promise<boolean> {
  const environmentVariables = main.data.environmentVariables;
  const workspaceFolder = currentWorkspaceFolder();
  if (workspaceFolder) {
    const env = environmentVariables.reduce<Record<string, string>>(
      (acc, envKeyValue) => {
        const [key, value] = envKeyValue.split("=");
        return { ...acc, [key]: value };
      },
      {},
    );

    const task = new Task(
      { type: "scala", task: "run", class: main.data.class },
      workspaceFolder,
      "Scala run",
      "Metals",
      escapedShellCommand(main, env),
    );

    await tasks.executeTask(task);
    return true;
  } else {
    return debug(true, main);
  }
}

export async function startDiscovery(
  noDebug: boolean,
  debugParams: DebugDiscoveryParams,
): Promise<boolean> {
  if (
    noDebug &&
    debugParams.runType != RunType.TestFile &&
    debugParams.runType != RunType.TestTarget
  ) {
    let response: ScalaCodeLensesParams | undefined;
    try {
      response = await vscode.commands.executeCommand<ScalaCodeLensesParams>(
        "discover-jvm-run-command",
        debugParams,
      );
    } catch (_error) {
      // recovering from discover-jvm-run-command failure
      // when trying to run a main class from a dependency
      return debug(noDebug, debugParams);
    }
    if (response && isExtendedScalaRunMain(response)) {
      return runMain(response);
    } else {
      return debug(noDebug, debugParams);
    }
  } else {
    return debug(noDebug, debugParams);
  }
}

export async function start(
  noDebug: boolean,
  debugParams: ScalaCodeLensesParams,
): Promise<boolean> {
  if (noDebug && isExtendedScalaRunMain(debugParams)) {
    return runMain(debugParams);
  } else {
    return debug(noDebug, debugParams);
  }
}

function handleCompileError(error: ResponseError) {
  vscode.window
    .showErrorMessage(error.message, { modal: true }, "View Problems")
    .then((action) => {
      if (action === "View Problems") {
        vscode.commands.executeCommand("workbench.action.problems.focus");
      }
    });
}

async function debug(
  noDebug: boolean,
  debugParams: DebugDiscoveryParams | ScalaCodeLensesParams,
): Promise<boolean> {
  await commands.executeCommand("workbench.action.files.save");

  let response: DebugSession | undefined;
  try {
    response = await vscode.commands.executeCommand<DebugSession>(
      ServerCommands.DebugAdapterStart,
      debugParams,
    );
  } catch (error) {
    if (error instanceof ResponseError && error.code === workspaceHadErrors) {
      handleCompileError(error);
      // Returning false suppresses vscode's error popup wrongly suggesting to "Open launch.json".
      // We put the responsibility to visibly show error messages in the hands
      // of the server for compile errors.
      // Also an error in the executeCommand still shows up in metals.log
      return false;
    }

    throw error;
  }

  if (response === undefined) {
    return false;
  }

  const port = debugServerFromUri(response.uri).port;

  const configuration: vscode.DebugConfiguration = {
    type: configurationType,
    name: response.name,
    noDebug: noDebug,
    request: "launch",
    debugServer: port, // note: MUST be a number. vscode magic - automatically connects to the server
  };
  commands.executeCommand("workbench.panel.repl.view.focus");
  return vscode.debug.startDebugging(undefined, configuration);
}

class ScalaMainConfigProvider implements vscode.DebugConfigurationProvider {
  async resolveDebugConfiguration(
    _folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration,
  ): Promise<DebugConfiguration | null> {
    const editor = vscode.window.activeTextEditor;
    // debugConfiguration.type is undefined if there are no configurations
    // we are running whatever is in the file
    if (debugConfiguration.type === undefined && editor) {
      const args: DebugDiscoveryParams = {
        path: editor.document.uri.toString(true),
        runType: RunType.RunOrTestFile,
        buildTarget: undefined,
        mainClass: undefined,
        args: undefined,
        jvmOptions: undefined,
        env: undefined,
        envFile: undefined,
      };
      await startDiscovery(debugConfiguration.noDebug, args);
      return debugConfiguration;
    } else {
      return debugConfiguration;
    }
  }
}

class ScalaDebugServerFactory implements vscode.DebugAdapterDescriptorFactory {
  async createDebugAdapterDescriptor(
    session: vscode.DebugSession,
  ): Promise<DebugAdapterDescriptor | null> {
    if (
      session.configuration.mainClass !== undefined ||
      session.configuration.testClass !== undefined ||
      session.configuration.hostName !== undefined
    ) {
      if (session.configuration.noDebug) {
        const args: DebugDiscoveryParams = {
          path: undefined,
          mainClass: session.configuration.mainClass,
          buildTarget: session.configuration.buildTarget,
          runType: RunType.Run,
          args: session.configuration.args,
          jvmOptions: session.configuration.jvmOptions,
          env: session.configuration.env,
          envFile: session.configuration.envFile,
        };
        await startDiscovery(session.configuration.noDebug, args);

        // This is the only way not to have to run full fledged DAP server
        return new vscode.DebugAdapterExecutable("echo", [
          '"Running in the task window"',
        ]);
      } else {
        let debugSession: DebugSession | undefined;
        try {
          debugSession = await vscode.commands.executeCommand<DebugSession>(
            ServerCommands.DebugAdapterStart,
            session.configuration,
          );
          if (debugSession === undefined) {
            // return null makes vscode show "Couldn't find a debug adapter descriptor for debug type 'scala' (extension might have failed to activate)"
            return null;
          } else {
            return debugServerFromUri(debugSession.uri);
          }
        } catch (error) {
          if (
            error instanceof ResponseError &&
            error.code === workspaceHadErrors
          ) {
            handleCompileError(error);
            // Returning a dummy suppresses vscode's error popup wrongly suggesting to "Open launch.json".
            // We put the responsibility to visibly show error messages in the hands
            // of the server, e.g. for compile errors.
            // Also an error in the executeCommand still shows up in metals.log
            return new vscode.DebugAdapterExecutable("", []);
          }

          throw error;
        }
      }
    }
    return null;
  }
}

export function debugServerFromUri(uri: string): vscode.DebugAdapterServer {
  const debugServer = vscode.Uri.parse(uri);
  const segments = debugServer.authority.split(":");
  const host = segments[0];
  const port = parseInt(segments[segments.length - 1]);
  return new vscode.DebugAdapterServer(port, host);
}
