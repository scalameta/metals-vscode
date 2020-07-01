import { RequestType, NotificationType } from "vscode-jsonrpc";
import { ExecuteCommandParams } from "vscode-languageclient";
import { InputBoxOptions } from "vscode";

"use strict";

export namespace MetalsSlowTask {
  export const type = new RequestType<
    MetalsSlowTaskParams,
    MetalsSlowTaskResult,
    void,
    void
  >("metals/slowTask");
}
export interface MetalsSlowTaskParams {
  message: string;
  quietLogs?: boolean;
  secondsElapsed?: number;
}
export interface MetalsSlowTaskResult {
  cancel: boolean;
}
export namespace ExecuteClientCommand {
  export const type = new NotificationType<ExecuteCommandParams, void>(
    "metals/executeClientCommand"
  );
}

export namespace MetalsStatus {
  export const type = new NotificationType<MetalsStatusParams, void>(
    "metals/status"
  );
}
export namespace MetalsDidFocus {
  export const type = new NotificationType<string, void>(
    "metals/didFocusTextDocument"
  );
}

export interface MetalsStatusParams {
  text: string;
  show?: boolean;
  hide?: boolean;
  tooltip?: string;
  command?: string;
}

export namespace MetalsInputBox {
  export const type = new RequestType<
    InputBoxOptions,
    MetalsInputBoxResult,
    void,
    void
  >("metals/inputBox");
}

export interface MetalsInputBoxResult {
  value?: string;
  cancelled?: boolean;
}

export namespace MetalsQuickPick {
  export const type = new RequestType<
    MetalsQuickPickParams,
    MetalsQuickPickResult,
    void,
    void
  >("metals/quickPick");
}

export interface MetalsQuickPickParams {
  items: MetalsQuickPickItem[];
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  placeHolder?: string;
  ignoreFocusOut?: boolean;
}

export interface MetalsQuickPickResult {
  itemId?: string;
  cancelled?: boolean;
}

export interface MetalsQuickPickItem {
  id: string;
  label: string;
  description?: string;
  detail?: string;
  alwaysShow?: boolean;
}

export namespace MetalsWindowStateDidChange {
  export const type = new NotificationType<
    MetalsWindowStateDidChangeParams,
    void
  >("metals/windowStateDidChange");
}

export interface MetalsWindowStateDidChangeParams {
  focused: boolean;
}

export interface MetalsOpenWindowParams {
  uri: string;
  openNewWindow: boolean;
}
