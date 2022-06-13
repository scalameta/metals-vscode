export type Either<Left, Right> =
  | { kind: "left"; value: Left }
  | { kind: "right"; value: Right };

export function makeLeft<T>(t: T): Either<T, never> {
  return { kind: "left", value: t };
}

export function makeRight<T>(t: T): Either<never, T> {
  return { kind: "right", value: t };
}
