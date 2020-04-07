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
          return this.provideDebugMainClassConfiguration().then((config) => {
            if (config === undefined) return [];
            return [config];
          });
        } else if (result === testClassPick) {
          return this.provideDebugTestClassConfiguration().then((config) => {
            if (config === undefined) return [];
            return [config];
          });
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

  private provideDebugMainClassConfiguration(): Thenable<
    DebugConfiguration | undefined
  > {
    return this.askForBuildTarget().then((buildTarget) => {
      if (buildTarget === undefined) return undefined;
      return this.askForClassName().then((className) => {
        if (className === undefined) return undefined;
        return this.askForArguments().then((args) => {
          if (args === undefined) return undefined;
          return this.askForConfigurationName(className).then((name) => {
            if (name === undefined) return undefined;
            const result: DebugConfiguration = {
              type: configurationType,
              name: name,
              request: launchRequestType,
              mainClass: className,
              buildTarget: buildTarget,
              args: args,
            };
            return result;
          });
        });
      });
    });
  }

  private provideDebugTestClassConfiguration(): Thenable<
    DebugConfiguration | undefined
  > {
    return this.askForBuildTarget().then((buildTarget) => {
      if (buildTarget === undefined) return undefined;
      return this.askForClassName().then((className) => {
        if (className === undefined) return undefined;
        return this.askForConfigurationName(className).then((name) => {
          if (name === undefined) return undefined;
          const result: DebugConfiguration = {
            type: configurationType,
            name: name,
            request: launchRequestType,
            testClass: className,
            buildTarget: buildTarget,
          };
          return result;
        });
      });
    });
  }

  private askForBuildTarget(): Thenable<string | null | undefined> {
    return vscode.window
      .showInputBox({
        prompt: "Enter name of the build target",
        placeHolder: "Optional, you can leave it empty",
      })
      .then((buildTarget) => {
        if (buildTarget === undefined) {
          return undefined;
        } else if (buildTarget === "") {
          return null;
        } else {
          return buildTarget;
        }
      });
  }

  private askForClassName(): Thenable<string | undefined> {
    return vscode.window.showInputBox({
      prompt: "Enter name of the class to debug",
      placeHolder: "<package>.<Class>",
    });
  }

  private askForConfigurationName(
    className: string
  ): Thenable<string | undefined> {
    return vscode.window.showInputBox({
      prompt: "Enter name of the configuration",
      value: `Debug ${className}`,
    });
  }

  private askForArguments(): Thenable<string[] | undefined> {
    return vscode.window
      .showInputBox({ prompt: "Enter argument or leave it empty" })
      .then((argument) => {
        if (argument === undefined) {
          return undefined;
        } else if (argument === "") {
          return [];
        } else {
          return this.askForArguments().then((rest) => {
            if (rest === undefined) {
              return [argument];
            } else {
              rest.unshift(argument);
              return rest;
            }
          });
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
  return new vscode.DebugAdapterServer(
    parseInt(segments[segments.length - 1]),
    segments[0]
  );
}

export interface DebugSession {
  name: string;
  uri: string;
}
