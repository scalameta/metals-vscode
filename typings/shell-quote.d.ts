declare module "shell-quote" {
  export function quote(s: string[]): string;
  export function parse(s: string): string[];
}
