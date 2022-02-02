import {
  commands,
  ExtensionContext,
  TextDocumentContentProvider,
  Uri,
  workspace,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import {
  decodeAndShowFile,
  MetalsFileProvider,
} from "./metals-content-provider";

export function registerMetalsDecodeCommands(
  context: ExtensionContext,
  client: LanguageClient
): void {
  function registerTextDocumentContentProvider(
    scheme: string,
    provider: TextDocumentContentProvider
  ) {
    context.subscriptions.push(
      workspace.registerTextDocumentContentProvider(scheme, provider)
    );
  }

  function registerCommand(
    command: string,
    callback: (uri: Uri | undefined) => unknown
  ) {
    context.subscriptions.push(commands.registerCommand(command, callback));
  }

  const metalsFileProvider = new MetalsFileProvider(client);

  registerTextDocumentContentProvider("metalsDecode", metalsFileProvider);
  registerTextDocumentContentProvider("jar", metalsFileProvider);

  registerCommand("metals.show-cfr", async (uri) => {
    await decodeAndShowFile(client, metalsFileProvider, uri, "cfr");
  });

  registerCommand("metals.show-javap-verbose", async (uri) => {
    await decodeAndShowFile(client, metalsFileProvider, uri, "javap-verbose");
  });

  registerCommand("metals.show-javap", async (uri) => {
    await decodeAndShowFile(client, metalsFileProvider, uri, "javap");
  });

  registerCommand("metals.show-semanticdb-compact", async (uri) => {
    await decodeAndShowFile(
      client,
      metalsFileProvider,
      uri,
      "semanticdb-compact"
    );
  });

  registerCommand("metals.show-semanticdb-detailed", async (uri) => {
    await decodeAndShowFile(
      client,
      metalsFileProvider,
      uri,
      "semanticdb-detailed"
    );
  });

  registerCommand("metals.show-semanticdb-proto", async (uri) => {
    await decodeAndShowFile(
      client,
      metalsFileProvider,
      uri,
      "semanticdb-proto"
    );
  });

  registerCommand("metals.show-tasty", async (uri) => {
    await decodeAndShowFile(client, metalsFileProvider, uri, "tasty-decoded");
  });
}
