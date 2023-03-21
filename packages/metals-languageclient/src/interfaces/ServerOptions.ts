interface Executable {
  command: string;
  args?: string[];
  options?: { env?: typeof process.env };
}

export interface ServerOptions {
  run: Executable;
  debug: Executable;
}
