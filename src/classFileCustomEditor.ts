import {
  CancellationToken,
  CustomDocument,
  CustomDocumentOpenContext,
  CustomReadonlyEditorProvider,
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
  workspace,
} from "vscode";
import { LanguageClient, State } from "vscode-languageclient/node";
import { decodeAndShowFile, MetalsFileProvider } from "./metalsContentProvider";

/**
 * Must exactly match `contributes.customEditors[].viewType` in package.json.
 * If these differ, VS Code opens the contributed editor id but no provider is registered → hang.
 */
export const METALS_CLASS_FILE_CUSTOM_EDITOR_VIEW_TYPE = "metals.classDecoder";

const classFileOpenDecoders = [
  "cfr",
  "javap",
  "javap-verbose",
  "tasty-decoded",
  "semanticdb-detailed",
] as const;
type ClassFileOpenDecoder = (typeof classFileOpenDecoders)[number];

function isClassFileOpenDecoder(s: string): s is ClassFileOpenDecoder {
  return (classFileOpenDecoders as readonly string[]).includes(s);
}

class MetalsClassFileCustomDocument implements CustomDocument {
  constructor(public readonly uri: Uri) {}
  dispose(): void {}
}

async function ensureClientRunning(client: LanguageClient): Promise<void> {
  if (client.state === State.Running) {
    return;
  }
  await client.start();
}

export function registerMetalsClassFileCustomEditor(
  context: ExtensionContext,
  client: LanguageClient,
  metalsFileProvider: MetalsFileProvider,
): void {
  const provider: CustomReadonlyEditorProvider<MetalsClassFileCustomDocument> =
    {
      openCustomDocument(
        uri: Uri,
        _openContext: CustomDocumentOpenContext,
        _token: CancellationToken,
      ): MetalsClassFileCustomDocument {
        return new MetalsClassFileCustomDocument(uri);
      },
      async resolveCustomEditor(
        document: MetalsClassFileCustomDocument,
        webviewPanel: WebviewPanel,
        _token: CancellationToken,
      ): Promise<void> {
        try {
          await ensureClientRunning(client);
          let mode: string;
          if (document.uri.path.endsWith(".tasty")) {
            mode = "tasty-decoded";
          } else if (document.uri.path.endsWith(".semanticdb")) {
            mode = "semanticdb-detailed";
          } else {
            mode = workspace
              .getConfiguration("metals")
              .get<string>("classFileOpenEncoding", "none");
          }
          if (
            mode === "none" ||
            (!isClassFileOpenDecoder(mode) && mode !== "tasty-decoded")
          ) {
            const doc = await workspace.openTextDocument(document.uri);
            await window.showTextDocument(doc, ViewColumn.Active);
            return;
          }
          await decodeAndShowFile(
            client,
            metalsFileProvider,
            document.uri,
            mode,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          void window.showErrorMessage(
            `Metals: could not open decoded class file (${msg})`,
          );
          try {
            const doc = await workspace.openTextDocument(document.uri);
            await window.showTextDocument(doc, ViewColumn.Active);
          } catch {
            // ignore secondary failure
          }
        } finally {
          webviewPanel.dispose();
        }
      },
    };

  context.subscriptions.push(
    window.registerCustomEditorProvider(
      METALS_CLASS_FILE_CUSTOM_EDITOR_VIEW_TYPE,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: false },
      },
    ),
  );
}
