import { window, env, ExtensionContext, commands, Position } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import {
  DidChangeTextDocumentNotification,
  ExecuteCommandRequest
} from "vscode-languageserver-protocol";

/**
 * Copies the current selection to the clipboard.
 * If there is no selection, shows an error message.
 */
export async function copySelection(context: ExtensionContext): Promise<void> {
  const editor = window.activeTextEditor;

  if (!editor) {
    window.showErrorMessage("No active editor found");
    return;
  }

  const selection = editor.selection;
  const text = editor.document.getText(selection);

  if (!text) {
    window.showErrorMessage("No text selected");
    return;
  }

  await env.clipboard.writeText(text);

  context.workspaceState.update("copyStartLine", selection.start.line);
  context.workspaceState.update(
    "copyStartCharacter",
    selection.start.character
  );
  context.workspaceState.update(
    "copyDocumentUri",
    editor.document.uri.toString()
  );
}

/**
 * Pastes the text from clipboard and notifies the LSP server about the paste operation.
 * @param client The LSP client to send notifications to
 * @param context The extension context to access workspace state
 */
export async function pasteSelection(
  client: LanguageClient,
  context: ExtensionContext
): Promise<void> {
  const editor = window.activeTextEditor;

  if (!editor) {
    window.showErrorMessage("No active editor found");
    return;
  }

  const clipboardText = await env.clipboard.readText();
  if (!clipboardText) {
    window.showErrorMessage("Clipboard is empty");
    return;
  }

  // Get the origin document and position from workspace state
  const originDocumentUri = context.workspaceState.get(
    "copyDocumentUri"
  ) as string;
  const originStartLine = context.workspaceState.get("copyStartLine") as number;
  const originStartCharacter = context.workspaceState.get(
    "copyStartCharacter"
  ) as number;

  if (
    !originDocumentUri ||
    originStartLine === undefined ||
    originStartCharacter === undefined
  ) {
    window.showErrorMessage("No previous copy operation found");
    return;
  }

  // Get current selection for the paste range
  const selection = editor.selection;

  // First, paste the text into the document
  await editor.edit((editBuilder) => {
    editBuilder.replace(selection, clipboardText);
  });

  // Calculate the new end position after pasting
  const lines = clipboardText.split("\n");
  const newEndPosition = new Position(
    selection.start.line + lines.length - 1,
    lines.length === 1
      ? selection.start.character + clipboardText.length
      : lines.pop()?.length || 0
  );

  // It will suplicate with the other didChange notification,
  // but I want to make sure the content or the server is updated.
  await client.sendNotification(DidChangeTextDocumentNotification.type, {
    textDocument: {
      uri: editor.document.uri.toString(),
      version: editor.document.version
    },
    contentChanges: [{ text: editor.document.getText() }]
  });

  // Create the paste parameters
  const pasteParams = {
    textDocument: {
      uri: editor.document.uri.toString()
    },
    range: {
      start: selection.start,
      end: newEndPosition
    },
    originDocument: {
      uri: originDocumentUri
    },
    originOffset: {
      line: originStartLine,
      character: originStartCharacter
    }
  };

  // Send the paste command to the LSP server
  await client.sendRequest(ExecuteCommandRequest.type, {
    command: "metals-did-paste",
    arguments: [pasteParams]
  });
}

/**
 * Registers the copy and paste commands for the extension.
 * @param context The extension context
 * @param client The LSP client
 */
export function registerCopyPasteCommands(
  context: ExtensionContext,
  client: LanguageClient
): void {
  // Register the copy command
  context.subscriptions.push(
    commands.registerCommand("metals.copy-selection", () =>
      copySelection(context)
    )
  );

  // Register the paste command
  context.subscriptions.push(
    commands.registerCommand("metals.paste-selection", () =>
      pasteSelection(client, context)
    )
  );
}
