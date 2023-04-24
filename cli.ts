import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { basename } from "https://deno.land/std@0.157.0/path/mod.ts";
import { err, ok, Result } from "npm:neverthrow@6.0.0";
import { parse } from "https://deno.land/std@0.157.0/flags/mod.ts";
import { loadConfigure } from "./toml.ts";
import { generate } from "./generate.ts";
import { shell as supportedShell } from "./schema.ts";

const argumentSchema = z.object({
  _: z.array(z.string()),
  help: z.boolean(),
  shell: supportedShell,
});

type Schema = z.infer<typeof argumentSchema>;

const defaultShell = Deno.env.get("SHELL");

function parseArgs(args: string[]): Result<Schema, unknown> {
  const parseResult = argumentSchema.safeParse(
    parse(args, {
      default: {
        help: false,
        shell: defaultShell,
      },
      boolean: ["help"],
      alias: { h: "help" },
    }),
  );

  if (!parseResult.success) {
    console.log();
    return err(new Error(parseResult.error.toString()));
  }

  if (parseResult.data.help) {
    const thisFile = basename(import.meta.url);
    const helpMessage = `
${thisFile} - Commandline minutes generator for me

[USASE]
\t${thisFile} template... [OPTIONS]

[ARGUMENTS]
\ttemplate: Path to template, it must TOML format.

[OPTIONS]
\t--shell: shell type. default: ${defaultShell}
\t--help -h: Show this message.
`;
    // return err(new Error(helpMessage));
    return err(helpMessage);
  }

  if (parseResult.data._.length === 0) {
    return err(new Error("argument must has any"));
  }
  return ok(parseResult.data);
}

async function main(): Promise<Result<string, unknown>> {
  // NOTE: parse arguments
  const arg = parseArgs(Deno.args);
  if (arg.isErr()) {
    return err(arg.error);
  }
  // NOTE: parse TOML
  const tomlResult = await loadConfigure(arg.value._);
  if (tomlResult.isErr()) {
    return err(tomlResult.error);
  }
  // NOTE: generate rc body
  return generate(tomlResult.value, arg.value.shell);
}

const result = await main();
if (result.isErr()) {
  console.error(result.error);
  Deno.exit(2);
} else {
  console.log(result.value);
}

