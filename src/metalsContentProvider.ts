import { isSupportedLanguage, ServerCommands } from "metals-languageclient";
import {
  EventEmitter,
  ProviderResult,
  TextDocumentContentProvider,
  Uri,
  window,
  workspace,
} from "vscode";
import { ExecuteCommandRequest } from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";
import { executeCommand } from "./util";

export interface DecoderResponse {
  requestedUri: string;
  value?: string;
  error?: string;
}

export class MetalsFileProvider implements TextDocumentContentProvider {
  readonly onDidChangeEmitter = new EventEmitter<Uri>();
  readonly onDidChange = this.onDidChangeEmitter.event;
  readonly client: LanguageClient;

  constructor(client: LanguageClient) {
    this.client = client;
  }

  provideTextDocumentContent(uri: Uri): ProviderResult<string> {
    const output = this.client
      .sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.DecodeFile,
        // skip encoding - jar:file: gets too aggressively encoded
        arguments: [uri.toString(true)],
      })
      .then((result) => {
        const { value, error } = result as DecoderResponse;
        if (value) {
          return value;
        } else {
          return error;
        }
      });
    return output;
  }
}

type DecodeExtension =
  | "javap"
  | "javap-verbose"
  | "semanticdb-compact"
  | "semanticdb-detailed"
  | "semanticdb-proto"
  | "tasty-detailed";

export async function decodeAndShowFile(
  client: LanguageClient,
  metalsFileProvider: MetalsFileProvider,
  uri: Uri | undefined,
  decodeExtension: DecodeExtension
) {
  // returns an active editor uri, fallbacks to currently active file
  function uriWithFallback(): Uri | undefined {
    if (uri) {
      return uri;
    } else {
      // no uri supplied, search for current active file
      const editor = window.visibleTextEditors.find(
        (e) =>
          isSupportedLanguage(e.document.languageId) ||
          e.document.fileName.endsWith(decodeExtension)
      );
      return editor?.document.uri;
    }
  }

  const currentUri = uriWithFallback();
  if (currentUri) {
    let uriWithParams: Uri | undefined = undefined;
    // refreshing an already opened virtual document
    // uri is already in a form accepted by the decode file command, there is no need to changes
    if (currentUri.scheme === "metalsDecode") {
      uriWithParams = currentUri;
    } else {
      let uriToResource: Uri | undefined = undefined;

      // for tasty and javap we must translate scala path to .tasty or .class one
      if (
        currentUri.path.endsWith(".scala") &&
        (decodeExtension === "javap" ||
          decodeExtension === "javap-verbose" ||
          decodeExtension === "tasty-detailed")
      ) {
        const { value } = await executeCommand<DecoderResponse>(
          client,
          "metals.choose-class",
          {
            textDocument: { uri: currentUri.toString() },
            includeInnerClasses: decodeExtension !== "tasty-detailed",
          }
        );
        if (value) {
          uriToResource = Uri.parse(value);
        }
      } else {
        uriToResource = currentUri;
      }

      if (uriToResource) {
        uriWithParams = Uri.parse(
          `metalsDecode:${uriToResource.toString()}.${decodeExtension}`
        );
      }
    }

    if (uriWithParams) {
      // VSCode by default caches the output and won't refresh it
      metalsFileProvider.onDidChangeEmitter.fire(uriWithParams);
      const doc = await workspace.openTextDocument(uriWithParams);
      await window.showTextDocument(doc, { preview: false });
    }
  }
}
