import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { Queue } from "https://deno.land/x/yocto_queue@v0.1.4/mod.ts";
import type {
  Alias,
  Environment,
  Evaluate,
  Path,
  Schema,
  Shell,
  Source,
} from "./schema.ts";
import { Converter, getShell } from "./shell.ts";
import { err, ok, Result } from "./deps.ts";

export function generate(
  configure: Schema,
  shell: Shell,
): Result<string, unknown> {
  /*
   * NOTE: steps
   * - transform other to evaluate
   * - filter by shell
   * - process by queue
   */
  const r = getShell(shell);
  if (r.isErr()) {
    return err(r.error);
  }
  const converter = r.value;
  const convertResult = convertToEvals(configure, converter);

  const filtered = convertResult.filter((
    evaluate: Evaluate,
  ) => (
    evaluate.shell == null ||
    evaluate.shell === shell ||
    evaluate.shell.includes(shell)
  ));

  const dumped: string[] = [];
  const dumpedLabels: Set<string> = new Set([""]);
  const queue = new Queue<Evaluate>();
  queue.enqueue(
    ...filtered
      .map(normalizeDepends)
      .map((e) => normalizeIf(e, converter))
      .map(normalizeLabel),
  );
  while (queue.size > 1) {
    let dumpledByCurrentIter = 0;
    for (let _ = 0; _ < queue.size; _++) {
      const popped = queue.dequeue();
      if (popped === undefined) {
        break;
      }

      const dependsParseResult = z.string().array().safeParse(popped.depends);
      if (!dependsParseResult.success) {
        return err(dependsParseResult.error);
      }

      const depends = dependsParseResult.data;
      if (!depends.every((d) => dumpedLabels.has(d))) {
        queue.enqueue(popped);
        continue;
      }
      const labelParseResult = z.string().safeParse(popped.label);
      if (!labelParseResult.success) {
        return err(labelParseResult.error);
      }
      const label = labelParseResult.data;
      dumpedLabels.add(label);
      dumped.push(popped.command);
      dumpledByCurrentIter += 1;
    }
    if (dumpledByCurrentIter === 0) {
      return err(new Error("Too recursivery"));
    }
  }
  // return dumped
  return ok(dumped.join("\n"));
}

function convertToEvals(
  configure: Schema,
  converter: Converter,
): Evaluate[] {
  return [
    ...configure.evaluates ?? [],
    ...sourceToEval(converter, configure.sources ?? []),
    ...aliasToEval(converter, configure.aliases ?? []),
    ...environmentToEval(converter, configure.environments ?? []),
    ...pathToEval(converter, configure.paths ?? []),
  ];
}

function sourceToEval(converter: Converter, sources: Source[]): Evaluate[] {
  return sources.map((s: Source) => ({
    ...s,
    command: converter.source(s.path),
  }));
}
function aliasToEval(converter: Converter, aliases: Alias[]): Evaluate[] {
  return aliases.map((a: Alias) => ({
    ...a,
    command: converter.alias(a.from, a.to),
  }));
}
function environmentToEval(
  converter: Converter,
  environments: Environment[],
): Evaluate[] {
  return environments.map((e: Environment) => ({
    ...e,
    command: converter.environment(e.from, e.to),
  }));
}
function pathToEval(converter: Converter, paths: Path[]): Evaluate[] {
  return paths.map((p: Path) => ({
    ...p,
    command: converter.path(p.path),
  }));
}

function normalizeDepends(
  evaluate: Evaluate,
): Evaluate & { depends: string[] } {
  return {
    ...evaluate,
    depends: evaluate.depends == null
      ? [""]
      : Array.isArray(evaluate.depends)
      ? evaluate.depends
      : [evaluate.depends],
  };
}

function normalizeIf(
  evaluate: Evaluate,
  converter: Converter,
): Evaluate {
  let command = evaluate.command;
  if (evaluate.if_executable != null) {
    command = converter.ifExecutable(evaluate.if_executable, command);
  }
  if (evaluate.if_exists != null) {
    command = converter.ifExists(evaluate.if_exists, command);
  }
  return {
    ...evaluate,
    command,
  };
}

function normalizeLabel(evaluate: Evaluate): Evaluate & { label: string } {
  const label = evaluate.label ?? "";
  return {
    ...evaluate,
    label,
  };
}
