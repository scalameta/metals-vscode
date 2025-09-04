import { ChildProcessPromise } from "promisify-child-process";

interface DownlodProgressParams {
  download: ChildProcessPromise;
  onProgress: (msg: string) => void;
  onComplete?: () => void;
  onError: (stdout: Buffer[]) => void;
}

/**
 * Utility to track the progress of a running download
 */
export function downloadProgress({
  download,
  onProgress,
  onComplete,
  onError,
}: DownlodProgressParams): Promise<string> {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  download.stdout?.on("data", (out: Buffer) => {
    stdout.push(out);
  });
  download.stderr?.on("data", (err: Buffer) => {
    const msg = err.toString().trim();
    stderr.push(err);
    if (msg.startsWith("Downloaded") || msg.startsWith("Downloading")) {
      onProgress(msg);
    }
  });
  download.on("close", (code: number) => {
    if (code != 0) {
      onError(stderr);
      throw new Error(`Coursier exit: ${code}`);
    }
  });
  return download.then(() => {
    if (onComplete) {
      onComplete();
    }
    return stdout.map((buffer) => buffer.toString().trim()).join("");
  });
}
