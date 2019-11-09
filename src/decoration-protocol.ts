import { NotificationType } from "vscode-jsonrpc";
import { DecorationRenderOptions, DecorationOptions } from "vscode";

"use strict";

export namespace DecorationTypeDidChange {
  export const type = new NotificationType<DecorationRenderOptions, void>(
    "metals/decorationTypeDidChange"
  );
}

export interface PublishDecorationsParams {
  uri: string;
  options: DecorationOptions[];
}
export namespace DecorationsRangesDidChange {
  export const type = new NotificationType<PublishDecorationsParams, void>(
    "metals/publishDecorations"
  );
}
