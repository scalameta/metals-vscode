import locateJavaHome from "locate-java-home";
import { workspace, OutputChannel } from "vscode";
import * as semver from "semver";

export function getJavaHome(out: OutputChannel): Promise<string> {
  const userJavaHome = workspace.getConfiguration("metals").get("javaHome");
  if (typeof userJavaHome === "string" && userJavaHome.trim() !== "") {
    return Promise.resolve(userJavaHome);
  } else {
    const JAVA_HOME = process.env["JAVA_HOME"];
    if (JAVA_HOME) return Promise.resolve(JAVA_HOME);
    else {
      return new Promise((resolve, reject) => {
        locateJavaHome({ version: ">=1.8 <=1.11" }, (err, javaHomes) => {
          if (err) {
            reject(err);
          } else if (!javaHomes || javaHomes.length === 0) {
            reject(new Error("No suitable Java version found"));
          } else {
            // Sort by reverse security number so the highest number comes first.
            javaHomes.sort((a, b) => {
              const byVersion = -semver.compare(a.version, b.version);
              if (byVersion === 0) return b.security - a.security;
              else return byVersion;
            });
            const jdkHome = javaHomes.find(j => j.isJDK);
            if (jdkHome) {
              resolve(jdkHome.path);
            } else {
              resolve(javaHomes[0].path);
            }
          }
        });
      });
    }
  }
}
