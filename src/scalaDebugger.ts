import * as vscode from "vscode";
import {
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder,
  DebugAdapterDescriptor,
} from "vscode";
import { ServerCommands } from "metals-languageclient";

const configurationType = "scala";
const launchRequestType = "launch";

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
    ),
  ];
}

export async function start(
  noDebug: Boolean,
  ...parameters: any[]
): Promise<Boolean> {
  return vscode.commands
    .executeCommand<DebugSession>(
      ServerCommands.DebugAdapterStart,
      ...parameters
    )
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
    const mainClassPick = "Main Class";
    const testClassPick = "Test Suite";

    return vscode.window
      .showQuickPick([mainClassPick, testClassPick], {
        placeHolder:
          "Pick the kind of the class to debug (Press 'Escape' to create 'launch.json' with no initial configuration)",
      })
      .then((result) => {
        switch (result) {
          case mainClassPick:
            return this.provideDebugMainClassConfiguration().then((config) => [
              config,
            ]);
          case testClassPick:
            return this.provideDebugTestClassConfiguration().then((config) => [
              config,
            ]);
          default:
            return [];
        }
      })
      .then(
        (result) => result,
        () => []
      );
  }

  resolveDebugConfiguration(
    _folder: WorkspaceFolder | undefined,
    debugConfiguration: DebugConfiguration
  ): ProviderResult<DebugConfiguration> {
    if (debugConfiguration.type === undefined) return null;
    return debugConfiguration;
  }

  private provideDebugMainClassConfiguration(): Thenable<DebugConfiguration> {
    return this.askForBuildTarget().then((buildTarget) =>
      this.askForClassName().then((className) =>
        this.askForConfigurationName(className).then((name) => {
          const result: DebugConfiguration = {
            type: configurationType,
            name: name,
            request: launchRequestType,
            mainClass: className,
            buildTarget: buildTarget,
            args: [],
          };
          return result;
        })
      )
    );
  }

  private provideDebugTestClassConfiguration(): Thenable<DebugConfiguration> {
    return this.askForBuildTarget().then((buildTarget) =>
      this.askForClassName().then((className) =>
        this.askForConfigurationName(className).then((name) => {
          const result: DebugConfiguration = {
            type: configurationType,
            name: name,
            request: launchRequestType,
            testClass: className,
            buildTarget: buildTarget,
          };
          return result;
        })
      )
    );
  }

  private askForBuildTarget(): Thenable<string | undefined> {
    return vscode.window
      .showInputBox({
        prompt: "Enter the name of the build target",
        placeHolder: "Optional, you can leave it empty",
      })
      .then((buildTarget) => {
        if (buildTarget === undefined) {
          return Promise.reject();
        } else if (buildTarget === "") {
          return undefined;
        } else {
          return buildTarget;
        }
      });
  }

  private askForClassName(): Thenable<string> {
    return vscode.window
      .showInputBox({
        prompt: "Enter the name of the class to debug",
        placeHolder: "<package>.<Class>",
      })
      .then((name) => name ?? Promise.reject());
  }

  private askForConfigurationName(className: string): Thenable<string> {
    return vscode.window
      .showInputBox({
        prompt: "Enter the name of the configuration",
        value: `Debug ${className}`,
      })
      .then((name) => name ?? Promise.reject());
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
          ServerCommands.DebugAdapterStart,
          session.configuration
        )
        .then((debugSession) => {
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
  const host = segments[0];
  const port = parseInt(segments[segments.length - 1]);
  return new vscode.DebugAdapterServer(port, host);
}

export interface DebugSession {
  name: string;
  uri: string;
}
