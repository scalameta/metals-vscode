import { RequestType } from "vscode-languageserver-protocol";

/**
 * The Metals slow task request is sent from the server to the client to notify
 * the start of a long running process with unknown estimated total time.
 * A cancel: true response from the client cancels the task. A $/cancelRequest
 * request from the server indicates that the task has completed.
 *
 * - https://scalameta.org/metals/docs/editors/new-editor.html#metalsslowtask
 */
export namespace MetalsSlowTask {
  export const type = new RequestType<
    MetalsSlowTaskParams,
    MetalsSlowTaskResult,
    void,
    void
  >("metals/slowTask");
}

export interface MetalsSlowTaskParams {
  /** The name of this slow task */
  message: string;
  /**
   * If true, the log output from this task does not need to be displayed to the user.
   *
   * In VS Code, the Metals "Output channel" is not toggled when this flag is true.
   */
  quietLogs?: boolean;
  /** Time that has elapsed since the begging of the task. */
  secondsElapsed?: number;
}

export interface MetalsSlowTaskResult {
  /**
   * If true, cancel the running task.
   * If false, the user dismissed the dialogue but want to
   * continue running the task.
   */
  cancel: boolean;
}
