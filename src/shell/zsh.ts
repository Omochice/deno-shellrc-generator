import type { Converter } from "./type.ts";
import { bash } from "./bash.ts";

export const zsh: Converter = {
  ...bash,
} as const;
