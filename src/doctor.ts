import { ClientCommands, ServerCommands } from "metals-languageclient";
import { ViewColumn, WebviewPanel, window } from "vscode";
import {
  Disposable,
  ExecuteCommandParams,
  ExecuteCommandRequest,
  LanguageClient,
  NotificationType,
} from "vscode-languageclient/node";

export interface DoctorVisibilityDidChangeParams {
  visible: boolean;
}

const doctorEndpoint = "metals/doctorVisibilityDidChange";
const doctorNotification =
  new NotificationType<DoctorVisibilityDidChangeParams>(doctorEndpoint);

export class DoctorProvider implements Disposable {
  doctor: WebviewPanel | undefined;
  isVisible = false;

  constructor(private client: LanguageClient) {}

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
      this.isVisible = true;

      this.doctor.onDidDispose(() => {
        this.client.sendNotification(doctorNotification, { visible: false });
        this.isVisible = false;
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
    this.isVisible = true;
  }
}
