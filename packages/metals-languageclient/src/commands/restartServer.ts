import {
  ShutdownRequest,
  ExitNotification
} from "vscode-languageserver-protocol";
import { LanguageClient } from "../interfaces/LanguageClient";
import { exec, ChildProcess } from "child_process";
import { ShowMessage, normalize } from "../interfaces/ShowMessage";

const timeoutMs = 4000;

/**
 * Try to gracefully shutdown the server using LSP `shutdown` and `exit` endpoints.
 * If the server is unresponsive, fall back to killing its process.
 *
 * @param client
 * @param workspace
 */
export function restartServer(
  client: LanguageClient,
  showMessage: ShowMessage
): () => Promise<void> {
  return () => {
    const { showInformationMessage, showWarningMessage } = normalize(
      showMessage
    );
    const timeout = (ms: number) =>
      new Promise<void>((_resolve, reject) => setTimeout(reject, ms));

    const gracefullyTerminate = client
      .sendRequest(ShutdownRequest.type)
      .then(() => {
        client.sendNotification(ExitNotification.type);
        showInformationMessage("Metals is restarting");
      });

    return Promise.race([gracefullyTerminate, timeout(timeoutMs)]).catch(() => {
      showWarningMessage(
        "Metals is unresponsive, killing the process and starting a new server.",
        "warning"
      );

      // NOTE(gabro): we know LanguageClient contains the _serverProcess private property,
      // so we use a cast to access it
      const serverPid = ((client as unknown) as {
        _serverProcess: ChildProcess;
      })._serverProcess.pid;

      exec(`kill ${serverPid}`);
    });
  };
}
