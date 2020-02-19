import {
  StaticFeature,
  InitializeParams,
  ServerCapabilities
} from "vscode-languageclient";

export interface TreeViewProvider {}
export interface DebuggingProvider {}
export interface DecorationProvider {}
export interface InputBoxProvider {}
export interface DidFocusProvider {}
export interface SlowTaskProvider {}
export interface ExecuteClientCommandProvider {}
export interface DoctorProvider {}
export interface StatusBarProvider {}

export class MetalsFeatures implements StaticFeature {
  treeViewProvider?: TreeViewProvider;
  debuggingProvider?: DebuggingProvider;
  decorationProvider?: DecorationProvider;
  inputBoxProvider?: InputBoxProvider;
  didFocusProvider?: DidFocusProvider;
  slowTaskProvider?: SlowTaskProvider;
  executeClientCommandProvider?: ExecuteClientCommandProvider;
  doctorProvider?: DoctorProvider;
  statusBarProvider?: StatusBarProvider;

  fillInitializeParams(params: InitializeParams): void {
    if (!params.capabilities.experimental) {
      params.capabilities.experimental = {};
    }
    (params.capabilities.experimental as any).treeViewProvider = true;
    (params.capabilities.experimental as any).debuggingProvider = true;
    (params.capabilities.experimental as any).decorationProvider = true;
    (params.capabilities.experimental as any).inputBoxProvider = true;
    (params.capabilities.experimental as any).didFocusProvider = true;
    (params.capabilities.experimental as any).slowTaskProvider = true;
    (params.capabilities
      .experimental as any).executeClientCommandProvider = true;
    (params.capabilities.experimental as any).doctorProvider = "html";
    (params.capabilities.experimental as any).statusBarProvider = "on";
  }
  fillClientCapabilities(): void {}
  initialize(capabilities: ServerCapabilities): void {
    if (capabilities.experimental) {
      this.treeViewProvider = capabilities.experimental.treeViewProvider;
      this.debuggingProvider = capabilities.experimental.debuggingProvider;
      this.decorationProvider = capabilities.experimental.decorationProvider;
      this.inputBoxProvider = capabilities.experimental.inputBoxProvider;
      this.didFocusProvider = capabilities.experimental.didFocusProvider;
      this.slowTaskProvider = capabilities.experimental.slowTaskProvider;
      this.executeClientCommandProvider =
        capabilities.experimental.executeClientCommandProvider;
      this.doctorProvider = capabilities.experimental.doctorProvider;
      this.statusBarProvider = capabilities.experimental.statusBarProvider;
    }
  }
}
