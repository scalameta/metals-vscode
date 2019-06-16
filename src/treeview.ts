import * as path from "path";
import * as fs from "fs";
import { LanguageClient, Disposable } from "vscode-languageclient";
import {
  TreeDataProvider,
  TreeItem,
  Event,
  EventEmitter,
  TreeItemCollapsibleState,
  window,
  OutputChannel,
  Uri,
  TreeView,
  ExtensionContext
} from "vscode";
import {
  TreeViewNode,
  MetalsTreeViews,
  MetalsTreeViewChildren,
  MetalsTreeViewDidChange,
  MetalsTreeViewVisibilityDidChange,
  MetalsRevealTreeView,
  MetalsTreeViewParent
} from "./protocol";

export function startTreeView(
  client: LanguageClient,
  out: OutputChannel,
  context: ExtensionContext,
  packageJson: any
): MetalsTreeViews {
  let allProviders: Map<string, MetalsTreeDataProvider> = new Map();
  let allViews: Map<string, TreeView<string>> = new Map();
  let viewIds: string[] = packageJson.contributes.views["metals-explorer"].map(
    (view: { id: string }) => view.id
  ) as string[];
  const disposables = viewIds.map(viewId => {
    let provider = new MetalsTreeDataProvider(
      client,
      out,
      viewId,
      allProviders,
      context
    );
    allProviders.set(viewId, provider);
    const view = window.createTreeView(viewId, {
      treeDataProvider: provider,
      showCollapseAll: true
    });
    allViews.set(viewId, view);

    // Notify the server about view visibility changes
    const onDidChangeVisibility = view.onDidChangeVisibility(e => {
      client.sendNotification(MetalsTreeViewVisibilityDidChange.type, {
        viewId: viewId,
        visible: e.visible
      });
    });

    return [view, onDidChangeVisibility];
  });

  // Update tree nodes on server notificiations
  client.onNotification(MetalsTreeViewDidChange.type, params => {
    params.nodes.forEach(node => {
      let provider = allProviders.get(node.viewId);
      if (!provider) return;
      if (node.nodeUri) {
        provider.items.set(node.nodeUri, node);
      }
      if (node.nodeUri) {
        provider.didChange.fire(node.nodeUri);
      } else {
        provider.didChange.fire(undefined);
      }
    });
  });

  return {
    disposables: ([] as Disposable[]).concat(...disposables),
    // Server requested to reveal a tree view node.
    reveal(params: MetalsRevealTreeView): void {
      const view = allViews.get(params.viewId);
      if (view) {
        view.reveal(params.uri, {
          expand: params.expand || 3,
          select: params.select || false,
          focus: params.focus || true
        });
      } else {
        out.appendLine(`unknown view: ${params.viewId}`);
      }
    }
  };
}

/**
 * A tree view data provider with URI-formatted keys.
 *
 * The URI-formatted key maps to a `TreeViewNode` value which contains the
 * metadata about that tree view node such as label, tooltip and icon.
 *
 * This data provider is implemented as a proxy by forwarding request about
 * node children and parents to the Metals server.
 */
class MetalsTreeDataProvider implements TreeDataProvider<string> {
  didChange = new EventEmitter<string>();
  onDidChangeTreeData?: Event<string> = this.didChange.event;
  items: Map<string, TreeViewNode> = new Map();
  constructor(
    readonly client: LanguageClient,
    readonly out: OutputChannel,
    readonly viewId: string,
    readonly views: Map<string, MetalsTreeDataProvider>,
    readonly context: ExtensionContext
  ) {}

  // Populate TreeItem based on cached children response from the server.
  getTreeItem(uri: string): TreeItem {
    const item = this.items.get(uri);
    if (!item) return {};
    const result: TreeItem = {
      label: item.label,
      id: item.nodeUri,
      resourceUri:
        item.nodeUri && item.nodeUri.indexOf(".") > 0
          ? Uri.parse(item.nodeUri)
          : undefined,
      collapsibleState:
        item.collapseState == "expanded"
          ? TreeItemCollapsibleState.Expanded
          : item.collapseState == "collapsed"
          ? TreeItemCollapsibleState.Collapsed
          : TreeItemCollapsibleState.None,
      command: item.command,
      tooltip: item.tooltip,
      iconPath: item.icon ? this.iconPath(item.icon) : undefined
    };
    result.collapsibleState;
    return result;
  }

  // Forward get parent request to the server.
  getParent(uri: string): Thenable<string | undefined> {
    return this.client
      .sendRequest(MetalsTreeViewParent.type, {
        viewId: this.viewId,
        nodeUri: uri
      })
      .then(result => {
        if (result.uri) {
          const item = this.items.get(result.uri);
          if (item) {
            item.collapseState;
          }
        }
        return result.uri;
      });
  }

  // Forward get children request to the server.
  getChildren(uri?: string): Thenable<string[] | undefined> {
    return this.client
      .sendRequest(MetalsTreeViewChildren.type, {
        viewId: this.viewId,
        nodeUri: uri
      })
      .then(result => {
        result.nodes.forEach(n => {
          if (n.nodeUri) {
            this.items.set(n.nodeUri, n);
          }
        });
        return result.nodes.map(n => n.nodeUri).filter(notEmpty);
      });
  }

  iconPath(name: string): string {
    return path.join(this.context.extensionPath, "images", name + ".svg");
  }
}

// NOTE(olafur): Copy-pasted from Stack Overflow, would be nice to move it elsewhere.
function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
