import * as path from "path";
import os from "os";
import {
  TextEditor,
  WorkspaceConfiguration,
  ConfigurationTarget,
  window,
  workspace,
  WorkspaceFolder
} from "vscode";
import {
  ExecuteCommandRequest,
  TextDocumentPositionParams
} from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";
import http from "https";

import { UserConfiguration } from "./interfaces/UserConfiguration";
import { JavaVersion } from "./getJavaHome";

declare const sym: unique symbol;

const possibleJavaVersions = ["17", "21", "24"];
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
      target: ConfigurationTarget.Global
    };
  }
}

export function metalsDir(target: ConfigurationTarget): string {
  const workspaceFolder = currentWorkspaceFolder();
  if (target == ConfigurationTarget.Workspace && workspaceFolder) {
    const wsDir = workspaceFolder.uri.fsPath;
    return path.join(wsDir, ".metals");
  } else {
    return path.join(os.homedir(), ".metals");
  }
}

export function currentWorkspaceFolder(): WorkspaceFolder | undefined {
  const activeEditorUri = window.activeTextEditor?.document.uri;
  if (activeEditorUri) {
    return workspace.getWorkspaceFolder(activeEditorUri);
  }
  return workspace.workspaceFolders?.[0];
}

export function getTextDocumentPositionParams(
  editor: TextEditor
): TextDocumentPositionParams {
  const pos = editor.selection.active;
  return {
    textDocument: { uri: editor.document.uri.toString() },
    position: { line: pos.line, character: pos.character }
  };
}

export function executeCommand<T>(
  client: LanguageClient,
  command: string,
  ...args: any[]
): Promise<T> {
  return client.sendRequest(ExecuteCommandRequest.type, {
    command,
    arguments: args
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

export function getJavaVersionFromConfig() {
  const javaVersion = workspace
    .getConfiguration("metals")
    .get<string>(UserConfiguration.JavaVersion)
    ?.trim();
  if (javaVersion && possibleJavaVersions.includes(javaVersion)) {
    return javaVersion as JavaVersion;
  }
  return undefined;
}

export function getJavaVersionOverride(): string | undefined {
  const javaVersion = workspace
    .getConfiguration("metals")
    .get<string>(UserConfiguration.MetalsJavaHome)
    ?.trim();
  if (javaVersion && javaVersion.length > 0) {
    return javaVersion;
  } else {
    return undefined;
  }
}

export async function fetchFrom(
  url: string,
  options?: http.RequestOptions
): Promise<string> {
  const requestOptions: http.RequestOptions = { timeout: 5000, ...options };
  const promise = new Promise<string>((resolve, reject) => {
    http
      .get(url, requestOptions, (resp) => {
        let body = "";
        resp.on("data", (chunk) => (body += chunk));
        resp.on("end", () => resolve(body));
        resp.on("error", (e) => reject(e));
      })
      .on("error", (e) => reject(e))
      .on("timeout", () =>
        reject(`Timeout occured during get request at ${url}`)
      );
  });
  return await promise;
}
