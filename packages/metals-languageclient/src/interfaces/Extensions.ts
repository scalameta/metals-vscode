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
export namespace ExecuteClientCommand {
  export const type = new NotificationType<ExecuteCommandParams>(
    "metals/executeClientCommand"
  );
}

/**
 * The Metals did focus notification is sent from the client to the server when the editor changes focus to a new text document. Unlike textDocument/didOpen, the did focus notification is sent even when the text document is already open.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalsdidfocustextdocument
 */
export namespace MetalsDidFocus {
  export const type = new NotificationType<string>(
    "metals/didFocusTextDocument"
  );
}

/**
 * The `metals/windowStateDidChange` notification is sent from the client to
 * the server to indicate whether the editor application window is focused or
 * not. When the editor window is not focused, Metals tries to avoid triggering
 * expensive computation in the background such as compilation.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalswindowstatedidchange
 */
export namespace MetalsWindowStateDidChange {
  export const type = new NotificationType<MetalsWindowStateDidChangeParams>(
    "metals/windowStateDidChange"
  );
}

export interface MetalsWindowStateDidChangeParams {
  /** If true, the editor application window is focused. False, otherwise. */
  focused: boolean;
}

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
