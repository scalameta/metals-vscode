import * as vscode from "vscode";
import {
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder
} from "vscode";

export const startAdapterCommand = "debug-adapter-start";
const configurationType = "scala";

export function initialize(outputChannel: vscode.OutputChannel): Disposable[] {
  outputChannel.appendLine("Initializing Scala Debugger");
  return [
    vscode.debug.registerDebugConfigurationProvider(
      configurationType,
      new ScalaConfigProvider()
    )
  ];
}

export async function start(
  noDebug: Boolean,
  ...parameters: any[]
): Promise<Boolean> {
  return vscode.commands
    .executeCommand<DebugSession>(startAdapterCommand, ...parameters)
    .then(response => {
      if (response === undefined) return false;

      const debugServer = vscode.Uri.parse(response.uri);
      const segments = debugServer.authority.split(":");
      const port = parseInt(segments[segments.length - 1]);

      const configuration: vscode.DebugConfiguration = {
        type: configurationType,
        name: response.name,
        noDebug: noDebug,
        request: "launch",
        debugServer: port // note: MUST be a number. vscode magic - automatically connects to the server
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

export interface DebugSession {
  name: string;
  uri: string;
}
