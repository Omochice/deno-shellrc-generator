import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";

// NOTE: from Deno.build.os + "wsl"
const os = z.union([
  z.literal("darwin"),
  z.literal("linux"),
  z.literal("windows"),
  z.literal("freebsd"),
  z.literal("netbsd"),
  z.literal("aix"),
  z.literal("solaris"),
  z.literal("illumos"),
  z.literal("wsl"),
]);

export const shell = z.union([
  z.literal("bash"),
  z.literal("zsh"),
  z.literal("fish"),
]);

export type Shell = z.infer<typeof shell>;

// NOTE: from Deno.build.arch
const arch = z.union([
  z.literal("x86_64"),
  z.literal("aarch64"),
]);

const option = z.object({
  os: z.optional(z.union([os, z.array(os)])),
  arch: z.optional(z.union([arch, z.array(arch)])),
  shell: z.optional(z.union([shell, z.array(shell)])),
  if_executable: z.optional(z.string()),
  if_exists: z.optional(z.string()),
  label: z.optional(z.string()),
  depends: z.optional(z.union([z.string(), z.array(z.string())])),
});

const path = option.merge(z.object({
  path: z.string(),
}));
export type Path = z.infer<typeof path>;

const environment = option.merge(z.object({
  from: z.string(),
  to: z.string(),
}));
export type Environment = z.infer<typeof environment>;

const alias = option.merge(z.object({
  from: z.string(),
  to: z.string(),
}));
export type Alias = z.infer<typeof alias>;

const source = option.merge(z.object({
  path: z.string(),
}));
export type Source = z.infer<typeof source>;

export const evaluate = option.merge(z.object({
  command: z.string(),
}));
export type Evaluate = z.infer<typeof evaluate>;

export const schema = z.object({
  paths: z.optional(z.array(path)),
  environments: z.optional(z.array(environment)),
  aliases: z.optional(z.array(alias)),
  sources: z.optional(z.array(source)),
  evaluates: z.optional(z.array(evaluate)),
});
export type Schema = z.infer<typeof schema>;
