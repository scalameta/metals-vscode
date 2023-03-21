import { RequestType } from "vscode-languageserver-protocol";

/**
 * The Metals input box request is sent from the server to the client to
 * let the user provide a string value for a given prompt. Unlike
 * `window/showMessageRequest`, the `metals/inputBox` request allows the user
 * to provide a custom response instead of picking a pre-selected value.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalsinputbox
 */
export namespace MetalsInputBox {
  export const type = new RequestType<
    InputBoxOptions,
    MetalsInputBoxResult,
    void
  >("metals/inputBox");

  export const handleInput = function (
    result: string | undefined
  ): MetalsInputBoxResult {
    if (result === undefined || result.trim() === "") {
      return { cancelled: true };
    } else {
      return { value: result };
    }
  };
}

export interface MetalsInputBoxResult {
  value?: string;
  cancelled?: boolean;
}

/**
 * The below is ported directly from VS Code:
 *
 * - https://code.visualstudio.com/api/references/vscode-api#InputBoxOptions
 *
 * This is managed in here since the Metals API for Input Boxes matches this
 * exactly meaning that we rely on it both in the VS Code extension and also
 * coc-metals. If the API changes, we'll have to chage it in Metals and in here.
 */
export interface InputBoxOptions {
  /** * The value to prefill in the input box.  */
  value?: string;
  /** * Selection of the prefilled [`value`](#InputBoxOptions.value). Defined as tuple of two number where the * first is the inclusive start index and the second the exclusive end index. When `undefined` the whole * word will be selected, when empty (start equals end) only the cursor will be set, * otherwise the defined range will be selected.  */ valueSelection?: [
    number,
    number
  ];

  /**
   * The text to display underneath the input box.
   */
  prompt?: string;

  /**
   * An optional string to show as place holder in the input box to guide the user what to type.
   */
  placeHolder?: string;

  /**
   * Set to `true` to show a password prompt that will not show the typed value.
   */
  password?: boolean;

  /**
   * Set to `true` to keep the input box open when focus moves to another part of the editor or to another window.
   */
  ignoreFocusOut?: boolean;

  /**
   * An optional function that will be called to validate input and to give a hint
   * to the user.
   *
   * @param value The current value of the input box.
   * @return A human readable string which is presented as diagnostic message.
   * Return `undefined`, `null`, or the empty string when 'value' is valid.
   */
  validateInput?(
    value: string
  ): string | undefined | null | Thenable<string | undefined | null>;
}
