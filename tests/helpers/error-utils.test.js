import { describe, test, expect } from "vitest";
import { safeGenerate } from "../../src/helpers/errorUtils.js";

describe("safeGenerate", () => {
  test("returns fallback for synchronous errors", async () => {
    const result = await safeGenerate(
      () => {
        throw new Error("fail");
      },
      "error",
      "fallback"
    );
    expect(result).toBe("fallback");
  });

  test("returns fallback for asynchronous errors", async () => {
    const result = await safeGenerate(
      async () => {
        throw new Error("fail");
      },
      "error",
      42
    );
    expect(result).toBe(42);
  });

  test("returns value when no error is thrown", async () => {
    const result = await safeGenerate(() => "ok", "error", "fallback");
    expect(result).toBe("ok");
  });
});
