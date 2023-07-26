import { assert } from "https://deno.land/std@0.196.0/testing/asserts.ts";
import { topologicalSort } from "./sort.ts";

Deno.test("topologicalSort", async (t) => {
  await t.step("All of tasks are isolated, It will be by the order", () => {
    const tasks = [
      { to: [], expect: 0 },
      { to: [], expect: 1 },
      { to: [], expect: 2 },
    ];
    assert(topologicalSort(tasks).map((v, i) => v.expect === i));
  });

  await t.step("Depend", () => {
    const tasks = [
      { to: [], expect: 2 },
      { to: [0], expect: 1 },
      { to: [1], expect: 0 },
    ];
    assert(topologicalSort(tasks).map((v, i) => v.expect === i));
  });

  await t.step("Include circly, will remove their", () => {
    const tasks = [
      { to: [2], expect: undefined },
      { to: [0], expect: undefined },
      { to: [1], expect: undefined },
      { to: [], expect: 0 },
    ];
    assert(
      topologicalSort(tasks).map((v, i) =>
        v.expect !== undefined && v.expect === i
      ),
    );
  });

  await t.step("Forked", () => {
    const tasks = [
      { to: [1, 2], expect: 0 },
      { to: [3], expect: [1, 2] },
      { to: [3], expect: [1, 2] },
      { to: [], expect: [3] },
    ];
    assert(
      topologicalSort(tasks).map((v, i) => {
        if (Array.isArray(v.expect)) {
          return v.expect.includes(i);
        }
        v.expect === i;
      }),
    );
  });
});
