import type { Converter } from "./type.ts";

export const bash: Converter = {
  ifExecutable: (command: string, executeCommand: string) =>
    `command -v ${command} >/dev/null 2>&1 && ${executeCommand}`,
  ifExists: (path: string, executeCommand: string) =>
    `[ -e ${path} ] && ${executeCommand}`,
  source: (path: string) => `source ${path}`,
  alias: (from: string, to: string) => `alias ${to} ${from}`,
  environment: (from: string, to: string) => `export ${to}=${from}`,
  path: (path: string) => `export PATH=${path}:\$PATH`,
  evaluate: (command: string) => command,
} as const;
