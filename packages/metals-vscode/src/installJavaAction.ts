import { installJava } from "metals-languageclient";
import {
  commands,
  OutputChannel,
  ProgressLocation,
  window,
  workspace,
} from "vscode";
import {
  installJava11Action,
  installJava17Action,
  openSettingsAction,
} from "./consts";
import * as workbenchCommands from "./workbenchCommands";

export function showMissingJavaAction(
  outputChannel: OutputChannel
): Thenable<void> {
  const message =
    "Unable to find a Java 11 or Java 17 installation on this computer. " +
    "To fix this problem, update the 'metals.javaHome' setting to point to a Java 11 or Java 17 home directory " +
    "or select a version to install automatically";

  outputChannel.appendLine(message);

  return window
    .showErrorMessage(
      message,
      openSettingsAction,
      installJava11Action,
      installJava17Action
    )
    .then((choice) => chooseJavaToInstall(choice, outputChannel));
}

export function showInstallJavaAction(
  outputChannel: OutputChannel
): Thenable<void> {
  const message =
    "Which version would you like to install?" +
    "Currently supported are JDK 11 or JDK 17: ";

  outputChannel.appendLine(message);

  return window
    .showInformationMessage(
      message,
      {
        modal: true,
      },
      openSettingsAction,
      installJava11Action,
      installJava17Action
    )
    .then((choice) => chooseJavaToInstall(choice, outputChannel));
}

function chooseJavaToInstall(
  choice: string | undefined,
  outputChannel: OutputChannel
) {
  switch (choice) {
    case openSettingsAction: {
      commands.executeCommand(workbenchCommands.openSettings);
      break;
    }
    case installJava11Action: {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Installing Java (JDK 11), please wait...`,
          cancellable: true,
        },
        () =>
          installJava({ javaVersion: "adopt@1.11", outputChannel }).then(
            updateJavaConfig
          )
      );
      break;
    }
    case installJava17Action: {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: `Installing Java (JDK 17), please wait...`,
          cancellable: true,
        },
        () =>
          installJava({ javaVersion: "openjdk@1.17", outputChannel }).then(
            updateJavaConfig
          )
      );
      break;
    }
  }
}

function updateJavaConfig(javaHome: string) {
  const config = workspace.getConfiguration("metals");
  const configProperty = config.inspect<Record<string, string>>("javaHome");
  if (configProperty?.workspaceValue != undefined) {
    config.update("javaHome", javaHome, false);
  } else {
    config.update("javaHome", javaHome, true);
  }
}
