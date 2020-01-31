declare module "mkdirp" {
  function mkdirp(dir: string): Promise<string | null>;
  export = mkdirp;
}
