import {
  RequestType,
  RequestType0,
  CancellationToken,
  NotificationType0,
  NotificationType,
} from "vscode-languageserver-protocol";

export interface LanguageClient {
  sendRequest<R, E, RO>(
    type: RequestType0<R, E, RO>,
    token?: CancellationToken
  ): Thenable<R>;
  sendRequest<P, R, E, RO>(
    type: RequestType<P, R, E, RO>,
    params: P,
    token?: CancellationToken
  ): Thenable<R>;
  sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
  sendRequest<R>(
    method: string,
    param: any,
    token?: CancellationToken
  ): Thenable<R>;
  sendNotification<RO>(type: NotificationType0<RO>): void;
  sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
  sendNotification(method: string): void;
  sendNotification(method: string, params: any): void;
}
