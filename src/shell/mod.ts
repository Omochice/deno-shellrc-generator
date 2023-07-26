import { err, ok, Result } from "npm:neverthrow@6.0.1-0";
import { bash } from "./bash.ts";
import { zsh } from "./zsh.ts";
import { fish } from "./fish.ts";
import { Converter } from "./type.ts";

const s = {
  bash,
  zsh,
  fish,
} as const;

export type ShellName = keyof typeof s;

export const SupportedShells = Object.keys(s) as ShellName[];

export const shell = new Map(Object.entries(s));

export function getShell(shellName: string): Result<Converter, Error> {
  if (shell.has(shellName)) {
    return ok(shell.get(shellName)!);
  }
  return err(new Error(`${shellName} is not supported`));
}
