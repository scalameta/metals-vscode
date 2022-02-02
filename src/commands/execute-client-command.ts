import {
  ClientCommands,
  ExecuteClientCommand,
  MetalsOpenWindowParams,
} from "metals-languageclient";
import {
  commands,
  EventEmitter,
  ExtensionContext,
  OutputChannel,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { WindowLocation } from "../goToLocation";

interface AdditionalParams {
  outputChannel: OutputChannel;
  compilationDoneEmitter: EventEmitter<void>;
}

export function registerExecuteClientCommands(
  context: ExtensionContext,
  client: LanguageClient,
  additionalParams: AdditionalParams
): void {
  const { outputChannel, compilationDoneEmitter } = additionalParams;
  let doctor: WebviewPanel | undefined;
  let stacktrace: WebviewPanel | undefined;

  function getDoctorPanel(isReload: boolean): WebviewPanel {
    if (!doctor) {
      doctor = window.createWebviewPanel(
        "metals-doctor",
        "Metals Doctor",
        ViewColumn.Active,
        { enableCommandUris: true }
      );
      context.subscriptions.push(doctor);
      doctor.onDidDispose(() => {
        doctor = undefined;
      });
    } else if (!isReload) {
      doctor.reveal();
    }
    return doctor;
  }

  function getStacktracePanel(): WebviewPanel {
    if (!stacktrace) {
      stacktrace = window.createWebviewPanel(
        "metals-stacktrace",
        "Analyze Stacktrace",
        ViewColumn.Beside,
        { enableCommandUris: true }
      );
      context.subscriptions.push(stacktrace);
      stacktrace.onDidDispose(() => {
        stacktrace = undefined;
      });
    }
    stacktrace.reveal();
    return stacktrace;
  }

  // Handle the metals/executeClientCommand extension notification.
  const disposable = client.onNotification(
    ExecuteClientCommand.type,
    (params) => {
      switch (params.command) {
        case ClientCommands.GotoLocation: {
          const location = params.arguments?.[0] as WindowLocation;
          commands.executeCommand(
            `metals.${ClientCommands.GotoLocation}`,
            location
          );
          break;
        }
        case ClientCommands.RefreshModel:
          compilationDoneEmitter.fire();
          break;
        case ClientCommands.OpenFolder: {
          const openWindowParams = params
            .arguments?.[0] as MetalsOpenWindowParams;
          if (openWindowParams) {
            commands.executeCommand(
              "vscode.openFolder",
              Uri.parse(openWindowParams.uri),
              openWindowParams.openNewWindow
            );
          }
          break;
        }
        case "metals-show-stacktrace": {
          const html = params.arguments && params.arguments[0];
          if (typeof html === "string") {
            const panel = getStacktracePanel();
            panel.webview.html = html;
          }
          break;
        }
        case ClientCommands.RunDoctor:
        case ClientCommands.ReloadDoctor: {
          const isRun = params.command === ClientCommands.RunDoctor;
          const isReload = params.command === ClientCommands.ReloadDoctor;
          if (isRun || (doctor && isReload)) {
            const html = params.arguments && params.arguments[0];
            if (typeof html === "string") {
              const panel = getDoctorPanel(isReload);
              panel.webview.html = html;
            }
          }
          break;
        }
        case ClientCommands.FocusDiagnostics:
          commands.executeCommand(ClientCommands.FocusDiagnostics);
          break;
        default:
          outputChannel.appendLine(`unknown command: ${params.command}`);
      }

      // Ignore other commands since they are less important.
    }
  );
  context.subscriptions.push(disposable);
}
