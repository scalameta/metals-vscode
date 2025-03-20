import { ExtensionContext, Memento } from "vscode";
import { ConfigurationTarget } from "../ConfigurationTarget";

type LastUpdated = {
  prevVersion?: string;
  lastUpdatedAt?: string;
};

export interface CheckForUpdateRepo {
  getLastUpdated(target: ConfigurationTarget): LastUpdated;
  saveLastUpdated(
    serverVersion: string,
    lastUpdatedAt: string,
    target: ConfigurationTarget
  ): void;
}

export class DefaultCheckForUpdateRepo implements CheckForUpdateRepo {
  constructor(private context: ExtensionContext) {}

  private CurrentVersionKey = "currentVersion";
  private LastUpdatedAtKey = "lastUpdatedAt";

  getLastUpdated(target: ConfigurationTarget): LastUpdated {
    const state = this.storage(target);
    const prevVersion = state.get<string>(this.CurrentVersionKey);
    const lastUpdatedAt = state.get<string>(this.LastUpdatedAtKey);
    return {
      prevVersion,
      lastUpdatedAt
    };
  }

  saveLastUpdated(
    serverVersion: string,
    lastUpdatedAt: string,
    target: ConfigurationTarget
  ): void {
    const state = this.storage(target);
    state.update(this.CurrentVersionKey, serverVersion);
    state.update(this.LastUpdatedAtKey, lastUpdatedAt);
    return;
  }

  private storage(target: ConfigurationTarget): Memento {
    return target === ConfigurationTarget.Global
      ? this.context.globalState
      : this.context.workspaceState;
  }
}
