import * as vscode from "vscode";
import {
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder,
  DebugAdapterDescriptor
} from "vscode";

export const startAdapterCommand = "debug-adapter-start";
const configurationType = "scala";

export function initialize(outputChannel: vscode.OutputChannel): Disposable[] {
  outputChannel.appendLine("Initializing Scala Debugger");
  return [
    vscode.debug.registerDebugConfigurationProvider(
      configurationType,
      new ScalaConfigProvider()
    ),
    vscode.debug.registerDebugAdapterDescriptorFactory(
      configurationType,
      new ScalaDebugServerFactory()
    )
  ];
}

export async function start(
  noDebug: Boolean,
  ...parameters: any[]
): Promise<Boolean> {
  return vscode.commands
    .executeCommand<DebugSession>(startAdapterCommand, ...parameters)
    .then((response) => {
      if (response === undefined) return false;

      const port = debugServerFromUri(response.uri).port;

      const configuration: vscode.DebugConfiguration = {
        type: configurationType,
        name: response.name,
        noDebug: noDebug,
        request: "launch",
        debugServer: port, // note: MUST be a number. vscode magic - automatically connects to the server
      };

      return vscode.debug.startDebugging(undefined, configuration);
    });
}

class ScalaConfigProvider implements vscode.DebugConfigurationProvider {
  provideDebugConfigurations(): ProviderResult<DebugConfiguration[]> {
    return [];
  }

  resolveDebugConfiguration(
    _folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration
  ): ProviderResult<DebugConfiguration> {
    return debugConfiguration;
  }
}

class ScalaDebugServerFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    session: vscode.DebugSession
  ): ProviderResult<DebugAdapterDescriptor> {
    if (
      session.configuration.mainClass !== undefined ||
      session.configuration.testClass !== undefined
    ) {
      return vscode.commands
        .executeCommand<DebugSession>(
          startAdapterCommand,
          session.configuration
        )
        .then(debugSession => {
          if (debugSession === undefined) return null;
          return debugServerFromUri(debugSession.uri);
        });
    }
    return null;
  }
}

export function debugServerFromUri(uri: string): vscode.DebugAdapterServer {
  const debugServer = vscode.Uri.parse(uri);
  const segments = debugServer.authority.split(":");
  return new vscode.DebugAdapterServer(
    parseInt(segments[segments.length - 1]),
    segments[0]
  );
}

export interface DebugSession {
  name: string;
  uri: string;
}
