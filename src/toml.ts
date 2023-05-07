import { parse } from "https://deno.land/std@0.184.0/toml/parse.ts";
import { deepMerge } from "https://deno.land/std@0.184.0/collections/deep_merge.ts";
import { schema } from "./schema.ts";
import type { Schema } from "./schema.ts";
import { err, ok, Result } from "./deps.ts";

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
): Promise<Result<Schema, unknown>> {
  return await Promise.all(paths.map((p) => loadToml(p)))
    .then((value) => {
      return value.reduce((prev, curr) => deepMerge(prev, curr));
    })
    .then((merged) => {
      return ok(schema.parse(merged));
    })
    .catch((e: unknown) => {
      return err(e);
    });
}
