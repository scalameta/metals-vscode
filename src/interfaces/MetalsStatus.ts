import { Command } from "vscode";
import { NotificationType } from "vscode-languageserver-protocol";

/**
 * The Metals status notification is sent from the server to the client to
 * notify about non-critical and non-actionable events that are happening in
 * the server. Metals status notifications are a complement to
 * `window/showMessage` and `window/logMessage`. Unlike `window/logMessage`,
 * status notifications should always be visible in the user interface.
 * Unlike `window/showMessage`, status notifications are not critical meaning
 * that they should not demand too much attention from the user.
 */
export const MetalsStatusType = new NotificationType<MetalsStatusParams>(
  "metals/status",
);

export interface MetalsStatusParams {
  /** The text to display in the status bar. */
  text: string;
  /** If true, show the status bar. */
  show?: boolean;
  /** If true, hide the status bar. */
  hide?: boolean;
  /** If set, display this message when user hovers over the status bar. */
  tooltip?: string;
  /** If set, execute this command when the user clicks on the status bar item. */
  command?: string;
  /** If set, execute this command when the user clicks on the status bar item. */
  metalsCommand?: Command;
  /** Is this metals or bsp status. */
  statusType?: "bsp" | "metals" | "module";
  /** Level: info, warn, error. */
  level?: "info" | "warn" | "error";
  /** Tooltip for the command. */
  commandTooltip?: string;
}
