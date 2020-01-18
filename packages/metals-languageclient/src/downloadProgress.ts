import { ChildProcessPromise } from "promisify-child-process";

interface DownlodProgressParams {
  download: ChildProcessPromise;
  onProgress: (msg: string) => void;
  onComplete?: () => void;
  onError: (stdout: Buffer[]) => void;
}

export function downloadProgress({
  download,
  onProgress,
  onComplete,
  onError
}: DownlodProgressParams): Promise<string> {
  let stdout: Buffer[] = [];
  download.stdout?.on("data", (out: Buffer) => {
    onProgress(out.toString());
    stdout.push(out);
  });
  download.stderr?.on("data", (err: Buffer) => {
    const msg = err.toString().trim();
    if (msg.startsWith("Downloaded") || msg.startsWith("Downloading")) {
      onProgress(msg);
    }
  });
  download.on("close", (code: number) => {
    if (code != 0) {
      onError(stdout);
      throw new Error(`Coursier exit: ${code}`);
    }
  });
  return download.then(() => {
    onComplete && onComplete();
    return stdout.map(buffer => buffer.toString().trim()).join("");
  });
}
