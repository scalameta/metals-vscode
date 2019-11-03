import {
  StaticFeature,
  InitializeParams,
  ServerCapabilities
} from "vscode-languageclient";

export interface TreeViewProvider {}
export interface DebuggingProvider {}
export interface DecorationProvider {}

export class MetalsFeatures implements StaticFeature {
  treeViewProvider?: TreeViewProvider;
  debuggingProvider?: DebuggingProvider;
  decorationProvider?: DecorationProvider;

  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    params.capabilities.experimental.treeViewProvider = true;
    params.capabilities.experimental.debuggingProvider = true;
    params.capabilities.experimental.decorationProvider = true;
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.treeViewProvider = capabilities.experimental.treeViewProvider;
      this.debuggingProvider = capabilities.experimental.debuggingProvider;
      this.decorationProvider = capabilities.experimental.decorationProvider;
    }
  }
}
