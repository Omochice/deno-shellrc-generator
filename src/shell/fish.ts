import type { Converter } from "./type.ts";
import { bash } from "./bash.ts";

export const fish: Converter = {
  ...bash,
  ifExists: (path: string, executeCommand: string) =>
    `test -e ${path} && ${executeCommand}`,
  alias: (from: string, to: string) => `alias ${to} "${from}"`,
  environment: (from: string, to: string) =>
    `set --export --unpath ${to} ${from}`,
  path: (path: string) => `set --path PATH \$PATH ${path}`,
  evaluate: (command: string) => command,
} as const;
