import { NotificationType } from "vscode-languageserver-protocol";

export const MetalsSyncType = new NotificationType<string>("metals/sync");

export const MetalsSyncStatusType =
  new NotificationType<MetalsSyncStatusParams>("metals/syncStatus");

export interface MetalsSyncStatusParams {
  /** The document uri. */
  document: string;
  /** The current sync status **/
  status: "synced" | "syncing" | "busy" | "untracked" | "unknown" | "hidden";
  /** The kind of the status bar item. */
  kind: "info" | "warning" | "error";
  /** The text to display in the status bar. */
  text: string;
  /** If set, display this message when user hovers over the status bar. */
  tooltip?: string;
  /** If set, execute this command when the user clicks on the status bar item. */
  command?: string;
}
