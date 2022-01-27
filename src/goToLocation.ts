import { workspace, window, ViewColumn, Uri, Range } from "vscode";
import { DocumentUri, Range as LspRange } from "vscode-languageclient/node";

export interface WindowLocation {
  uri: DocumentUri;
  range: LspRange;
  otherWindow: boolean;
}

export function gotoLocation(location: WindowLocation): void {
  const range = new Range(
    location.range.start.line,
    location.range.start.character,
    location.range.end.line,
    location.range.end.character
  );
  let vs = ViewColumn.Active;
  if (location.otherWindow) {
    vs =
      window.visibleTextEditors
        .filter(
          (vte) =>
            window.activeTextEditor?.document.uri.scheme != "output" &&
            vte.viewColumn
        )
        .pop()?.viewColumn || ViewColumn.Beside;
  }
  workspace.openTextDocument(Uri.parse(location.uri)).then((textDocument) =>
    window.showTextDocument(textDocument, {
      selection: range,
      viewColumn: vs,
    })
  );
}
