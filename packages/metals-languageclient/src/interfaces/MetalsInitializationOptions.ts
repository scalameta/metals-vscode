interface CompilerInitializationOptions {
  completionCommand?: string;
  isCompletionItemDetailEnabled?: boolean;
  isCompletionItemDocumentationEnabled?: boolean;
  isCompletionItemResolve?: boolean;
  isHoverDocumentationEnabled?: boolean;
  isSignatureHelpDocumentationEnabled?: boolean;
  overrideDefFormat?: "ascii" | "unicode";
  parameterHintsCommand?: string;
  snippetAutoIndent?: boolean;
}

export interface MetalsInitializationOptions {
  compilerOptions?: CompilerInitializationOptions;
  debuggingProvider?: boolean;
  decorationProvider?: boolean;
  inlineDecorationProvider?: boolean;
  didFocusProvider?: boolean;
  doctorProvider?: "json" | "html";
  executeClientCommandProvider?: boolean;
  globSyntax?: "vscode" | "uri";
  icons?: "vscode" | "octicons" | "atom" | "unicode";
  inputBoxProvider?: boolean;
  isVirtualDocumentSupported?: boolean;
  isExitOnShutdown?: boolean;
  isHttpEnabled?: boolean;
  openFilesOnRenameProvider?: boolean;
  quickPickProvider?: boolean;
  renameFileThreshold?: number;
  slowTaskProvider?: boolean;
  statusBarProvider?: "on" | "off" | "log-message" | "show-message";
  treeViewProvider?: boolean;
  openNewWindowProvider?: boolean;
  copyWorksheetOutputProvider?: boolean;
}
