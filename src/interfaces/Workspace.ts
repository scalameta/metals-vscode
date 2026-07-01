import { Event } from "vscode-languageclient";

export interface Workspace {
  onDidChangeConfiguration: Event<ConfigurationChangeEvent>;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string, resource?: unknown): boolean;
}
