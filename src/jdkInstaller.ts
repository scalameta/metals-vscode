import * as path from "path";
import * as request from "request";
import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as pcp from "promisify-child-process";
import { OutputChannel } from "vscode";

export class JdkInstaller {
  out: OutputChannel;

  homedir = require("os").homedir();
  bin = path.join(this.homedir, "bin");

  constructor(out: OutputChannel) {
    this.out = out;
  }

  installJava(javaVersion: string, jabbaVersion: string) {
    const jabbaUrl = `https://github.com/shyiko/jabba/releases/download/${jabbaVersion}/jabba-${jabbaVersion}-${this.jabbaUrlSuffix()}`;
    const jabba = path.join(this.bin, this.jabbaName());
    return new Promise<void>((res, rej) => {
      mkdirp(this.bin, (err, made) => {
        if (err) {
          const msg = `${err} ${made}`;
          console.log(msg);
          this.out.appendLine(msg);
          rej(err);
        } else res();
      });
    }).then(() =>
      this.curl(jabbaUrl, jabba, true)
        .then(pth => pcp.exec(`${jabba} ls-remote`))
        .then(out =>
          this.outputToString(out.stdout)
            .split("\n")
            .filter((str, i, arr) => str.includes(javaVersion))[0]
            .trim()
        )
        .then(java => {
          this.out.appendLine(`Installing ${java}`);
          const jabbaSpawn = pcp.spawn(`${jabba}`, ["install", java], {});
          jabbaSpawn.stdout.on("data", this.out.append);
          jabbaSpawn.stderr.on("data", this.out.append);

          return jabbaSpawn
            .then(() => this.out.appendLine(`${java} installed`))
            .then(() => pcp.exec(`${jabba} which --home ${java}`))
            .then((e: pcp.Output) => this.outputToString(e.stdout).trim());
        })
    );
  }

  private jabbaUrlSuffix(): string {
    const runnerOs = process.platform;
    switch (runnerOs.toLowerCase()) {
      case "linux":
        return "linux-amd64";
      case "darwin":
        return "darwin-amd64";
      case "win32":
        return "windows-amd64.exe";
      default:
        throw new Error(
          `unknown runner OS: ${runnerOs}, expected one of Linux, macOS or Windows.`
        );
    }
  }

  private isWindows(): boolean {
    return process.platform === "win32";
  }

  private jabbaName(): string {
    if (this.isWindows()) return "jabba.exe";
    else return "jabba";
  }

  private curl(url: string, outputFile: string, exec?: boolean) {
    return new Promise<string>((res, rej) => {
      request
        .get(url)
        .pipe(fs.createWriteStream(outputFile))
        .on("close", () => {
          if (exec) fs.chmodSync(outputFile, 755);
          res(outputFile);
        })
        .on("error", err => rej(err));
    });
  }

  private outputToString(
    out: Buffer | string | null | undefined,
    enc: string = "utf-8"
  ) {
    return out instanceof Buffer ? out.toString(enc) : out ? <string>out : "";
  }
}
