import {
  Hover,
  Position,
  Range,
  RequestType,
  TextDocumentIdentifier,
  WorkDoneProgressParams,
} from "vscode-languageclient";

export const hover = new RequestType<HoverParams, Hover | null, void>(
  "textDocument/hover",
);

export interface HoverParams extends WorkDoneProgressParams {
  textDocument: TextDocumentIdentifier;
  position: Position | undefined;
  range: Range | undefined;
}
