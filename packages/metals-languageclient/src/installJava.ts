import * as path from "path";
import fetch from "node-fetch";
import * as fs from "fs";
import mkdirp = require("mkdirp");
import * as pcp from "promisify-child-process";
import * as os from "os";
import { promisify } from "util";
import { pipeline } from "stream";
import { OutputChannel } from "./interfaces/OutputChannel";

const defaultJabbaVersion = "0.11.2";

type JavaVersion = "adopt@1.8" | "adopt@1.11";

interface InstallJavaOptions {
  javaVersion: JavaVersion;
  jabbaVersion?: string;
  outputChannel: OutputChannel;
}

export function installJava({
  javaVersion,
  jabbaVersion = defaultJabbaVersion,
  outputChannel
}: InstallJavaOptions): Promise<string> {
  const bin = path.join(os.homedir(), "bin");

  const jabbaUrl = `https://github.com/shyiko/jabba/releases/download/${jabbaVersion}/jabba-${jabbaVersion}-${jabbaUrlSuffix()}`;
  const jabbaPath = path.join(bin, jabbaBinaryName());

  return mkdirp(bin)
    .catch((err: Error) => {
      console.debug(err);
      outputChannel.appendLine(err.message);
    })
    .then(() =>
      download({ url: jabbaUrl, outputPath: jabbaPath, makeExecutable: true })
    )
    .then(() => pcp.exec(`${jabbaPath} ls-remote`))
    .then(out =>
      outputToString(out.stdout)
        .split("\n")
        .filter(str => str.includes(javaVersion))[0]
        .trim()
    )
    .then(java => {
      outputChannel.appendLine(`Installing ${java}`);
      const jabbaSpawn = pcp.spawn(`${jabbaPath}`, ["install", java], {});
      jabbaSpawn.stdout?.on("data", outputChannel.append);
      jabbaSpawn.stderr?.on("data", outputChannel.append);

      return jabbaSpawn
        .then(() => outputChannel.appendLine(`${java} installed`))
        .then(() => pcp.exec(`${jabbaPath} which --home ${java}`))
        .then((e: pcp.Output) => outputToString(e.stdout).trim());
    });
}

function jabbaUrlSuffix(): string {
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

function jabbaBinaryName(): string {
  const isWindows = process.platform === "win32";
  if (isWindows) return "jabba.exe";
  else return "jabba";
}

function download({
  url,
  outputPath: outputFile,
  makeExecutable: exec
}: {
  url: string;
  outputPath: string;
  makeExecutable?: boolean;
}): Promise<string> {
  return fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error while downloading Java from ${url}`);
      }
      return promisify(pipeline)(
        response.body,
        fs.createWriteStream(outputFile).on("close", () => {
          if (exec) fs.chmodSync(outputFile, 755);
        })
      );
    })
    .then(() => outputFile);
}

function outputToString(
  out: Buffer | string | null | undefined,
  enc: string = "utf8"
): string {
  return out instanceof Buffer ? out.toString(enc) : out ? <string>out : "";
}
