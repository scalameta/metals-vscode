import * as fs from "fs";
import { ServerCommands } from "metals-languageclient";
import * as path from "path";
import { env, ExtensionContext, Uri, window, workspace } from "vscode";
import {
  ExecuteCommandRequest,
  LanguageClient,
} from "vscode-languageclient/node";
import { registerCommandWithin } from "../util";

export function registerServerCommands(
  context: ExtensionContext,
  client: LanguageClient
): void {
  const registerCommand = registerCommandWithin(context);

  [
    ServerCommands.BuildImport,
    ServerCommands.BuildRestart,
    ServerCommands.BuildConnect,
    ServerCommands.BuildDisconnect,
    ServerCommands.GenerateBspConfig,
    ServerCommands.BspSwitch,
    ServerCommands.SourcesScan,
    ServerCommands.DoctorRun,
    ServerCommands.CascadeCompile,
    ServerCommands.CleanCompile,
    ServerCommands.CancelCompilation,
    ServerCommands.AmmoniteStart,
    ServerCommands.AmmoniteStop,
  ].forEach((command) => {
    registerCommand("metals." + command, async () =>
      client.sendRequest(ExecuteCommandRequest.type, { command: command })
    );
  });

  registerCommand(`metals.${ServerCommands.AnalyzeStacktrace}`, () => {
    env.clipboard.readText().then((clip) => {
      if (clip.trim().length < 1) {
        window.showInformationMessage(
          "Clipboard appears to be empty, copy stacktrace to clipboard and retry this command"
        );
      } else {
        client.sendRequest(ExecuteCommandRequest.type, {
          command: "analyze-stacktrace",
          arguments: [clip],
        });
      }
    });
  });

  registerCommand(`metals.${ServerCommands.ResetChoice}`, (args = []) => {
    client.sendRequest(ExecuteCommandRequest.type, {
      command: ServerCommands.ResetChoice,
      arguments: args,
    });
  });

  registerCommand(`metals.${ServerCommands.Goto}`, (args) => {
    client.sendRequest(ExecuteCommandRequest.type, {
      command: ServerCommands.Goto,
      arguments: args,
    });
  });

  registerCommand(`metals.${ServerCommands.NewScalaProject}`, async () => {
    return client.sendRequest(ExecuteCommandRequest.type, {
      command: ServerCommands.NewScalaProject,
    });
  });

  registerCommand(
    `metals.${ServerCommands.NewScalaFile}`,
    async (directory: Uri) => {
      return client.sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.NewScalaFile,
        arguments: [directory?.toString()],
      });
    }
  );

  registerCommand(
    `metals.${ServerCommands.NewJavaFile}`,
    async (directory: Uri) => {
      return client.sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.NewJavaFile,
        arguments: [directory?.toString()],
      });
    }
  );

  registerCommand(`metals.new-scala-worksheet`, async () => {
    const sendRequest = (args: Array<string | undefined>) => {
      return client.sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.NewScalaFile,
        arguments: args,
      });
    };
    const currentUri = window.activeTextEditor?.document.uri;
    if (currentUri != null) {
      const parentUri = path.dirname(currentUri.toString());
      const name = path.basename(parentUri);
      const parentPath = Uri.parse(parentUri).fsPath;
      const fullPath = path.join(parentPath, `${name}.worksheet.sc`);
      if (fs.existsSync(fullPath)) {
        window.showWarningMessage(
          `A worksheet ${name}.worksheet.sc already exists, opening it instead`
        );
        return workspace
          .openTextDocument(fullPath)
          .then((textDocument) => window.showTextDocument(textDocument));
      } else {
        return sendRequest([parentUri, name, "scala-worksheet"]);
      }
    } else {
      return sendRequest([undefined, undefined, "scala-worksheet"]);
    }
  });
}
