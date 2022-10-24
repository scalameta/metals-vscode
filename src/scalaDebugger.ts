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
import { BuildTargetIdentifier, FullyQualifiedClassName } from "./types";
import { ScalaRunMain } from "./testExplorer/types";

const configurationType = "scala";

export interface ScalaMainData {
  class: string;
  arguments: string[];
  jvmOptions: string[];
  environmentVariables: string[];
}

export interface ScalaRunMain {
  data: ScalaMainData;
  dataKind: "scala-main-class";
  targets: BuildTargetIdentifier[];
}

export interface ScalaTestSuites {
  data: FullyQualifiedClassName[];
  dataKind: "scala-test-suites";
  targets: BuildTargetIdentifier[];
}

export type ScalaCodeLensesParams = ScalaRunMain | ScalaTestSuites;

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

function isScalaRunMain(object: any): object is ScalaRunMain {
  return object.dataKind === "scala-main-class";
}

function runMain(main: ScalaRunMain): Thenable<boolean> {
  if (workspace.workspaceFolders) {
    const initialObj: { [key: string]: string } = {};
    const env = main.data.environmentVariables.reduce((obj, e) => {
      const split = e.split("=");
      const key = split[0];
      return (obj[key] = split[1]), obj;
    }, initialObj);
    return tasks
      .executeTask(
        new Task(
          { type: "scala", task: "run" },
          workspace.workspaceFolders[0],
          "Scala run",
          "Metals",
          new ShellExecution(main.data.shellCommand, { env: env })
        )
      )
      .then((_a) => true);
  }
  return Promise.resolve(false);
}

export async function start(
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
      await start(debugConfiguration.noDebug, args);
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
