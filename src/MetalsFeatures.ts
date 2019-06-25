import {
  StaticFeature,
  InitializeParams,
  ServerCapabilities
} from "vscode-languageclient";

export interface TreeViewProvider {}

export class MetalsFeatures implements StaticFeature {
  treeViewProvider?: TreeViewProvider;
  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    params.capabilities.experimental.treeViewProvider = true;
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.treeViewProvider = capabilities.experimental.treeViewProvider;
    }
  }
}
