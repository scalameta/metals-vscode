import {
  RequestType,
  RequestType0,
  CancellationToken,
  NotificationType0,
  NotificationType,
} from "vscode-languageserver-protocol";

export interface LanguageClient {
  sendRequest<R, E>(
    type: RequestType0<R, E>,
    token?: CancellationToken
  ): Thenable<R>;
  sendRequest<P, R, E, RO>(
    type: RequestType<P, R, E>,
    params: P,
    token?: CancellationToken
  ): Thenable<R>;
  sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
  sendRequest<R>(
    method: string,
    param: any,
    token?: CancellationToken
  ): Thenable<R>;
  sendNotification(type: NotificationType0): void;
  sendNotification<P>(type: NotificationType<P>, params?: P): void;
  sendNotification(method: string): void;
  sendNotification(method: string, params: any): void;
}
