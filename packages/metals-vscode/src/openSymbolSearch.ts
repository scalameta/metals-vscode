import {
  window,
  QuickPickItem,
  SymbolInformation,
  CancellationTokenSource,
  SymbolKind,
  Uri,
} from "vscode";
import { LanguageClient, Location } from "vscode-languageclient/node";
import { gotoLocation, WindowLocation } from "./goToLocation";
import { MetalsFileProvider } from "./metalsContentProvider";

class SymbolItem implements QuickPickItem {
  label: string;
  description?: string | undefined;
  detail?: string | undefined;
  alwaysShow?: boolean | undefined;
  location: Location;

  constructor(si: SymbolInformation, workspace: Uri | undefined) {
    const icon = symbolKindIcon(si.kind);
    this.label = `$(symbol-${icon}) ${si.name}`;
    this.description = si.containerName;
    if (workspace) {
      const path = Uri.parse(si.location.uri.toString()).path;
      if (this.label.indexOf("Add ';' to search library dependencies") < 0) {
        this.detail = path.replace(workspace.path, "");
      }
    }
    this.alwaysShow = true;
    this.location = Location.create(
      si.location.uri.toString(),
      si.location.range
    );
  }
}

export function openSymbolSearch(
  client: LanguageClient,
  metalsFileProvider: MetalsFileProvider,
  workspace: Uri | undefined
): void {
  const inputBox = window.createQuickPick<SymbolItem>();
  inputBox.placeholder =
    "Examples: `List`, `s.c.i.List`, `List;`(include dependencies)";
  inputBox.matchOnDetail = false;
  inputBox.matchOnDescription = false;

  const activeTextEditor = window.activeTextEditor;
  const wordRange = activeTextEditor?.document?.getWordRangeAtPosition(
    activeTextEditor?.selection.active
  );
  const wordUnderCursor =
    wordRange && activeTextEditor?.document?.getText(wordRange);
  if (wordUnderCursor) {
    inputBox.value = wordUnderCursor;
  }

  let cancelToken: CancellationTokenSource | null = null;

  inputBox.onDidChangeValue(() => {
    if (cancelToken) {
      cancelToken.cancel();
    }

    cancelToken = new CancellationTokenSource();
    client
      .sendRequest(
        "workspace/symbol",
        { query: inputBox.value },
        cancelToken.token
      )
      .then((v) => {
        const symbols = v as SymbolInformation[];
        const items = symbols.map((si) => new SymbolItem(si, workspace));
        inputBox.items = items;
      });
  });

  inputBox.onDidAccept(() => {
    const location = inputBox.activeItems[0].location;
    const windowLocation: WindowLocation = {
      uri: location.uri,
      range: location.range,
      otherWindow: false,
    };
    inputBox.dispose();

    gotoLocation(windowLocation, metalsFileProvider);
  });
  inputBox.show();
}

function symbolKindIcon(kind: SymbolKind): string {
  switch (kind - 1) {
    case SymbolKind.File:
      return "file";
    case SymbolKind.Module:
      return "module";
    case SymbolKind.Namespace:
      return "namespace";
    case SymbolKind.Package:
      return "package";
    case SymbolKind.Class:
      return "class";
    case SymbolKind.Method:
      return "method";
    case SymbolKind.Property:
      return "property";
    case SymbolKind.Field:
      return "field";
    case SymbolKind.Constructor:
      return "constructor";
    case SymbolKind.Enum:
      return "enum";
    case SymbolKind.Interface:
      return "interface";
    case SymbolKind.Function:
      return "function";
    case SymbolKind.Variable:
      return "variable";
    case SymbolKind.Constant:
      return "constant";
    case SymbolKind.String:
      return "string";
    case SymbolKind.Number:
      return "number";
    case SymbolKind.Boolean:
      return "boolean";
    case SymbolKind.Array:
      return "array";
    case SymbolKind.Object:
      return "object";
    case SymbolKind.Key:
      return "key";
    case SymbolKind.Null:
      return "null";
    case SymbolKind.EnumMember:
      return "enum-member";
    case SymbolKind.Struct:
      return "struct";
    case SymbolKind.Event:
      return "event";
    case SymbolKind.Operator:
      return "operator";
    case SymbolKind.TypeParameter:
      return "type-parameter";
    default:
      return "file";
  }
}
