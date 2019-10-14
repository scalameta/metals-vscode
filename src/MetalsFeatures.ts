import {
  StaticFeature,
  InitializeParams,
  ServerCapabilities
} from "vscode-languageclient";

export interface TreeViewProvider {}
export interface DebuggingProvider {}

export class MetalsFeatures implements StaticFeature {
  treeViewProvider?: TreeViewProvider;
  debuggingProvider?: DebuggingProvider;

  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    params.capabilities.experimental.treeViewProvider = true;
    params.capabilities.experimental.debuggingProvider = true;
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.treeViewProvider = capabilities.experimental.treeViewProvider;
      this.debuggingProvider = capabilities.experimental.debuggingProvider;
    }
  }
}
