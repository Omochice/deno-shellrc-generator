import { err, ok, Result } from "./deps.ts";
import type { Schema, Shell as ShellType } from "./schema.ts";

export type Converter = {
  ifExecutable: (command: string, executeCommand: string) => string;
  ifExists: (path: string, executeCommand: string) => string;
  source: (path: string) => string;
  alias: (from: string, to: string) => string;
  environment: (from: string, to: string) => string;
  path: (path: string) => string;
  evaluate: (command: string) => string;
};

const bash: Converter = {
  ifExecutable: (command: string, executeCommand: string) =>
    `command -v ${command} >/dev/null 2>&1 && ${executeCommand}`,
  ifExists: (path: string, executeCommand: string) =>
    `[ -e ${path} ] && ${executeCommand}`,
  source: (path: string) => `source ${path}`,
  alias: (from: string, to: string) => `alias ${to} ${from}`,
  environment: (from: string, to: string) => `export ${to}=${from}`,
  path: (path: string) => `export PATH=${path}:\$PATH`,
  evaluate: (command: string) => command,
};

const zsh: Converter = { ...bash };

const fish: Converter = {
  ...bash,
  ifExists: (path: string, executeCommand: string) =>
    `test -e ${path} && ${executeCommand}`,
  alias: (from: string, to: string) => `alias ${to} "${from}"`,
  environment: (from: string, to: string) =>
    `set --export --unpath ${to} ${from}`,
  path: (path: string) => `set --path PATH \$PATH ${path}`,
  evaluate: (command: string) => command,
};

export function getShell(shell: ShellType): Result<Converter, Error> {
  switch (shell) {
    case "bash":
      return ok(bash);
    case "zsh":
      return ok(zsh);
    case "fish":
      return ok(fish);
    default:
      return err(
        new Error(`This statement must be unreachable. got: ${shell}`),
      );
  }
}
