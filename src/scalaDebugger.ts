import * as vscode from "vscode";
import {
  commands,
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder,
  DebugAdapterDescriptor,
  DebugConfigurationProviderTriggerKind,
} from "vscode";
import {
  DebugDiscoveryParams,
  RunType,
  ServerCommands,
} from "metals-languageclient";

const configurationType = "scala";

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

export async function start(
  noDebug: boolean,
  ...parameters: any[]
): Promise<boolean> {
  return commands
    .executeCommand("workbench.action.files.save")
    .then(() =>
      vscode.commands.executeCommand<DebugSession>(
        ServerCommands.DebugAdapterStart,
        ...parameters
      )
    )
    .then((response) => {
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
    });
}

class ScalaMainConfigProvider implements vscode.DebugConfigurationProvider {
  resolveDebugConfiguration(
    _folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration
  ): ProviderResult<DebugConfiguration> {
    let editor = vscode.window.activeTextEditor;
    // debugConfiguration.type is undefined if there are no configurations
    // we are running whatever is in the file
    if (debugConfiguration.type === undefined && editor) {
      const args: DebugDiscoveryParams = {
        path: editor.document.uri.toString(true),
        runType: RunType.RunOrTestFile,
      };
      return vscode.commands
        .executeCommand<DebugSession>(ServerCommands.DebugAdapterStart, args)
        .then((response) => {
          if (response === undefined) {
            return;
          }

          const port = debugServerFromUri(response.uri).port;

          const configuration: vscode.DebugConfiguration = {
            type: configurationType,
            name: response.name,
            noDebug: false,
            request: "launch",
            debugServer: port, // note: MUST be a number. vscode magic - automatically connects to the server
          };
          commands.executeCommand("workbench.panel.repl.view.focus");
          return configuration;
        });
    } else return debugConfiguration;
  }
}

class ScalaDebugServerFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    session: vscode.DebugSession
  ): ProviderResult<DebugAdapterDescriptor> {
    if (
      session.configuration.mainClass !== undefined ||
      session.configuration.testClass !== undefined ||
      session.configuration.hostName !== undefined
    ) {
      return vscode.commands
        .executeCommand<DebugSession>(
          ServerCommands.DebugAdapterStart,
          session.configuration
        )
        .then((debugSession) => {
          if (debugSession === undefined) {
            return null;
          }
          return debugServerFromUri(debugSession.uri);
        });
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

export interface DebugSession {
  name: string;
  uri: string;
}
