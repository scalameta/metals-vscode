import { TextEditor } from "vscode";
import {
  ExecuteCommandRequest,
  TextDocumentPositionParams,
} from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";

export function getTextDocumentPositionParams(
  editor: TextEditor
): TextDocumentPositionParams {
  const pos = editor.selection.active;
  return {
    textDocument: { uri: editor.document.uri.toString() },
    position: { line: pos.line, character: pos.character },
  };
}

export function executeCommand<T>(
  client: LanguageClient,
  command: string,
  args: any
): Promise<T> {
  return client.sendRequest(ExecuteCommandRequest.type, {
    command,
    arguments: [args],
  });
}
