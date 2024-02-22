// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// Adapted from https://github.com/microsoft/vscode-java-debug/blob/main/src/hotCodeReplace.ts

import * as vscode from "vscode";

import { DebugSession, commands } from "vscode";

const HCR_ACTIVE = "scalaHotReloadOn";

export function initializeHotCodeReplace() {
  vscode.debug.onDidStartDebugSession((session) => {
    if (session?.configuration.noDebug && !vscode.debug.activeDebugSession) {
      vscode.commands.executeCommand("setContext", HCR_ACTIVE, false);
    }
  });
  vscode.debug.onDidChangeActiveDebugSession((session) => {
    vscode.commands.executeCommand(
      "setContext",
      HCR_ACTIVE,
      session && !session.configuration.noDebug
    );
  });
}

export async function applyHCR() {
  const debugSession: DebugSession | undefined =
    vscode.debug.activeDebugSession;
  if (!debugSession) {
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

  if (!response?.changedClasses?.length) {
    vscode.window.showWarningMessage(
      "No classes were reloaded, please check the logs"
    );
    return;
  }

  const changed = response.changedClasses.length;
  vscode.window.setStatusBarMessage(
    `$(check) ${changed} Class${changed > 1 ? "es" : ""} reloaded`,
    5 * 1000
  );
}
