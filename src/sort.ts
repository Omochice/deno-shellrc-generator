import { Queue } from "https://deno.land/x/yocto_queue@v0.1.4/mod.ts";

function transform<T extends GraphNode>(
  graph: T[],
): (HasIndegree & T)[] {
  const transformed = graph.map((e) => ({ ...e, indegree: 0 }));
  for (const { to } of graph) {
    if (to === undefined) {
      continue;
    }
    for (const t of to) {
      transformed[t].indegree += 1;
    }
  }
  return transformed;
}

export function* topologicalSortIter<T extends GraphNode>(
  graph: T[],
): Generator<T> {
  const transformed = transform(graph)
    .map((e) => ({
      ...e,
      indegree: e.indegree + 1,
    }));

  const dummyNode: GraphNode & HasIndegree = {
    indegree: 0,
    to: new Array(graph.length)
      .fill(undefined)
      .map((
        _: unknown,
        idx: number,
      ) => idx),
  };

  const queue = new Queue<HasIndegree & GraphNode>();
  queue.enqueue(dummyNode);

  while (queue.size > 0) {
    const current = queue.dequeue();
    if (current === undefined) {
      throw new Error("now is undefined");
    }

    for (const t of current.to ?? []) {
      const indegree = transformed[t].indegree - 1;
      transformed[t].indegree = indegree;
      if (indegree === 0) {
        queue.enqueue(transformed[t]);
        yield graph[t];
      }
    }
  }
}

export function topologicalSort<T extends GraphNode>(graph: T[]): T[] {
  return Array.from(topologicalSortIter(graph));
}

export interface GraphNode {
  to?: number[];
}

interface HasIndegree {
  indegree: number;
}
