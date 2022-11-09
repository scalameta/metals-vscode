import * as vscode from "vscode";
import {
  commands,
  DebugConfiguration,
  Disposable,
  WorkspaceFolder,
  DebugAdapterDescriptor,
  DebugConfigurationProviderTriggerKind,
  workspace,
  tasks,
  Task,
  ShellExecution,
} from "vscode";
import {
  DebugDiscoveryParams,
  RunType,
  ServerCommands,
} from "metals-languageclient";
import { ExtendedScalaRunMain, ScalaCodeLensesParams } from "./types";
import { platform } from "os";

const configurationType = "scala";

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
      DebugConfigurationProviderTriggerKind.Initial
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory(
      configurationType,
      new ScalaDebugServerFactory()
    ),
  ];
}

function isExtendedScalaRunMain(
  runMain: ScalaCodeLensesParams
): runMain is ExtendedScalaRunMain {
  return (
    runMain.dataKind === "scala-main-class" &&
    runMain.data.shellCommand != undefined
  );
}

function shellOptions(
  env: Record<string, string>
): vscode.ShellExecutionOptions {
  if (platform() == "win32") {
    return { executable: "cmd.exe", shellArgs: ["/c"], env };
  } else {
    return { env };
  }
}

async function runMain(main: ExtendedScalaRunMain): Promise<boolean> {
  if (workspace.workspaceFolders) {
    const env = main.data.environmentVariables.reduce<Record<string, string>>(
      (acc, envKeyValue) => {
        const [key, value] = envKeyValue.split("=");
        return { ...acc, [key]: value };
      },
      {}
    );

    const task = new Task(
      { type: "scala", task: "run" },
      workspace.workspaceFolders[0],
      "Scala run",
      "Metals",
      new ShellExecution(main.data.shellCommand, shellOptions(env))
    );

    await tasks.executeTask(task);
    return true;
  }
  return Promise.resolve(false);
}

export async function startDiscovery(
  noDebug: boolean,
  debugParams: DebugDiscoveryParams
): Promise<boolean> {
  return debug(noDebug, debugParams);
}

export async function start(
  noDebug: boolean,
  debugParams: ScalaCodeLensesParams
): Promise<boolean> {
  if (noDebug && isExtendedScalaRunMain(debugParams)) {
    return runMain(debugParams);
  } else {
    return debug(noDebug, debugParams);
  }
}

async function debug(
  noDebug: boolean,
  debugParams: DebugDiscoveryParams | ScalaCodeLensesParams
): Promise<boolean> {
  await commands.executeCommand("workbench.action.files.save");
  const response = await vscode.commands.executeCommand<DebugSession>(
    ServerCommands.DebugAdapterStart,
    debugParams
  );

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
    debugConfiguration: DebugConfiguration
  ): Promise<DebugConfiguration | null> {
    const editor = vscode.window.activeTextEditor;
    // debugConfiguration.type is undefined if there are no configurations
    // we are running whatever is in the file
    if (debugConfiguration.type === undefined && editor) {
      const args: DebugDiscoveryParams = {
        path: editor.document.uri.toString(true),
        runType: RunType.RunOrTestFile,
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
    session: vscode.DebugSession
  ): Promise<DebugAdapterDescriptor | null> {
    if (
      session.configuration.mainClass !== undefined ||
      session.configuration.testClass !== undefined ||
      session.configuration.hostName !== undefined
    ) {
      const debugSession = await vscode.commands.executeCommand<DebugSession>(
        ServerCommands.DebugAdapterStart,
        session.configuration
      );

      if (debugSession === undefined) {
        return null;
      } else {
        return debugServerFromUri(debugSession.uri);
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
