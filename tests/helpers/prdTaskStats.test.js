// @vitest-environment node
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getPrdTaskStats } from "../../src/helpers/prdTaskStats.js";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures");

describe("getPrdTaskStats", () => {
  it("counts total and completed tasks", () => {
    const md = `## Tasks\n- [x] task1\n  - [ ] subtask\n- [ ] task2`;
    const stats = getPrdTaskStats(md);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
  });

  it("parses nested task lists from PRD fixtures", () => {
    // Expected PRD task format: "## Tasks" heading with "- [ ]"/"- [x]" items.
    // See PRD authoring standards: design/productRequirementsDocuments/prdDevelopmentStandards.md#7-prd-authoring-standards-p2
    const md = fs.readFileSync(path.join(fixturesDir, "prdTooltipViewerExcerpt.md"), "utf-8");
    const stats = getPrdTaskStats(md);
    expect(stats.total).toBe(23);
    expect(stats.completed).toBe(23);
  });

  it("handles mixed heading levels in PRD excerpts", () => {
    const md = fs.readFileSync(
      path.join(fixturesDir, "prdDevelopmentStandardsExcerpt.md"),
      "utf-8"
    );
    const stats = getPrdTaskStats(md);
    expect(stats.total).toBe(7);
    expect(stats.completed).toBe(1);
  });

  it("ignores malformed checkbox syntax", () => {
    const md = `## Tasks\n- [x] valid\n- [] missing space\n- [x ] trailing\n- [*] symbol\n- [X] uppercase\n- [ ] ok`;
    const stats = getPrdTaskStats(md);
    expect(stats.total).toBe(4);
    expect(stats.completed).toBe(3);
  });

  it("handles missing section", () => {
    const stats = getPrdTaskStats("No tasks here");
    expect(stats.total).toBe(0);
    expect(stats.completed).toBe(0);
  });
});
