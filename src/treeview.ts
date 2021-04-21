import * as path from "path";
import { LanguageClient, Disposable } from "vscode-languageclient";
import * as fs from "fs";
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
  ExtensionContext,
  ThemeIcon,
} from "vscode";
import {
  MetalsTreeViews,
  MetalsTreeViewVisibilityDidChange,
  MetalsTreeViewNodeCollapseDidChange,
  MetalsTreeViewDidChange,
  MetalsTreeRevealResult,
  MetalsTreeViewNode,
  MetalsTreeViewParent,
  MetalsTreeViewChildren,
} from "metals-languageclient";

export function startTreeView(
  client: LanguageClient,
  out: OutputChannel,
  context: ExtensionContext,
  viewIds: string[]
): MetalsTreeViews {
  const allProviders: Map<string, MetalsTreeDataProvider> = new Map();
  const allViews: Map<string, TreeView<string>> = new Map();
  const expandedNodes: Map<string, Set<string>> = new Map();
  function expandedNode(viewId: string): Set<string> {
    let isExpanded = expandedNodes.get(viewId);
    if (!isExpanded) {
      isExpanded = new Set();
      expandedNodes.set(viewId, isExpanded);
    }
    return isExpanded;
  }
  const disposables = viewIds.map((viewId) => {
    const provider = new MetalsTreeDataProvider(
      client,
      out,
      viewId,
      allProviders,
      context
    );
    allProviders.set(viewId, provider);
    const view = window.createTreeView(viewId, {
      treeDataProvider: provider,
      showCollapseAll: true,
    });
    allViews.set(viewId, view);

    // Notify the server about view visibility changes
    const onDidChangeVisibility = view.onDidChangeVisibility((e) => {
      client.sendNotification(MetalsTreeViewVisibilityDidChange.type, {
        viewId: viewId,
        visible: e.visible,
      });
    });
    const onDidChangeExpandNode = view.onDidExpandElement((e) => {
      expandedNode(viewId).add(e.element);
      client.sendNotification(MetalsTreeViewNodeCollapseDidChange.type, {
        viewId: viewId,
        nodeUri: e.element,
        collapsed: false,
      });
    });
    const onDidChangeCollapseNode = view.onDidCollapseElement((e) => {
      expandedNode(viewId).delete(e.element);
      client.sendNotification(MetalsTreeViewNodeCollapseDidChange.type, {
        viewId: viewId,
        nodeUri: e.element,
        collapsed: true,
      });
    });

    return [
      view,
      onDidChangeVisibility,
      onDidChangeExpandNode,
      onDidChangeCollapseNode,
    ];
  });

  // Update tree nodes on server notificiations
  client.onNotification(MetalsTreeViewDidChange.type, (params) => {
    params.nodes.forEach((node) => {
      const provider = allProviders.get(node.viewId);
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
    reveal(params: MetalsTreeRevealResult): void {
      function loop(view: TreeView<string>, i: number): Thenable<void> {
        if (i < params.uriChain.length) {
          const uri = params.uriChain[i];
          const isExpanded = expandedNode(params.viewId).has(uri);
          const isDestinationNode = i === 0;
          if (isExpanded) {
            if (isDestinationNode)
              return view.reveal(uri, {
                select: true,
                focus: true,
              });
            else return Promise.resolve();
          } else {
            // Recursively resolves the parent nodes before revealing the final child
            // node at index 0.
            return loop(view, i + 1).then(() => {
              // NOTE(olafur) VS Code does not adjust the scrollbar to display
              // the selected node if it's already visible. Looking at the
              // internal VS Code implementation there seems to be a
              // `relativeTop: number | undefined` option that could solve this
              // problem but it's not possible for us to pass it in through the
              // public API.
              return view.reveal(uri, {
                expand: true,
                select: isDestinationNode,
                focus: isDestinationNode,
              });
            });
          }
        } else {
          return Promise.resolve();
        }
      }
      if (params && params.viewId) {
        const view = allViews.get(params.viewId);
        if (view) {
          loop(view, 0);
        } else {
          out.appendLine(`unknown view: ${params.viewId}`);
        }
      }
    },
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
  items: Map<string, MetalsTreeViewNode> = new Map();
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
      collapsibleState: toTreeItemCollapsibleState(item.collapseState),
      command: item.command,
      tooltip: item.tooltip,
      iconPath: item.icon ? this.iconPath(item.icon) : undefined,
    };
    result.collapsibleState;
    return result;
  }

  // Forward get parent request to the server.
  getParent(uri: string): Thenable<string | undefined> {
    return this.client
      .sendRequest(MetalsTreeViewParent.type, {
        viewId: this.viewId,
        nodeUri: uri,
      })
      .then((result) => {
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
        nodeUri: uri,
      })
      .then((result) => {
        result.nodes.forEach((n) => {
          if (n.nodeUri) {
            this.items.set(n.nodeUri, n);
          }
        });
        return result.nodes.map((n) => n.nodeUri).filter(notEmpty);
      });
  }

  icons: Map<string, TreeItem["iconPath"]> = new Map();
  iconPath(icon: string): TreeItem["iconPath"] | ThemeIcon {
    const result = this.icons.get(icon);
    if (result) return result;
    else {
      const noTheme = this.joinIcon(icon);
      if (noTheme) {
        this.icons.set(icon, noTheme);
        return noTheme;
      } else {
        const themed = {
          dark: this.joinIcon(icon + "-dark"),
          light: this.joinIcon(icon + "-light"),
        };
        if (themed.dark && themed.light) {
          this.icons.set(icon, themed);
          return themed;
        }
      }
    }
    return new ThemeIcon(icon);
  }

  joinIcon(icon: string): string | undefined {
    const file = path.join(this.context.extensionPath, "icons", icon + ".svg");
    if (fs.existsSync(file)) return file;
    else return undefined;
  }
}

// NOTE(olafur): Copy-pasted from Stack Overflow, would be nice to move it elsewhere.
function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

function toTreeItemCollapsibleState(
  s: MetalsTreeViewNode["collapseState"]
): TreeItemCollapsibleState {
  switch (s) {
    case "expanded":
      return TreeItemCollapsibleState.Expanded;
    case "collapsed":
      return TreeItemCollapsibleState.Collapsed;
    default:
      return TreeItemCollapsibleState.None;
  }
}
