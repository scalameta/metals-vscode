import * as vscode from "vscode";
import {
  CancellationToken,
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder
} from "vscode";

export const startAdapterCommand = "debug-adapter-start";
export const startSessionCommand = "metals-debug-session-start";
const configurationType = "scala";

export function initialize(): Disposable[] {
  return [
    vscode.debug.registerDebugConfigurationProvider(
      configurationType,
      new ScalaConfigProvider()
    )
  ];
}

export async function start(parameters: any): Promise<Boolean> {
  return vscode.commands
    .executeCommand(startAdapterCommand, parameters)
    .then(response => {
      if (typeof response === "string") {
        const debugServer = vscode.Uri.parse(response);
        const segments = debugServer.authority.split(":");
        const port = parseInt(segments[segments.length - 1]);

        const configuration: vscode.DebugConfiguration = {
          type: configurationType,
          name: "Scala",
          request: "launch",
          debugServer: port // note: MUST be a number. vscode magic - automatically connects to the server
        };

        return vscode.debug.startDebugging(undefined, configuration);
      } else {
        return false;
      }
    });
}

class ScalaConfigProvider implements vscode.DebugConfigurationProvider {
  provideDebugConfigurations(
    folder: WorkspaceFolder | undefined,
    token?: CancellationToken
  ): ProviderResult<DebugConfiguration[]> {
    return [];
  }

  resolveDebugConfiguration(
    folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration,
    token?: CancellationToken
  ): ProviderResult<DebugConfiguration> {
    return debugConfiguration;
  }
}
