import {
  EventEmitter,
  ExtensionContext,
  OutputChannel,
  Position,
  Range,
  TextEditorRevealType,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  TreeView,
  Uri,
  window,
  workspace,
} from "vscode";
import { LanguageClient, Location } from "vscode-languageclient/node";

class TopLevel {
  constructor(
    readonly positions: PositionInFile[],
    readonly resourceUri: Uri
  ) {}

  readonly key = "TopLevel";
}

class PositionInFile {
  constructor(
    readonly location: Location,
    readonly uri: Uri,
    readonly label: string
  ) {}

  readonly key = "PositionInFile";
}

type Node = TopLevel | PositionInFile;

export function startFindInFilesProvider(
  context: ExtensionContext
): FindInFilesProvider {
  const findInFilesProvider = new FindInFilesProvider();
  const treeDataProvider = window.registerTreeDataProvider(
    "metalsFindInFiles",
    findInFilesProvider
  );
  context.subscriptions.push(treeDataProvider);

  return findInFilesProvider;
}

export function createFindInFilesTreeView(
  provider: FindInFilesProvider,
  context: ExtensionContext
): TreeView<unknown> {
  const treeView = window.createTreeView("metalsFindInFiles", {
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
          const positionInFile = head;
          const textDocument = await workspace.openTextDocument(
            positionInFile.uri
          );
          const textEditor = await window.showTextDocument(textDocument);
          const range = positionInFile.location.range;
          const vscodeRange = new Range(
            new Position(range.start.line, range.start.character),
            new Position(range.end.line, range.end.character)
          );
          textEditor.revealRange(vscodeRange, TextEditorRevealType.InCenter);
      }
    }
  });
  context.subscriptions.push(didChangeSelection);

  return treeView;
}

export async function executeFindInFiles(
  client: LanguageClient,
  provider: FindInFilesProvider,
  view: TreeView<unknown>,
  outputChannel: OutputChannel
) {
  try {
    const include = await window
      .showInputBox({
        prompt: "Enter file mask",
        placeHolder: ".conf",
      })
      .then((include) => {
        if (include === undefined) {
          return Promise.reject("Undefined mask");
        } else if (include === "") {
          return Promise.reject("Empty file mask");
        } else {
          return include;
        }
      });

    const pattern = await window
      .showInputBox({
        prompt: "Enter search pattern",
      })
      .then((pattern) => {
        if (pattern === undefined) {
          return Promise.reject("Undefined pattern");
        } else if (pattern === "") {
          return Promise.reject("Empty pattern");
        } else {
          return pattern;
        }
      });

    const locations = await client.sendRequest<Location[]>(
      "metals/findTextInDependencyJars",
      {
        options: { include },
        query: { pattern },
      }
    );

    const newTopLevel = await toTopLevel(locations);

    provider.update(newTopLevel);

    if (newTopLevel.length != 0) {
      return await view.reveal(newTopLevel[0]);
    } else return await Promise.resolve();
  } catch (error) {
    outputChannel.appendLine(
      "Error finding text in dependency jars: " + JSON.stringify(error)
    );
  }
}

async function toTopLevel(locations: Location[]): Promise<TopLevel[]> {
  const locationsByFile = new Map<string, Location[]>();

  for (const loc of locations) {
    const previous = locationsByFile.get(loc.uri) || [];
    locationsByFile.set(loc.uri, [...previous, loc]);
  }

  return await Promise.all(
    Array.from(locationsByFile, async ([filePath, locations]) => {
      const uri: Uri = Uri.parse(filePath);

      const readData = await workspace.fs.readFile(uri);
      const fileContent = Buffer.from(readData).toString("utf8");
      const lines = fileContent.split(/\r?\n/);

      const newPositions = locations.reduce((arr, location) => {
        const line = lines[location.range.start.line];
        const newPosition = new PositionInFile(location, uri, line.trimStart());
        return [...arr, newPosition];
      }, [] as PositionInFile[]);
      return new TopLevel(newPositions, uri);
    })
  );
}

class FindInFilesProvider implements TreeDataProvider<Node> {
  private items: TopLevel[] = [];

  didChange = new EventEmitter<Node>();
  onDidChangeTreeData = this.didChange.event;

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
        const line = start.line;
        const fileName = element.uri.fsPath.split("/").pop();
        const shortDescription = fileName + ":" + (line + 1);
        const positionResult: TreeItem = {
          label: element.label,
          description: shortDescription,
          resourceUri: element.uri,
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
        return Promise.resolve(
          this.items.find((topLevel) => topLevel.positions.includes(element))
        );
    }
  }

  update(newElems: TopLevel[]) {
    this.items = newElems;
    this.didChange.fire(undefined);
  }
}
