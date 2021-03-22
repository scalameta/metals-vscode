import * as vscode from "vscode";
import {
  commands,
  DebugConfiguration,
  Disposable,
  ProviderResult,
  WorkspaceFolder,
  DebugAdapterDescriptor,
} from "vscode";
import { ServerCommands } from "metals-languageclient";

const configurationType = "scala";
const launchRequestType = "launch";
const attachRequestType = "attach";

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
  return commands
    .executeCommand("workbench.action.files.save")
    .then(() =>
      vscode.commands.executeCommand<DebugSession>(
        ServerCommands.DebugAdapterStart,
        ...parameters
      )
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
      commands.executeCommand("workbench.panel.repl.view.focus");
      return vscode.debug.startDebugging(undefined, configuration);
    });
}

class ScalaConfigProvider implements vscode.DebugConfigurationProvider {
  provideDebugConfigurations(): ProviderResult<DebugConfiguration[]> {
    const mainClassPick = "Main Class";
    const testClassPick = "Test Suite";
    const attachPick = "Attach to JVM";

    return vscode.window
      .showQuickPick([mainClassPick, testClassPick, attachPick], {
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
          case attachPick:
            return this.provideDebugAttachConfiguration().then((config) => [
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
    return this.askForOptionalBuildTarget().then((buildTarget) =>
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
    return this.askForOptionalBuildTarget().then((buildTarget) =>
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

  provideDebugAttachConfiguration(): Thenable<DebugConfiguration> {
    return this.askForHostName().then((hostName) =>
      this.askForPort().then((port) =>
        this.askForBuildTarget().then((buildTarget) => {
          const result: DebugConfiguration = {
            type: configurationType,
            name: `Attach to ${hostName}:${port} - ${buildTarget}`,
            request: attachRequestType,
            hostName: hostName,
            port: port,
            buildTarget: buildTarget,
          };
          return result;
        })
      )
    );
  }

  private askForOptionalBuildTarget(): Thenable<string | undefined> {
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

  private askForHostName(): Thenable<string> {
    return vscode.window
      .showInputBox({
        prompt: "Enter host name of the debuggee JVM",
        placeHolder: "localhost",
      })
      .then((hostName) => hostName ?? Promise.reject());
  }

  private askForPort(): Thenable<number> {
    return vscode.window
      .showInputBox({
        prompt: "Enter port to attach to",
        placeHolder: "5005",
      })
      .then((port) => port ?? Promise.reject())
      .then((port) => parseInt(port));
  }

  private askForBuildTarget(): Thenable<string> {
    return vscode.window
      .showInputBox({
        prompt: "Enter the name of the build target",
      })
      .then((buildTarget) => buildTarget ?? Promise.reject());
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
      session.configuration.testClass !== undefined ||
      session.configuration.hostName !== undefined
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
