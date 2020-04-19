"use strict";

import {
  Disposable,
  Command,
  RequestType,
  NotificationType,
  TextDocumentPositionParams,
} from "vscode-languageserver-protocol";

export interface MetalsTreeViews {
  disposables: Disposable[];
  reveal(params: MetalsTreeRevealResult): void;
}

export interface MetalsTreeViewNode {
  /** The ID of the view that this node is associated with. */
  viewId: string;
  /** The URI of this node, or undefined if root node of the view. */
  nodeUri?: string;
  /** The title to display for this node. */
  label: string;
  /** An optional command to trigger when the user clicks on this tree view node. */
  command?: Command;
  /** An optional SVG icon to display next to the label of this tree node. */
  icon?: string;
  /** An optional description of this tree node that is displayed when the user hovers over this node. */
  tooltip?: string;
  /**
   * Whether this tree node should be collapsed, expanded or if it has no children.
   *
   * - undefined: this node has no children.
   * - collapsed: this node has children and this node should be auto-expanded
   *   on the first load.
   * - collapsed: this node has children and the user should manually expand
   *   this node to see the children.
   */
  collapseState?: "collapsed" | "expanded";
}

export interface MetalsTreeViewChildrenParams {
  /** The ID of the view that is node is associated with. */
  viewId: string;
  /** The URI of the parent node. */
  nodeUri?: string;
}

export interface MetalsTreeViewChildrenResult {
  /** The child nodes of the requested parent node. */
  nodes: MetalsTreeViewNode[];
}

export namespace MetalsTreeViewChildren {
  export const type = new RequestType<
    MetalsTreeViewChildrenParams,
    MetalsTreeViewChildrenResult,
    void,
    void
  >("metals/treeViewChildren");
}

export interface MetalsTreeViewDidChangeParams {
  nodes: MetalsTreeViewNode[];
}
export namespace MetalsTreeViewDidChange {
  export const type = new NotificationType<MetalsTreeViewDidChangeParams, void>(
    "metals/treeViewDidChange"
  );
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
  /** The ID of the view that this node is associated with. */
  viewId: string;
  /** True if the node is visible, false otherwise. */
  visible: boolean;
}

export namespace MetalsTreeViewVisibilityDidChange {
  export const type = new NotificationType<
    MetalsTreeViewVisibilityDidChangeParams,
    void
  >("metals/treeViewVisibilityDidChange");
}

export interface MetalsTreeViewNodeCollapseDidChangeParams {
  /** The ID of the view that this node is associated with. */
  viewId: string;
  /** The URI of the node that was collapsed or expanded. */
  nodeUri: string;
  /** True if the node is collapsed, false if the node was expanded. */
  collapsed: boolean;
}

export namespace MetalsTreeViewNodeCollapseDidChange {
  export const type = new NotificationType<
    MetalsTreeViewNodeCollapseDidChangeParams,
    void
  >("metals/treeViewNodeCollapseDidChange");
}

export interface MetalsTreeRevealResult {
  /** The ID of the view that this node is associated with. */
  viewId: string;
  /**
   * The list of URIs for the node to reveal and all of its ancestor parents.
   *
   * The node to reveal is at index 0, it's parent is at index 1 and so forth
   * up until the root node.
   */
  uriChain: string[];
}

export namespace MetalsTreeViewReveal {
  export const type = new RequestType<
    TextDocumentPositionParams,
    MetalsTreeRevealResult,
    void,
    void
  >("metals/treeViewReveal");
}
