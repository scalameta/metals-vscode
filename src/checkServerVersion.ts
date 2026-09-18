import * as semver from "semver";
import { ConfigurationTarget } from "./interfaces/ConfigurationTarget";
import { UserConfiguration } from "./interfaces/UserConfiguration";
import { WorkspaceConfiguration } from "./interfaces/WorkspaceConfiguration";

interface OnOutdatedParams {
  message: string;
  openSettingsChoice: string;
  upgradeChoice: string;
  dismissChoice: string;
  upgrade: () => void;
}

interface UpdateConfigParams {
  configSection: string;
  latestServerVersion: string;
  configurationTarget: ConfigurationTarget;
}

const configSection = UserConfiguration.ServerVersion;

interface CheckServerVersionParams {
  config: WorkspaceConfiguration;
  updateConfig: (params: UpdateConfigParams) => void;
  onOutdated: (params: OnOutdatedParams) => void;
}

export async function checkServerVersion({
  config,
  updateConfig,
  onOutdated,
}: CheckServerVersionParams) {
  const { serverVersion, latestServerVersion, configurationTarget } =
    serverVersionInfo(config);
  const isOutdated = (() => {
    try {
      // A `-SNAPSHOT` version is a moving dev build (e.g. from `sbt
      // publishLocal`), not a version someone forgot to bump: semver
      // treats a pre-release as older than its own release (e.g.
      // `1.6.9-SNAPSHOT` < `1.6.9`), which would otherwise flag any local
      // dev build as "outdated" and offer to silently overwrite it with
      // the stable release.
      if (
        serverVersion &&
        latestServerVersion &&
        !serverVersion.endsWith("SNAPSHOT")
      ) {
        return semver.lt(serverVersion, latestServerVersion);
      } else {
        return false;
      }
    } catch (_e) {
      // serverVersion has an invalid format
      // ignore the exception here, and let subsequent checks handle this
      return false;
    }
  })();

  if (isOutdated) {
    const message = `You are running an out-of-date version of Metals. The latest version is ${latestServerVersion}, but you have configured a custom server version ${serverVersion}`;
    const upgradeChoice = `Upgrade to ${latestServerVersion} now`;
    const openSettingsChoice = "Open settings";
    const dismissChoice = "Not now";
    const upgrade = () => {
      if (latestServerVersion) {
        updateConfig({
          configSection,
          latestServerVersion,
          configurationTarget,
        });
      }
    };
    onOutdated({
      message,
      upgradeChoice,
      openSettingsChoice,
      dismissChoice,
      upgrade,
    });
  }
}

function serverVersionInfo(config: WorkspaceConfiguration): {
  serverVersion: string | undefined;
  latestServerVersion: string | undefined;
  configurationTarget: ConfigurationTarget;
} {
  const computedVersion = config.get<string>(configSection);
  const defaultAndGlobal = config.inspect<string>(configSection);
  const configurationTarget = (() => {
    if (
      defaultAndGlobal &&
      defaultAndGlobal.globalValue &&
      defaultAndGlobal.globalValue !== defaultAndGlobal.defaultValue
    ) {
      return ConfigurationTarget.Global;
    }
    return ConfigurationTarget.Workspace;
  })();
  return {
    serverVersion: computedVersion,
    latestServerVersion: defaultAndGlobal?.defaultValue,
    configurationTarget,
  };
}
