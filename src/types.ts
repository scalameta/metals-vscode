import { newtype } from "./util";

export type Either<Left, Right> =
  | { kind: "left"; value: Left }
  | { kind: "right"; value: Right };

export function makeLeft<T>(t: T): Either<T, never> {
  return { kind: "left", value: t };
}

export function makeRight<T>(t: T): Either<never, T> {
  return { kind: "right", value: t };
}

export type TargetUri = newtype<string, "targetUri">;
export type FullyQualifiedClassName = newtype<
  string,
  "fullyQualifiedClassName"
>;

export interface BuildTargetIdentifier {
  uri: TargetUri;
}

export interface CompileResult {
  statusCode: BuildStatusCode;
}

export enum BuildStatusCode {
  Ok = 1,
  Error = 2,
  Cancelled = 3,
}
