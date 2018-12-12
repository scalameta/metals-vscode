import locateJavaHome from "locate-java-home";
import { workspace } from "vscode";

export function getJavaHome(): Promise<string> {
  const userJavaHome = workspace.getConfiguration("metals").get("javaHome");
  if (typeof userJavaHome === "string" && userJavaHome.trim() !== "") {
    return Promise.resolve(userJavaHome);
  } else {
    return new Promise((resolve, reject) => {
      locateJavaHome({ version: "1.8" }, (err, javaHomes) => {
        if (err) {
          reject(err);
        } else {
          resolve(javaHomes[0].path);
        }
      });
    });
  }
}
