import { window, env, ExtensionContext, commands, Position } from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { ExecuteCommandRequest } from "vscode-languageserver-protocol";

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
    selection.start.character,
  );
  context.workspaceState.update(
    "copyDocumentUri",
    editor.document.uri.toString(),
  );
}

/**
 * Pastes the text from clipboard and notifies the LSP server about the paste operation.
 * @param client The LSP client to send notifications to
 * @param context The extension context to access workspace state
 */
export async function pasteSelection(
  client: LanguageClient,
  context: ExtensionContext,
): Promise<void> {
  const editor = window.activeTextEditor;

  if (!editor) {
    window.showErrorMessage("No active editor found");
    return;
  }

  const clipboardText = await env.clipboard.readText();
  if (!clipboardText) {
    return;
  }

  // Get all selections and sort them in reverse order (bottom to top)
  // to avoid position shifting issues when modifying the document
  const selections = [...editor.selections].sort(
    (a, b) =>
      b.start.line - a.start.line || b.start.character - a.start.character,
  );

  // First, paste the text into the document at all selection positions
  await editor.edit((editBuilder) => {
    for (const selection of selections) {
      // When clipboard contains a full line (ends with newline) and there's no selection,
      // VS Code inserts it as a new line at the current position
      if (selection.isEmpty && clipboardText.endsWith("\n")) {
        const lineStart = new Position(selection.start.line, 0);
        editBuilder.insert(lineStart, clipboardText);
      } else {
        editBuilder.replace(selection, clipboardText);
      }
    }
  });

  // Get the origin document and position from workspace state
  const originDocumentUri = context.workspaceState.get(
    "copyDocumentUri",
  ) as string;
  const originStartLine = context.workspaceState.get("copyStartLine") as number;
  const originStartCharacter = context.workspaceState.get(
    "copyStartCharacter",
  ) as number;

  if (
    !originDocumentUri ||
    originStartLine === undefined ||
    originStartCharacter === undefined
  ) {
    return;
  }

  // Process selections in original order (top to bottom) for LSP notifications
  // We need to track cumulative line offset as each paste shifts subsequent positions
  const sortedSelectionsTopToBottom = [...editor.selections].sort(
    (a, b) =>
      a.start.line - b.start.line || a.start.character - b.start.character,
  );

  const lines = clipboardText.split("\n");

  for (const selection of sortedSelectionsTopToBottom) {
    const newEndPosition = selection.end;

    const newStartPosition = new Position(
      selection.start.line + lines.length - 1,
      lines.length === 1
        ? selection.start.character - clipboardText.length
        : lines.pop?.length || 0,
    );
    // Create the paste parameters
    const pasteParams = {
      textDocument: {
        uri: editor.document.uri.toString(),
      },
      text: editor.document.getText(),
      range: {
        start: newStartPosition,
        end: newEndPosition,
      },
      originDocument: {
        uri: originDocumentUri,
      },
      originOffset: {
        line: originStartLine,
        character: originStartCharacter,
      },
    };

    // Send the paste command to the LSP server
    await client.sendRequest(ExecuteCommandRequest.type, {
      command: "metals-did-paste",
      arguments: [pasteParams],
    });
  }
}

/**
 * Registers the copy and paste commands for the extension.
 * @param context The extension context
 * @param client The LSP client
 */
export function registerCopyPasteCommands(
  context: ExtensionContext,
  client: LanguageClient,
): void {
  // Register the copy command
  context.subscriptions.push(
    commands.registerCommand("metals.copy-selection", () =>
      copySelection(context),
    ),
  );

  // Register the paste command
  context.subscriptions.push(
    commands.registerCommand("metals.paste-selection", () =>
      pasteSelection(client, context),
    ),
  );
}
