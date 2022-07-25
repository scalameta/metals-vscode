import {
  commands,
  ConfigurationTarget,
  ExtensionContext,
  window,
  WorkspaceConfiguration,
} from "vscode";
import * as metalsLanguageClient from "metals-languageclient";
import * as workbenchCommands from "./workbenchCommands";
import http from "https";
import { getConfigValue } from "./util";

const serverVersionSection = "serverVersion";
const suggestLatestUpgrade = "suggestLatestUpgrade";

const currentVersionKey = "currentVersion";
const lastUpdatedAtKey = "lastUpdatedAt";

export function getServerVersion(
  config: WorkspaceConfiguration,
  context: ExtensionContext
): string {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const serverVersionConfig = config.get<string>(serverVersionSection);
  const defaultServerVersion =
    config.inspect<string>(serverVersionSection)!.defaultValue!;
  const serverVersion = serverVersionConfig?.trim() || defaultServerVersion;

  validateCurrentVersion(serverVersion, config, context);
  return serverVersion;
}

async function validateCurrentVersion(
  serverVersion: string,
  config: WorkspaceConfiguration,
  context: ExtensionContext
): Promise<void> {
  const suggestUpgradeSetting = getConfigValue<boolean>(
    config,
    suggestLatestUpgrade
  );

  const checkForUpdate = async () => {
    if (suggestUpgradeSetting?.value) {
      return needCheckForUpdates(
        serverVersion,
        suggestUpgradeSetting.target,
        context
      );
    } else {
      return false;
    }
  };
  const isUpdateAvailable = await checkForUpdate();

  if (suggestUpgradeSetting && isUpdateAvailable) {
    const nextVersion = await fetchLatest();
    if (nextVersion != serverVersion) {
      const message = `The latest server version is: ${nextVersion} while you are on ${serverVersion}. Do upgrade?`;
      const upgradeChoice = "Yes";
      const ignoreChoice = "No";
      window
        .showInformationMessage(message, upgradeChoice, ignoreChoice)
        .then((result) => {
          if (result == upgradeChoice) {
            config.update(
              serverVersionSection,
              nextVersion,
              suggestUpgradeSetting.target
            );
            saveVersionDate(nextVersion, suggestUpgradeSetting.target, context);
          } else if (result == ignoreChoice) {
            // extend the current version expiration date
            saveVersionDate(
              serverVersion,
              suggestUpgradeSetting.target,
              context
            );
          }
        });
    }
  } else {
    warnIfIsOutdated(config);
  }
}

async function fetchLatest(): Promise<string> {
  const url = "https://scalameta.org/metals/latests.json";
  const ps = new Promise<string>((resolve, reject) => {
    http.get(url, (resp) => {
      let body = "";
      resp.on("data", (chunk) => (body += chunk));
      resp.on("end", () => resolve(body));
      resp.on("error", (e) => reject(e));
    });
  });

  const text = await ps;
  const json = JSON.parse(text);
  const sorted = [json["release"], json["snapshot"]].sort();
  return sorted[sorted.length - 1];
}

/**
 * The logic is the following:
 *  - if version was set more than a day ago - update is needed
 *  - if version is seen in a first time (user changed version in config by it self) - the update will be delayed for a day
 */
async function needCheckForUpdates(
  currentVersion: string,
  target: ConfigurationTarget,
  context: ExtensionContext
): Promise<boolean> {
  const state =
    target === ConfigurationTarget.Global
      ? context.globalState
      : context.workspaceState;
  const prevVersion = state.get<string>(currentVersionKey);
  const lastUpdated = state.get<string>(lastUpdatedAtKey);

  const today = todayString();
  if (prevVersion !== currentVersion) {
    saveVersionDate(currentVersion, target, context);
    return false;
  } else {
    return lastUpdated !== today;
  }
}

function saveVersionDate(
  version: string,
  target: ConfigurationTarget,
  context: ExtensionContext
): void {
  const state =
    target === ConfigurationTarget.Global
      ? context.globalState
      : context.workspaceState;

  state.update(currentVersionKey, version);
  state.update(lastUpdatedAtKey, todayString());
}

function warnIfIsOutdated(config: WorkspaceConfiguration): void {
  metalsLanguageClient.checkServerVersion({
    config,
    updateConfig: (updateParams) => {
      const { configSection, latestServerVersion, configurationTarget } =
        updateParams;
      config.update(configSection, latestServerVersion, configurationTarget);
    },
    onOutdated: async (outdatedParams) => {
      const {
        upgrade,
        message,
        upgradeChoice,
        openSettingsChoice,
        dismissChoice,
      } = outdatedParams;
      const choice = await window.showWarningMessage(
        message,
        upgradeChoice,
        openSettingsChoice,
        dismissChoice
      );
      switch (choice) {
        case upgradeChoice:
          upgrade();
          break;
        case openSettingsChoice:
          commands.executeCommand(workbenchCommands.openSettings);
          break;
      }
    },
  });
}

function todayString(): string {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return [year, month, day].join("-");
}
