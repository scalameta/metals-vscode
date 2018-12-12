declare module "find-java-home" {
  interface Options {
    allowJre: boolean;
  }

  function findJavaHome(
    options: Options,
    cb: (e: string | undefined, javaHome: string | undefined) => void
  );

  function findJavaHome(
    cb: (e: string | undefined, javaHome: string | undefined) => void
  );

  export = findJavaHome;
}
