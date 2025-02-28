import {
  RequestType0,
  CancellationToken,
  NotificationType0,
} from "vscode-languageserver-protocol";

export interface LanguageClient {
  sendRequest<R, E>(
    type: RequestType0<R, E>,
    token?: CancellationToken
  ): Thenable<R>;
  sendNotification(type: NotificationType0): void;
}
