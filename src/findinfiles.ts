import { Event, EventEmitter, ExtensionContext, Position, Range, TextEditorRevealType, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeView, Uri, window, workspace } from "vscode"
import { Location } from "vscode-languageclient/node"

class TopLevel {
  constructor(
    public readonly positions: PositionInFile[],
    public readonly resourceUri: Uri

  ) { }

  public readonly key = "TopLevel"
}

class PositionInFile {
  constructor(
    public readonly location: Location,
    public readonly uri: Uri,
    public label: string
  ) { }

  public readonly key = "PositionInFile"
}

type Node = TopLevel | PositionInFile

export function startFindInFilesProvider(context: ExtensionContext): FindInFilesProvider {
  const findInFilesProvider = new FindInFilesProvider;
  const treeDataProvider = window.registerTreeDataProvider('metalsFindInFiles', findInFilesProvider);
  context.subscriptions.push(treeDataProvider);

  return findInFilesProvider;
}

export function createFindInFilesTreeView(provider: FindInFilesProvider, context: ExtensionContext): TreeView<unknown> {
  const treeView = window.createTreeView('metalsFindInFiles', {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  const didChangeSelection = treeView.onDidChangeSelection(async (e) => {
    const selected = e.selection;
    if (selected.length == 1) {
      // only one element is selected
      const head = selected[0];
      switch (head.key) {
        case "TopLevel":
          return Promise.resolve();
        case "PositionInFile":
          const positionInFile = (head as PositionInFile);
          const textDocument = await workspace.openTextDocument(positionInFile.uri);
          const textEditor = await window.showTextDocument(textDocument);
          const range = positionInFile.location.range;
          const vscodeRange = new Range(new Position(range.start.line, range.start.character), new Position(range.end.line, range.end.character));
          textEditor.revealRange(vscodeRange, TextEditorRevealType.InCenter);
      }
    }
  });
  context.subscriptions.push(didChangeSelection);

  return treeView;
}

class FindInFilesProvider implements TreeDataProvider<Node> {
  private items: TopLevel[] = Array.of();
  didChange: EventEmitter<Node> = new EventEmitter<Node>();
  onDidChangeTreeData?: Event<Node> = this.didChange.event;

  constructor() { }

  getTreeItem(element: Node): TreeItem {
    switch (element.key) {
      case "TopLevel":
        const topLevelResult: TreeItem = {
          resourceUri: element.resourceUri,
          description: element.resourceUri.path,
          collapsibleState: TreeItemCollapsibleState.Expanded,
        };

        return topLevelResult;
      case "PositionInFile":
        const start = element.location.range.start;
        const line: number = start.line;
        const fileName: string | undefined = element.uri.fsPath.split('/').pop();
        const shortDescription: string = fileName + ':' + (line + 1);
        const positionResult: TreeItem = {
          label: element.label,
          description: shortDescription,
          resourceUri: element.uri
        };

        return positionResult;
    }
  }

  getChildren(element?: Node): Thenable<Node[]> {
    if (!element) {
      return Promise.resolve(this.items);
    } else {
      switch (element.key) {
        case "TopLevel":
          return Promise.resolve(element.positions);
        case "PositionInFile":
          return Promise.resolve([]);
      }
    }
  }

  getParent?(element: Node): Thenable<Node | undefined> {
    switch (element.key) {
      case "TopLevel":
        return Promise.resolve(undefined);
      case "PositionInFile":
        return Promise.resolve(this.items.find(topLevel => topLevel.positions.includes(element)));
    }
  }

  update(newElems: TopLevel[]) {
    this.items.splice(0, this.items.length, ...newElems);
    this.didChange.fire(undefined);
  }

  async toTopLevel(locations: Location[]): Promise<TopLevel[]> {
    const locationsByFile: Map<string, Location[]> = locations.reduce(
      (entryMap, e) => entryMap.set(e.uri, [...entryMap.get(e.uri) || [], e]),
      new Map<string, Location[]>()
    );

    return await Promise.all(
      Array.from(locationsByFile, async ([filePath, locations]) => {
        const uri: Uri = Uri.parse(filePath);
        const openTextDocument = await workspace.openTextDocument(uri);
        const newPositions: PositionInFile[] =
          locations.reduce(
            (arr, location) => {
              const line = openTextDocument.lineAt(location.range.start.line);
              const newPosition = new PositionInFile(location, uri, line.text.trimStart());
              return arr.concat(newPosition);
            },
            [] as PositionInFile[]);
        return new TopLevel(newPositions, uri);
      }));
  }
}