import type {
  Alias,
  Environment,
  Execute,
  Path,
  Schema,
  Shell,
  Source,
} from "./schema.ts";
import { Converter } from "./shell/type.ts";
import { getShell } from "./shell/mod.ts";
import { err, ok, Result } from "npm:neverthrow@8.0.0";
import { GraphNode, topologicalSort } from "./sort.ts";
import { isWsl } from "https://deno.land/x/is_wsl@v1.1.0/mod.ts";

export async function generate(
  configure: Schema,
  shell: Shell,
): Promise<Result<string, Error>> {
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

  const os = (await isWsl()) ? "wsl" : Deno.build.os;

  const filtered = convertResult
    .filter((
      e: Execute,
    ) => (
      e.shell == null ||
      e.shell === shell ||
      e.shell.includes(shell)
    ))
    .filter((e: Execute) => (
      e.arch == null ||
      e.arch === Deno.build.arch ||
      e.arch.includes(Deno.build.arch)
    ))
    .filter((e: Execute) => (
      e.os == null ||
      e.os === os ||
      e.os.includes(os)
    ))
    .map((e: Execute) => normalizeIf(e, converter))
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
): Execute[] {
  return [
    ...configure.executes ?? [],
    ...sourceToEval(converter, configure.sources ?? []),
    ...aliasToEval(converter, configure.aliases ?? []),
    ...environmentToEval(converter, configure.environments ?? []),
    ...pathToEval(converter, configure.paths ?? []),
  ];
}

function sourceToEval(converter: Converter, sources: Source[]): Execute[] {
  return sources.map((s: Source) => ({
    ...s,
    command: converter.source(s.path),
  }));
}
function aliasToEval(converter: Converter, aliases: Alias[]): Execute[] {
  return aliases.map((a: Alias) => ({
    ...a,
    command: converter.alias(a.from, a.to),
  }));
}
function environmentToEval(
  converter: Converter,
  environments: Environment[],
): Execute[] {
  return environments.map((e: Environment) => ({
    ...e,
    command: converter.environment(e.from, e.to),
  }));
}
function pathToEval(converter: Converter, paths: Path[]): Execute[] {
  return paths.map((p: Path) => ({
    ...p,
    command: converter.path(p.path),
  }));
}

function normalizeDepends(
  evaluate: Execute,
): Execute & { depends: string[] } {
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
  evaluate: Execute,
  converter: Converter,
): Execute {
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

function normalizeLabel(evaluate: Execute): Execute & { label: string } {
  const label = evaluate.label ?? "";
  return {
    ...evaluate,
    label,
  };
}

function convertToGraphNode(nodes: Execute[]): (Execute & GraphNode)[] {
  return nodes.map((e: Execute) => {
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
