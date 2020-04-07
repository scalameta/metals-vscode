import * as vscode from "vscode";
import {
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder,
  DebugAdapterDescriptor,
} from "vscode";

export const startAdapterCommand = "debug-adapter-start";
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
    const mainClassPick = "Main Class";
    const testClassPick = "Test Suite";

    return vscode.window
      .showQuickPick([mainClassPick, testClassPick], {
        placeHolder: "Pick kind of class to debug",
      })
      .then((result) => {
        if (result === mainClassPick) {
          return this.provideDebugMainClassConfiguration().then(
            (config) => [config],
            (_) => []
          );
        } else if (result === testClassPick) {
          return this.provideDebugTestClassConfiguration().then(
            (config) => [config],
            (_) => []
          );
        }
        return [];
      });
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
        this.askForArguments().then((args) =>
          this.askForConfigurationName(className).then((name) => {
            const result: DebugConfiguration = {
              type: configurationType,
              name: name,
              request: launchRequestType,
              mainClass: className,
              buildTarget: buildTarget,
              args: args,
            };
            return result;
          })
        )
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
        prompt: "Enter name of the build target",
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
      .then((name) => {
        if (name === undefined) return Promise.reject();
        return name;
      });
  }

  private askForConfigurationName(className: string): Thenable<string> {
    return vscode.window
      .showInputBox({
        prompt: "Enter the name of the configuration",
        value: `Debug ${className}`,
      })
      .then((name) => {
        if (name === undefined) return Promise.reject();
        return name;
      });
  }

  private askForArguments(): Thenable<string[]> {
    return vscode.window
      .showInputBox({ prompt: "Enter argument or leave it empty" })
      .then((argument) => {
        if (argument === undefined) {
          return Promise.reject();
        } else if (argument === "") {
          return [];
        } else {
          return this.askForArguments().then(
            (rest) => [argument, ...rest],
            (_) => [argument]
          );
        }
      });
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
