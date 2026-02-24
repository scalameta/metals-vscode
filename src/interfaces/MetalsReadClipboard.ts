import { RequestType0 } from "vscode-languageserver-protocol";

/**
 * The Metals read clipboard request is sent from the server to the client to
 * obtain the current clipboard content. Used by "New Scala File > From clipboard"
 * so the user can paste snippets (e.g. from Scala compiler issue tickets).
 *
 * The client should set readClipboardProvider: true in InitializationOptions
 * and implement this request. Return { value: null } if clipboard is unavailable.
 *
 * RequestType0 is used because this request has no parameters (avoids
 * "defines 1 params but received none" when the server sends no params).
 */
export const MetalsReadClipboardType = new RequestType0<
  MetalsReadClipboardResult,
  void
>("metals/readClipboard");

export interface MetalsReadClipboardResult {
  /** Current clipboard text, or null if not available. */
  value: string | null;
}
