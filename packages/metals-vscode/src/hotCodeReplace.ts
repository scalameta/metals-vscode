// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// Adapter from https://github.com/microsoft/vscode-java-debug/blob/main/src/hotCodeReplace.ts

import * as vscode from "vscode";

import { DebugSession, commands } from "vscode";

export function initializeHotCodeReplace() {
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("metals.debug.settings.hotCodeReplace")) {
      vscode.commands.executeCommand(
        "setContext",
        "scalaHotReloadOn",
        hotReplaceIsOn()
      );
    }
  });
  vscode.debug.onDidStartDebugSession((session) => {
    if (session?.configuration.noDebug && !vscode.debug.activeDebugSession) {
      vscode.commands.executeCommand("setContext", "scalaHotReloadOn", false);
    }
  });
  vscode.debug.onDidChangeActiveDebugSession((session) => {
    vscode.commands.executeCommand(
      "setContext",
      "scalaHotReloadOn",
      session && !session.configuration.noDebug && hotReplaceIsOn()
    );
  });
}

export async function applyHCR() {
  const debugSession: DebugSession | undefined =
    vscode.debug.activeDebugSession;
  if (!debugSession) {
    return;
  }

  const serverVersion =
    vscode.workspace.getConfiguration("metals").get<string>("serverVersion") ??
    "";
  if (serverVersion < "1.0.1") {
    vscode.workspace
      .getConfiguration("metals.debug.settings")
      .update("hotCodeReplace", false, vscode.ConfigurationTarget.Workspace);
    vscode.window.showErrorMessage(
      "Hot code replace is only supported since scala-debug-adapter 3.1.5,\nwhich is shipped with metals 1.0.1"
    );
    return;
  }
  if (debugSession.configuration.noDebug) {
    vscode.window
      .showWarningMessage(
        "Failed to apply the changes because hot code replace is not supported by run mode, " +
          "would you like to restart the program?"
      )
      .then((res) => {
        if (res === "Yes") {
          vscode.commands.executeCommand("workbench.action.debug.restart");
        }
      });

    return;
  }

  await commands.executeCommand("workbench.action.files.save");
  const redefineRequest = debugSession.customRequest("redefineClasses");
  vscode.window.setStatusBarMessage(
    "$(sync~spin) Applying code changes...",
    redefineRequest
  );
  const response = await redefineRequest;

  if (response?.errorMessage) {
    vscode.window.showErrorMessage(response.errorMessage);
    return;
  }

  const NO_HCR = "Disable HCR";

  if (!response?.changedClasses?.length) {
    const res = await vscode.window.showWarningMessage(
      "No classes were reloaded. Did you applied your changes ?",
      "Ok",
      NO_HCR
    );

    if (res === NO_HCR) {
      vscode.workspace
        .getConfiguration("metals.debug.settings")
        .update("hotCodeReplace", false, vscode.ConfigurationTarget.Workspace);
      vscode.commands.executeCommand("setContext", "scalaHotReloadOn", false);
    }
    return;
  }

  const changed = response.changedClasses.length;
  vscode.window.setStatusBarMessage(
    `$(check) Class${changed > 1 ? "es" : ""} successfully reloaded`,
    5 * 1000
  );
}

function hotReplaceIsOn(): boolean {
  return (
    vscode.workspace
      .getConfiguration("metals.debug.settings")
      .get("hotCodeReplace") ?? false
  );
}
