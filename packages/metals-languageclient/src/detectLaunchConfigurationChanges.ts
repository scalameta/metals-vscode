import { UserConfiguration } from "./interfaces/UserConfiguration";
import { Workspace } from "./interfaces/Workspace";

interface PromptRestartParams {
  message: string;
  reloadWindowChoice: string;
  dismissChoice: string;
}

export function detectLaunchConfigurationChanges(
  workspace: Workspace,
  promptRestart: (params: PromptRestartParams) => Thenable<void>,
  additionalRestartKeys: string[] = []
): void {
  workspace.onDidChangeConfiguration((e) => {
    const promptRestartKeys = [
      UserConfiguration.ServerVersion,
      UserConfiguration.ServerProperties,
      UserConfiguration.JavaHome,
      UserConfiguration.CustomRepositories,
      UserConfiguration.CoursierMirror,
      ...additionalRestartKeys,
    ];
    const shouldPromptRestart = promptRestartKeys.some((key) =>
      e.affectsConfiguration(`metals.${key}`)
    );
    if (shouldPromptRestart) {
      promptRestart({
        message:
          "Server launch configuration change detected. Reload the window for changes to take effect",
        reloadWindowChoice: "Reload Window",
        dismissChoice: "Not now",
      });
    }
  });
}
