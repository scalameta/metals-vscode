/* eslint-disable @typescript-eslint/no-namespace */
import { NotificationType } from "vscode-jsonrpc";
import {
  DecorationRenderOptions,
  DecorationInstanceRenderOptions,
  Range,
} from "vscode";

/**
 * This protocol is one notable exception that we can't port over to
 * metals-languageclient as it's too heavily intertwined with VS Code.
 * There is now way to move it over without bringing a significant amount of
 * code over with it from the VS Code code base which isn't a good idea.
 */
export namespace DecorationTypeDidChange {
  export const type = new NotificationType<DecorationRenderOptions>(
    "metals/decorationTypeDidChange"
  );
}

export interface MetalsDecorationOptions {
  range: Range;
  hoverMessage: {
    kind: string;
    value: string;
  };
  renderOptions?: DecorationInstanceRenderOptions;
}

export interface PublishDecorationsParams {
  uri: string;
  isInline: boolean | undefined;
  options: MetalsDecorationOptions[];
}

export namespace DecorationsRangesDidChange {
  export const type = new NotificationType<PublishDecorationsParams>(
    "metals/publishDecorations"
  );
}
