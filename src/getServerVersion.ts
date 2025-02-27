import {
  commands,
  ExtensionContext,
  window,
  WorkspaceConfiguration,
  ConfigurationTarget as VConfigurationTarget,
} from "vscode";
import * as workbenchCommands from "./workbenchCommands";
import http from "https";
import { getConfigValue } from "./util";
import { DefaultCheckForUpdateRepo } from "./repository/CheckForUpdateRepo";
import { needCheckForUpdates } from "./service/checkForUpdate";
import { ConfigurationTarget } from "./ConfigurationTarget";
import { checkServerVersion } from "./checkServerVersion";

const serverVersionSection = "serverVersion";
const suggestLatestUpgrade = "suggestLatestUpgrade";

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

  const checkForUpdateRepo = new DefaultCheckForUpdateRepo(context);

  const checkForUpdate = async () => {
    if (suggestUpgradeSetting?.value) {
      return needCheckForUpdates(
        serverVersion,
        todayString(),
        fromVSCode(suggestUpgradeSetting.target),
        checkForUpdateRepo
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
            checkForUpdateRepo.saveLastUpdated(
              nextVersion,
              todayString(),
              fromVSCode(suggestUpgradeSetting.target)
            );
          } else if (result == ignoreChoice) {
            // extend the current version expiration date
            checkForUpdateRepo.saveLastUpdated(
              serverVersion,
              todayString(),
              fromVSCode(suggestUpgradeSetting.target)
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

function warnIfIsOutdated(config: WorkspaceConfiguration): void {
  checkServerVersion({
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

/**
 * @returns YYYY-MM-DD in a local date
 */
export function todayString(): string {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return [year, month, day].join("-");
}

function fromVSCode(target: VConfigurationTarget): ConfigurationTarget {
  switch (target) {
    case VConfigurationTarget.Global:
      return ConfigurationTarget.Global;
    case VConfigurationTarget.Workspace:
      return ConfigurationTarget.Workspace;
    case VConfigurationTarget.WorkspaceFolder:
      return ConfigurationTarget.Workspace;
  }
}
