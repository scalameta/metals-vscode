import {
  window,
  env,
  ExtensionContext,
  workspace,
  Position,
  TextDocumentChangeEvent,
  Disposable,
  TextEditor,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { ExecuteCommandRequest } from "vscode-languageserver-protocol";

/**
 * Checks if the given language ID is a Scala language.
 */
function isScalaLanguage(languageId: string): boolean {
  return languageId === "scala" || languageId === "sc";
}

/**
 * Tracks the current selection in Scala files for potential copy operations.
 * Called when the editor selection changes.
 */
function trackSelectionForCopy(
  editor: TextEditor,
  context: ExtensionContext,
): void {
  if (!isScalaLanguage(editor.document.languageId)) {
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    return;
  }

  const selectedText = editor.document.getText(selection);
  if (!selectedText) {
    return;
  }

  context.workspaceState.update("documentUri", editor.document.uri.toString());
  context.workspaceState.update("startLine", selection.start.line);
  context.workspaceState.update("startCharacter", selection.start.character);
  context.workspaceState.update("copiedText", selectedText);
}

/**
 * Handles text document changes to detect paste operations.
 * When text is inserted that matches the clipboard content, we notify the LSP server.
 */
async function handleTextChange(
  event: TextDocumentChangeEvent,
  client: () => LanguageClient | undefined,
  context: ExtensionContext,
): Promise<void> {
  const document = event.document;

  // Only handle Scala files
  if (!isScalaLanguage(document.languageId)) {
    return;
  }

  // Skip if no changes
  if (event.contentChanges.length === 0) {
    return;
  }

  // Get clipboard content and check if it matches the copied text
  const clipboardText = await env.clipboard.readText();
  if (!clipboardText) {
    return;
  }

  // Check each change to see if it matches the clipboard (indicating a paste)
  for (const change of event.contentChanges) {
    // Skip if no text was inserted or if it doesn't match clipboard
    if (!change.text || change.text !== clipboardText) {
      continue;
    }

    // This looks like a paste operation - notify the LSP server
    await notifyPaste(document, change, clipboardText, client(), context);
  }
}

/**
 * Notifies the LSP server about a paste operation.
 */
async function notifyPaste(
  document: { uri: { toString(): string }; getText(): string },
  change: { range: { start: Position; end: Position }; text: string },
  clipboardText: string,
  client: LanguageClient | undefined,
  context: ExtensionContext,
): Promise<void> {
  if (client) {
    // Calculate where the pasted text ends up
    const lines = clipboardText.split("\n");
    const pasteStartLine = change.range.start.line;
    const pasteStartCharacter = change.range.start.character;

    // Calculate end position after paste
    const pasteEndLine = pasteStartLine + lines.length - 1;
    const pasteEndCharacter =
      lines.length === 1
        ? pasteStartCharacter + clipboardText.length
        : lines[lines.length - 1].length;
    const copiedText = context.workspaceState.get("copiedText");
    // Only include origin info if the copied text matches what we tracked
    const hasValidOrigin = copiedText && copiedText === clipboardText;
    const documentUri = context.workspaceState.get("documentUri");
    const startLine = context.workspaceState.get("startLine");
    const startCharacter = context.workspaceState.get("startCharacter");
    const pasteParams = {
      textDocument: {
        uri: document.uri.toString(),
      },
      text: document.getText(),
      range: {
        start: {
          line: pasteStartLine,
          character: pasteStartCharacter,
        },
        end: {
          line: pasteEndLine,
          character: pasteEndCharacter,
        },
      },
      originDocument: {
        uri: documentUri,
      },
      originOffset: {
        line: startLine,
        character: startCharacter,
      },
    };
    if (hasValidOrigin) {
      try {
        await client.sendRequest(ExecuteCommandRequest.type, {
          command: "metals-did-paste",
          arguments: [pasteParams],
        });
      } catch (error) {
        // Silently ignore errors - paste notification is not critical
        console.error("Failed to notify LSP about paste:", error);
      }
    }
  }
}

/**
 * Registers event-based hooks for copy and paste detection in Scala files.
 * This approach doesn't override native copy/paste commands, allowing them to work normally.
 *
 * @param context The extension context
 * @param client A function that returns the current LSP client
 */
export function registerCopyPasteHooks(
  context: ExtensionContext,
  client: () => LanguageClient | undefined,
): void {
  const disposables: Disposable[] = [];

  // Track selection changes to capture potential copy origins
  disposables.push(
    window.onDidChangeTextEditorSelection((event) => {
      trackSelectionForCopy(event.textEditor, context);
    }),
  );

  // Listen for text document changes to detect paste operations
  disposables.push(
    workspace.onDidChangeTextDocument((event) => {
      handleTextChange(event, client, context);
    }),
  );

  // Register all disposables
  disposables.forEach((d) => context.subscriptions.push(d));
}

/**
 * @deprecated Use registerCopyPasteHooks instead.
 * This function is kept for backwards compatibility but now just calls registerCopyPasteHooks.
 */
export function registerCopyPasteCommands(
  context: ExtensionContext,
  client: () => LanguageClient | undefined,
): void {
  registerCopyPasteHooks(context, client);
}
