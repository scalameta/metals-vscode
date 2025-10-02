import { TaskEither } from "fp-ts/TaskEither";
import { pipe } from "fp-ts/function";
import * as E from "fp-ts/Either";
import fs from "fs";
import * as path from "path";

export function toPromise<E, A>(te: TaskEither<E, A>): Promise<A> {
  return te().then(
    (res) =>
      new Promise((resolve, reject) => pipe(res, E.fold(reject, resolve))),
  );
}

export function findOnPath(names: string[]) {
  const envPath = process.env["PATH"] || process.env["Path"];
  const isWindows = process.platform === "win32";

  if (envPath) {
    const possibleExecutable = envPath
      .split(path.delimiter)
      .flatMap((p) => {
        try {
          if (fs.statSync(p).isDirectory()) {
            return fs.readdirSync(p).map((sub) => path.resolve(p, sub));
          } else {
            return [p];
          }
        } catch (_e) {
          return [];
        }
      })
      .find((p) => {
        if (isWindows) {
          return names.some(
            (name) =>
              p.endsWith(path.sep + name + ".bat") ||
              p.endsWith(path.sep + name + ".exe"),
          );
        } else {
          return names.some((name) => p.endsWith(path.sep + name));
        }
      });
    return possibleExecutable;
  }
}
