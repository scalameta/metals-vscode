import * as path from "path";
import os from "os";
import {
  workspace,
  TextEditor,
  WorkspaceConfiguration,
  ConfigurationTarget,
} from "vscode";
import {
  ExecuteCommandRequest,
  TextDocumentPositionParams,
} from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";
import http from "https";

declare const sym: unique symbol;
/**
 * Creates a newtype without any runtime overhead. It's important for ID to be both unique and descriptive.
 */
export type newtype<A, ID extends string> = A & {
  readonly [sym]: ID;
};

export function getConfigValue<A>(
  config: WorkspaceConfiguration,
  key: string
): { value: A; target: ConfigurationTarget } | undefined {
  const value = config.get<A>(key);
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const { defaultValue, workspaceValue } = config.inspect<A>(key)!;
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
  if (value) {
    const getTarget = () => {
      if (workspaceValue && workspaceValue !== defaultValue) {
        return ConfigurationTarget.Workspace;
      } else {
        return ConfigurationTarget.Global;
      }
    };
    const target = getTarget();
    return { value, target };
  } else if (defaultValue) {
    return {
      value: defaultValue,
      target: ConfigurationTarget.Global,
    };
  }
}

export function metalsDir(target: ConfigurationTarget): string {
  if (target == ConfigurationTarget.Workspace && workspace.workspaceFolders) {
    const wsDir = workspace.workspaceFolders[0]?.uri.fsPath;
    return path.join(wsDir, ".metals");
  } else {
    return path.join(os.homedir(), ".metals");
  }
}

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

export async function fetchFrom(
  url: string,
  options?: http.RequestOptions
): Promise<string> {
  const promise = new Promise<string>((resolve, reject) => {
    http.get(url, options || {}, (resp) => {
      let body = "";
      resp.on("data", (chunk) => (body += chunk));
      resp.on("end", () => resolve(body));
      resp.on("error", (e) => reject(e));
    });
  });
  return await promise;
}
