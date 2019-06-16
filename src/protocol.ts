import { RequestType, NotificationType } from "vscode-jsonrpc";
import { ExecuteCommandParams } from "vscode-languageclient";
import {
  InputBoxOptions,
  Command,
  Range,
  TreeItemCollapsibleState,
  Disposable
} from "vscode";

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

export namespace MetalsWindowStateDidChange {
  export const type = new NotificationType<
    MetalsWindowStateDidChangeParams,
    void
  >("metals/windowStateDidChange");
}

export interface MetalsWindowStateDidChangeParams {
  focused: boolean;
}

// ==================
// Tree view protocol
// ==================

export interface MetalsTreeViews {
  disposables: Disposable[];
  reveal(params: MetalsRevealTreeView): void;
}

export interface MetalsRevealTreeView {
  viewId: string;
  uri: string;
  expand?: number;
  select?: boolean;
  focus?: boolean;
}

export interface MetalsTreeViewDidChangeParams {
  nodes: TreeViewNode[];
}

export interface TreeViewNode {
  viewId: string;
  nodeUri?: string;
  label: string;
  command?: Command;
  icon?:
    | "command"
    | "scala-trait"
    | "scala-object"
    | "scala-class"
    | "java-interface";
  tooltip?: string;
  collapseState?: "none" | "collapsed" | "expanded";
}

export interface MetalsTreeViewChildrenParams {
  viewId: string;
  nodeUri?: string;
}

export interface MetalsTreeViewChildrenResult {
  nodes: TreeViewNode[];
}

export namespace MetalsTreeViewDidChange {
  export const type = new NotificationType<MetalsTreeViewDidChangeParams, void>(
    "metals/treeViewDidChange"
  );
}

export namespace MetalsTreeViewChildren {
  export const type = new RequestType<
    MetalsTreeViewChildrenParams,
    MetalsTreeViewChildrenResult,
    void,
    void
  >("metals/treeViewChildren");
}

export interface MetalsTreeViewParentParams {
  viewId: string;
  nodeUri: string;
}

export interface MetalsTreeViewParentResult {
  uri?: string;
}

export namespace MetalsTreeViewParent {
  export const type = new RequestType<
    MetalsTreeViewParentParams,
    MetalsTreeViewParentResult,
    void,
    void
  >("metals/treeViewParent");
}

export interface MetalsTreeViewVisibilityDidChangeParams {
  viewId: string;
  visible: boolean;
}

export namespace MetalsTreeViewVisibilityDidChange {
  export const type = new NotificationType<
    MetalsTreeViewVisibilityDidChangeParams,
    void
  >("metals/treeViewVisibilityDidChange");
}
