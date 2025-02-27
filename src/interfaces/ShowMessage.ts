export interface CocShowMessage {
  showMessage(msg: string, identify?: "error" | "warning" | "more"): void;
}

export interface VSCodeShowMessage {
  showInformationMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;

  showWarningMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;

  showErrorMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;
}

/**
 * VS Code and coc.nvim expose the showMessage functionality in two different ways.
 * This is a common interface to account for both
 */
export type ShowMessage = CocShowMessage | VSCodeShowMessage;

/**
 * Normalize ShowMessage to VSCodeShowMessage, by using an adapter for CocShowMessage
 *
 * @param showMessage
 */
export function normalize(showMessage: ShowMessage): VSCodeShowMessage {
  // NOTE(gabro): since this is an untagged union, we discriminate it by poking into the value to
  // see whether it defines a "showMessage" method.
  if ("showMessage" in showMessage) {
    return {
      showInformationMessage(message) {
        showMessage.showMessage(message);
        return Promise.resolve(undefined);
      },
      showWarningMessage(message) {
        showMessage.showMessage(message, "warning");
        return Promise.resolve(undefined);
      },
      showErrorMessage(message) {
        showMessage.showMessage(message, "error");
        return Promise.resolve(undefined);
      },
    };
  }
  return showMessage;
}
