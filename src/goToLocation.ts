import { workspace, window, ViewColumn, Uri, Range } from "vscode";
import { Location } from "vscode-languageclient/node";

export function gotoLocation(location: Location, otherWindow: Boolean): void {
  const range = new Range(
    location.range.start.line,
    location.range.start.character,
    location.range.end.line,
    location.range.end.character
  );
  var vs = ViewColumn.Active;
  if (otherWindow) {
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
