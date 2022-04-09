import { TaskEither } from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/lib/Either";

export function toPromise<E, A>(te: TaskEither<E, A>): Promise<A> {
  return te().then(
    (res) =>
      new Promise((resolve, reject) => pipe(res, E.fold(reject, resolve)))
  );
}
