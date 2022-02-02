import { ClientCommands } from "metals-languageclient";
import { commands, ExtensionContext, window } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { gotoLocation, WindowLocation } from "../goToLocation";
import * as scalaDebugger from "../scalaDebugger";
import { registerCommandWithin } from "../util";

export function registerClientCommands(
  context: ExtensionContext,
  client: LanguageClient
): void {
  let channelOpen = false;
  const registerCommand = registerCommandWithin(context);

  registerCommand(
    `metals.${ClientCommands.GotoLocation}`,
    (location: WindowLocation) => {
      if (location) {
        gotoLocation(location);
      }
    }
  );

  registerCommand(ClientCommands.FocusDiagnostics, () =>
    commands.executeCommand("workbench.action.problems.focus")
  );

  registerCommand(ClientCommands.RunDoctor, () =>
    commands.executeCommand(ClientCommands.RunDoctor)
  );

  registerCommand(ClientCommands.ToggleLogs, () => {
    if (channelOpen) {
      client.outputChannel.hide();
      channelOpen = false;
    } else {
      client.outputChannel.show(true);
      channelOpen = true;
    }
  });

  registerCommand(ClientCommands.StartDebugSession, (...args: any[]) => {
    scalaDebugger.start(false, ...args).then((wasStarted) => {
      if (!wasStarted) {
        window.showErrorMessage("Debug session not started");
      }
    });
  });

  registerCommand(ClientCommands.StartRunSession, (...args: any[]) => {
    scalaDebugger.start(true, ...args).then((wasStarted) => {
      if (!wasStarted) {
        window.showErrorMessage("Run session not started");
      }
    });
  });
}
