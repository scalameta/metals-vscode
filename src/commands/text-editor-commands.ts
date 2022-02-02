import {
  DebugDiscoveryParams,
  RunType,
  ServerCommands,
} from "metals-languageclient";
import {
  commands,
  env,
  ExtensionContext,
  TextEditor,
  TextEditorEdit,
  window,
} from "vscode";
import { ExecuteCommandRequest } from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";
import * as scalaDebugger from "../scalaDebugger";
import { getTextDocumentPositionParams } from "../util";

type TextEditorCallback = (
  textEditor: TextEditor,
  edit: TextEditorEdit,
  ...args: any[]
) => unknown;

/**
 * Register text editor related commands
 */
export function registerTextEditorCommands(
  context: ExtensionContext,
  client: LanguageClient
): void {
  function registerTextEditorCommand(
    command: string,
    callback: TextEditorCallback
  ) {
    const disposable = commands.registerTextEditorCommand(command, callback);
    context.subscriptions.push(disposable);
  }

  registerTextEditorCommand(`metals.run-current-file`, (editor) => {
    const args: DebugDiscoveryParams = {
      path: editor.document.uri.toString(true),
      runType: RunType.RunOrTestFile,
    };
    scalaDebugger.start(true, args).then((wasStarted) => {
      if (!wasStarted) {
        window.showErrorMessage("Debug session not started");
      }
    });
  });

  registerTextEditorCommand(`metals.test-current-target`, (editor) => {
    const args: DebugDiscoveryParams = {
      path: editor.document.uri.toString(true),
      runType: RunType.TestTarget,
    };
    scalaDebugger.start(true, args).then((wasStarted) => {
      if (!wasStarted) {
        window.showErrorMessage("Debug session not started");
      }
    });
  });

  registerTextEditorCommand(
    `metals.${ServerCommands.GotoSuperMethod}`,
    (editor) => {
      client.sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.GotoSuperMethod,
        arguments: [getTextDocumentPositionParams(editor)],
      });
    }
  );

  registerTextEditorCommand(
    `metals.${ServerCommands.SuperMethodHierarchy}`,
    (editor) => {
      client.sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.SuperMethodHierarchy,
        arguments: [getTextDocumentPositionParams(editor)],
      });
    }
  );

  registerTextEditorCommand(
    `metals.${ServerCommands.CopyWorksheetOutput}`,
    (editor) => {
      const uri = editor.document.uri;
      if (uri.toString().endsWith("worksheet.sc")) {
        client
          .sendRequest(ExecuteCommandRequest.type, {
            command: ServerCommands.CopyWorksheetOutput,
            arguments: [uri.toString()],
          })
          .then((result) => {
            window.showInformationMessage(result);
            if (result.value) {
              env.clipboard.writeText(result.value);
              window.showInformationMessage(
                "Copied worksheet evaluation to clipboard."
              );
            }
          });
      } else {
        window.showWarningMessage(
          "You must be in a worksheet to use this feature."
        );
      }
    }
  );
}
