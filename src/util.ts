import * as path from "path";
import {
  workspace,
  TextEditor,
  WorkspaceConfiguration,
  ConfigurationTarget,
  ExtensionContext,
  commands,
} from "vscode";
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

export function getJavaHomeFromConfig(): string | undefined {
  const javaHomePath = workspace
    .getConfiguration("metals")
    .get<string>("javaHome");
  if (javaHomePath?.trim() && !path.isAbsolute(javaHomePath)) {
    const pathSegments = [
      workspace.workspaceFolders?.[0]?.uri.fsPath,
      javaHomePath,
    ].filter((s): s is string => s != null);
    return path.resolve(...pathSegments);
  } else {
    return javaHomePath;
  }
}

export function toggleBooleanWorkspaceSetting(setting: string): void {
  const config = workspace.getConfiguration("metals");
  const configProperty = config.inspect<boolean>(setting);
  const currentValues = configProperty?.workspaceValue ?? false;
  config.update(setting, !currentValues, ConfigurationTarget.Workspace);
}

export const registerCommandWithin =
  (context: ExtensionContext) =>
  (command: string, callback: (...args: any[]) => unknown): void => {
    context.subscriptions.push(commands.registerCommand(command, callback));
  };
