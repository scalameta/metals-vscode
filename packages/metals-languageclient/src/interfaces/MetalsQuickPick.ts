import { RequestType } from "vscode-languageserver-protocol";
/**
 * The Metals quick pick request is sent from the server to the client to let
 * the user provide a string value by picking one out of a number of given
 * options. It is similar to `window/showMessageRequest`, but the
 * `metals/quickPick` request has richer parameters, that can be used to
 * filter items to pick, like description and detail.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalsquickpick
 */
export namespace MetalsQuickPick {
  export const type = new RequestType<
    MetalsQuickPickParams,
    MetalsQuickPickResult,
    void
  >("metals/quickPick");
}

export interface MetalsQuickPickParams {
  /** An array of items that can be selected from. */
  items: MetalsQuickPickItem[];
  /** An optional flag to include the description when filtering the picks. */
  matchOnDescription?: boolean;
  /** An optional flag to include the detail when filtering the picks. */
  matchOnDetail?: boolean;
  /**
   * An optional string to show as place holder in the input box to guide the
   * user what to pick on.
   */
  placeHolder?: string;
  /**
   * Set to `true` to keep the picker open when focus moves to another part of
   * the editor or to another window.
   */
  ignoreFocusOut?: boolean;
}

export interface MetalsQuickPickResult {
  itemId?: string;
  cancelled?: boolean;
}

export interface MetalsQuickPickItem {
  /** An id for this items that should be return as a result of the picking. */
  id: string;
  /** A human readable string which is rendered prominent. */
  label: string;
  /** A human readable string which is rendered less prominent. */
  description?: string;
  /** A human readable string which is rendered less prominent. */
  detail?: string;
  /** Always show this item. */
  alwaysShow?: boolean;
}
