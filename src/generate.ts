import type {
  Alias,
  Environment,
  Evaluate,
  Path,
  Schema,
  Shell,
  Source,
} from "./schema.ts";
import { Converter } from "./shell/type.ts";
import { getShell } from "./shell/mod.ts";
import { err, ok, Result } from "npm:neverthrow@6.0.1-0";
import { GraphNode, topologicalSort } from "./sort.ts";

export function generate(
  configure: Schema,
  shell: Shell,
): Result<string, Error> {
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

  const filtered = convertResult
    .filter((
      e: Evaluate,
    ) => (
      e.shell == null ||
      e.shell === shell ||
      e.shell.includes(shell)
    ))
    .filter((e: Evaluate) => (
      e.arch == null ||
      e.arch === Deno.build.arch ||
      e.arch.includes(Deno.build.arch)
    ))
    .filter((e: Evaluate) => (
      e.os == null ||
      e.os === Deno.build.os ||
      e.os.includes(Deno.build.os)
    ))
    .map((e: Evaluate) => normalizeIf(e, converter))
    .map(normalizeDepends)
    .map(normalizeLabel);

  const sorted = topologicalSort(convertToGraphNode(filtered));
  if (sorted.length !== filtered.length) {
    return err(
      new Error("The configure file may includes circly dependencies"),
    );
  }
  return ok(sorted.map((e) => e.command).join("\n"));
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
      ? []
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

function convertToGraphNode(nodes: Evaluate[]): (Evaluate & GraphNode)[] {
  return nodes.map((e: Evaluate) => {
    if (e.label == null) {
      return {
        ...e,
        to: [],
      };
    }

    const to: number[] = [];
    for (const [idx, evaluate] of nodes.entries()) {
      if (evaluate.depends == null) continue;
      if (evaluate.depends === e.label) {
        to.push(idx);
        continue;
      }
      if (evaluate.depends.includes(e.label)) {
        to.push(idx);
        continue;
      }
    }
    return {
      ...e,
      to,
    };
  });
}
