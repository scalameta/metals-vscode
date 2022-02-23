import {
  commands,
  ConfigurationTarget,
  window,
  workspace,
  WorkspaceConfiguration,
} from "vscode";
import * as metalsLanguageClient from "metals-languageclient";
import * as workbenchCommands from "./workbenchCommands";
import http from "https";
import path from "path";
import fs from "fs";
import os from "os";

const serverVersionSection = "serverVersion";
const suggestLatestUpgrade = "suggestLatestUpgrade";
const versionDatesFileName = "versions-meta.json";

export function getServerVersion(config: WorkspaceConfiguration): string {
  /* eslint-disable @typescript-eslint/no-non-null-assertion */
  const serverVersionConfig = config.get<string>(serverVersionSection);
  const defaultServerVersion =
    config.inspect<string>(serverVersionSection)!.defaultValue!;
  const serverVersion = serverVersionConfig?.trim() || defaultServerVersion;

  validateCurrentVersion(serverVersion, config);
  return serverVersion;
}

async function validateCurrentVersion(
  serverVersion: string,
  config: WorkspaceConfiguration
): Promise<void> {
  const suggestUpgradeSetting = getConfigValue<boolean>(
    config,
    suggestLatestUpgrade
  );

  const checkForUpdate = async () => {
    if (suggestUpgradeSetting?.value) {
      return needCheckForUpdates(serverVersion, suggestUpgradeSetting.target);
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
            saveVersionDate(nextVersion, suggestUpgradeSetting.target);
          } else if (result == ignoreChoice) {
            // extend the current version expiration date
            saveVersionDate(serverVersion, suggestUpgradeSetting.target);
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

/* The logic is the following:
    - if version was set more than a day ago - update is needed
    - if version is seen in a first time (user changed version in config by it self) - the update will be delayed for a day
 */
async function needCheckForUpdates(
  currentVersion: string,
  target: ConfigurationTarget
): Promise<boolean> {
  const file = path.join(datesFileDir(target), versionDatesFileName);

  const records: Record<string, string> = (() => {
    if (!fs.existsSync(file)) {
      return {};
    } else {
      const data = fs.readFileSync(file, { encoding: "utf8", flag: "r" });
      return JSON.parse(data);
    }
  })();

  if (records[currentVersion]) {
    return records[currentVersion] != todayString();
  } else {
    saveVersionDate(currentVersion, target);
    return false;
  }
}

function saveVersionDate(version: string, target: ConfigurationTarget): void {
  const datesValue: Record<string, string> = {};
  datesValue[version] = todayString();
  const dir = datesFileDir(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(dir, versionDatesFileName),
    JSON.stringify(datesValue)
  );
}

function datesFileDir(target: ConfigurationTarget): string {
  if (target == ConfigurationTarget.Workspace && workspace.workspaceFolders) {
    const wsDir = workspace.workspaceFolders[0]?.uri.fsPath;
    return path.join(wsDir, ".metals");
  } else {
    return path.join(os.homedir(), ".metals-data");
  }
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

function getConfigValue<A>(
  config: WorkspaceConfiguration,
  key: string
): { value: A; target: ConfigurationTarget } | undefined {
  const value = config.get<A>(key);
  const { defaultValue, workspaceValue } = config.inspect<A>(key)!;
  if (value) {
    const getTarget = () => {
      if (workspaceValue && workspaceValue !== defaultValue) {
        return ConfigurationTarget.Workspace;
      } else {
        return ConfigurationTarget.Global;
      }
    };
    const target = getTarget();
    return { value, target };
  } else if (defaultValue) {
    return {
      value: defaultValue,
      target: ConfigurationTarget.Global,
    };
  }
}
