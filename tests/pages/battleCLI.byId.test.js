import { describe, it, expect } from "vitest";

describe("battleCLI byId", () => {
  it("returns null when document is undefined", async () => {
    const { byId } = await import("../../src/pages/battleCLI/dom.js");
    const original = globalThis.document;
    // @ts-ignore - intentionally unset for test
    globalThis.document = undefined;
    try {
      expect(byId("missing")).toBeNull();
    } finally {
      // @ts-ignore - restore document for other tests
      globalThis.document = original;
    }
  });
});
