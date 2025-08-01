// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getPrdTaskStats } from "../../src/helpers/prdTaskStats.js";

describe("getPrdTaskStats", () => {
  it("counts total and completed tasks", () => {
    const md = `## Tasks\n- [x] task1\n  - [ ] subtask\n- [ ] task2`;
    const stats = getPrdTaskStats(md);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
  });

  it("handles missing section", () => {
    const stats = getPrdTaskStats("No tasks here");
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
  });
});
