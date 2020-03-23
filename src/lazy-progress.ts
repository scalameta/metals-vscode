import { OutputChannel, window, ProgressLocation } from "vscode";

"use strict";

/**
 * A progress bar that starts only the first time `startOrContinue` is called.
 */
export class LazyProgress {
  private progress: Thenable<void> | undefined;
  startOrContinue(
    title: string,
    output: OutputChannel,
    download: Promise<any>
  ): void {
    if (!this.progress) {
      this.progress = window.withProgress(
        { location: ProgressLocation.Notification, title: title },
        (p) =>
          new Promise((resolve) => {
            output.show();
            function complete() {
              p.report({ increment: 100 });
              setTimeout(() => {
                resolve();
              }, 2000);
            }
            download
              .then(() => {
                /// Hide the output channel on success but keep it open on error.
                output.hide();
              })
              .then(complete, complete);
          })
      );
    }
  }
}
