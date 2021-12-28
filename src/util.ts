import { TextEditor, WorkspaceConfiguration } from "vscode";
import {
  ExecuteCommandRequest,
  TextDocumentPositionParams,
} from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";

declare const sym: unique symbol;
/**
 * Creates a newtype without any runtime overhead. It's important for ID to be both unique and descriptive.
 */
export type newtype<A, ID extends string> = A & {
  readonly [sym]: ID;
};

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
  ...args: any[]
): Promise<T> {
  return client.sendRequest(ExecuteCommandRequest.type, {
    command,
    arguments: args,
  });
}

export function getValueFromConfig<T>(
  config: WorkspaceConfiguration,
  key: string,
  defaultValue: T
): T {
  const inspected = config.inspect<T>(key);
  const fromConfig =
    inspected?.workspaceValue ||
    inspected?.globalValue ||
    inspected?.defaultValue;
  return fromConfig ?? defaultValue;
}
