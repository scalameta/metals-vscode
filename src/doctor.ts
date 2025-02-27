import path from "path";
import {
  ExtensionContext,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import {
  Disposable,
  ExecuteCommandParams,
  ExecuteCommandRequest,
  LanguageClient,
  NotificationType,
} from "vscode-languageclient/node";
import { ClientCommands } from "./interfaces/ClientCommands";
import { ServerCommands } from "./interfaces/ServerCommands";

export interface DoctorVisibilityDidChangeParams {
  visible: boolean;
}

const doctorEndpoint = "metals/doctorVisibilityDidChange";
const doctorNotification =
  new NotificationType<DoctorVisibilityDidChangeParams>(doctorEndpoint);

export class DoctorProvider implements Disposable {
  doctor: WebviewPanel | undefined;
  /**
   * Although in protocol there is `visible`, currently in vscode, we are cheating a little bit.
   * We treat doctor to be visible if webview is opened, no matter if it is focused or not.
   * We should take focus into account when doctor caching mechanism will be implemented on the server.
   */
  isOpened = false;
  // private extensionContext: ExtensionContext | undefined;
  constructor(
    private client: LanguageClient,
    private context: ExtensionContext
  ) {}

  dispose(): void {
    this.doctor?.dispose();
  }

  private getDoctorPanel(isReload: boolean): WebviewPanel {
    if (!this.doctor) {
      this.doctor = window.createWebviewPanel(
        "metals-doctor",
        "Metals Doctor",
        ViewColumn.Active,
        { enableCommandUris: true }
      );
      this.doctor.iconPath = Uri.file(
        path.join(this.context.extensionPath, "icons", "doctor.svg")
      );
      this.isOpened = true;

      this.doctor.onDidDispose(() => {
        this.client.sendNotification(doctorNotification, { visible: false });
        this.isOpened = false;
        this.doctor = undefined;
      });
    } else if (!isReload) {
      this.doctor.reveal();
    }
    return this.doctor;
  }

  reloadOrRefreshDoctor(params: ExecuteCommandParams): void {
    const isRun = params.command === ClientCommands.RunDoctor;
    const isReload = params.command === ClientCommands.ReloadDoctor;
    if (isRun || (this.doctor && isReload)) {
      const html = params.arguments && params.arguments[0];
      if (typeof html === "string") {
        const panel = this.getDoctorPanel(isReload);
        panel.webview.html = html;
      }
    }
  }

  async runDoctor(): Promise<void> {
    await this.client.sendRequest(ExecuteCommandRequest.type, {
      command: ServerCommands.DoctorRun,
    });
    this.isOpened = true;
  }
}
