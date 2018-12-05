import { OutputChannel, window, ProgressLocation } from "vscode";

"use strict";

/**
 * A progress bar that starts only the first time `startOrContinue` is called.
 */
export class LazyProgress {
  private progress;
  startOrContinue(
    title: string,
    output: OutputChannel,
    download: Promise<any>
  ): void {
    if (!this.progress) {
      this.progress = window.withProgress(
        { location: ProgressLocation.Notification, title: title },
        p =>
          new Promise(resolve => {
            output.show();
            function complete() {
              p.report({ increment: 100 });
              setTimeout(() => {
                resolve();
              }, 2000);
            }
            download.then(() => {
              output.hide();
              complete();
            }, complete);
          })
      );
    }
  }
}
