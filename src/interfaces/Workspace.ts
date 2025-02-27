import { Event } from "vscode-languageserver-protocol";

export interface Workspace {
  onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string, resource?: unknown): boolean;
}
