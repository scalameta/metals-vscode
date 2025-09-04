import {
  NotificationType,
  ExecuteCommandParams,
} from "vscode-languageserver-protocol";

/**
 * The Metals execute client command is sent from the server to the client to
 * trigger an action inside the editor. This notification is a copy of the
 * workspace/executeCommand except:
 *
 *  - execute client command is a notification, not a request
 *  - execute client command is initiated from the server, not the client
 *
 *  - https://scalameta.org/metals/docs/editors/new-editor.html#metalsexecuteclientcommand
 *
 * All client commands can be found in the ClientCommands enum.
 */
export const ExecuteClientCommandType =
  new NotificationType<ExecuteCommandParams>("metals/executeClientCommand");

/**
 * The Metals did focus notification is sent from the client to the server when the editor changes focus to a new text document. Unlike textDocument/didOpen, the did focus notification is sent even when the text document is already open.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalsdidfocustextdocument
 */
export const MetalsDidFocusTypeType = new NotificationType<string>(
  "metals/didFocusTextDocument",
);

/**
 * The  `metals/openWindow` params are used with the New Scala Project
 * functionality. After the new project has been created, if the editor has the
 * ability to open the project in a new window then these params are used with the
 * the `metals-open-folder` command.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalsopenwindow
 */
export interface MetalsOpenWindowParams {
  /** Location of the newly created project. */
  uri: string;
  /** Whether or not to open the project in a new window. */
  openNewWindow: boolean;
}
