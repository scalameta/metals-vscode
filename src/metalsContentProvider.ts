import { ServerCommands } from "metals-languageclient";
import {
  EventEmitter,
  ProviderResult,
  TextDocumentContentProvider,
  Uri,
} from "vscode";
import { ExecuteCommandRequest } from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";

export interface DecoderResponse {
  requestedUri?: string;
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
