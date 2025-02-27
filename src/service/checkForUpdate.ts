import { ConfigurationTarget } from "../ConfigurationTarget";
import { CheckForUpdateRepo } from "../repository/CheckForUpdateRepo";

/**
 * The logic is the following:
 *  - if version was set more than a day ago - update is needed
 *  - if version is seen for the first time (user changed version in config by it self) - the update will be delayed for a day
 */
export async function needCheckForUpdates(
  currentVersion: string,
  today: string,
  target: ConfigurationTarget,
  repo: CheckForUpdateRepo
): Promise<boolean> {
  const { prevVersion, lastUpdatedAt } = repo.getLastUpdated(target);

  if (prevVersion !== currentVersion) {
    repo.saveLastUpdated(currentVersion, today, target);
    return false;
  } else {
    return lastUpdatedAt !== today;
  }
}
