import { parse } from "jsr:@std/toml@1.0.1/parse";
import { deepMerge } from "jsr:@std/collections@1.0.7/deep-merge";
import { schema } from "./schema.ts";
import type { Schema } from "./schema.ts";
import { err, ok, Result } from "npm:neverthrow@8.0.0";

/**
 * load toml file
 *
 * @param path path to toml file
 * @return loaded one
 */
async function loadToml(path: string): Promise<Record<string, unknown>> {
  return await Deno.readTextFile(path)
    .then((p) => parse(p));
}

export async function loadConfigure(
  paths: string[],
): Promise<Result<Schema, Error>> {
  return await Promise.all(paths.map((p) => loadToml(p)))
    .then((value) => {
      return value.reduce((prev, curr) => deepMerge(prev, curr));
    })
    .then((merged) => {
      return ok(schema.parse(merged));
    })
    .catch((e: unknown) => {
      return err(new Error("Error occured to load tomls", { cause: e }));
    });
}
