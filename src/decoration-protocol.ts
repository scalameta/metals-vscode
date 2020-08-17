import { NotificationType } from "vscode-jsonrpc";
import { DecorationRenderOptions, DecorationOptions } from "vscode";

"use strict";

/**
 * This protocol is one notable exception that we can't port over to
 * metals-languageclient as it's too heavily intertwined with VS Code.
 * There is now way to move it over without bringing a significant amount of
 * code over with it from the VS Code code base which isn't a good idea.
 */
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
