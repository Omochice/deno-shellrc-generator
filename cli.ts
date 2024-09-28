import { err, ok, Result } from "npm:neverthrow@8.0.0";
import { basename } from "jsr:@std/path@1.0.6";
import { Command, EnumType } from "jsr:@cliffy/command@1.0.0-rc.5";
import { ShellName, SupportedShells } from "./src/shell/mod.ts";
import { loadConfigure } from "./src/toml.ts";
import { generate } from "./src/generate.ts";

const shellType = new EnumType<ShellName>(SupportedShells);

async function main(): Promise<Result<string, Error>> {
  const thisFile = basename(import.meta.url);
  const { options, args } = await new Command()
    .name(thisFile)
    .type("shell", shellType)
    .arguments("<files...>")
    .option(
      "--shell, <shell:shell>",
      "shell name that used to convert configure files.",
      {
        required: true,
      },
    )
    .option("--out <out:string>", "output filename")
    .parse(Deno.args);

  const tomlResult = await loadConfigure(args);
  if (tomlResult.isErr()) {
    return err(tomlResult.error);
  }

  const generateResult = await generate(tomlResult.value, options.shell);
  if (generateResult.isErr()) {
    return err(generateResult.error);
  }

  if (options.out) {
    Deno.writeTextFileSync(options.out, generateResult.value);
    return ok("");
  }
  return ok(generateResult.value);
}

if (import.meta.main) {
  const result = await main();
  if (result.isErr()) {
    console.error(result.error.message);
    Deno.exit(1);
  }

  console.log(result.value);
}
