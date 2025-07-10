// @vitest-environment node
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

  test("passes error to fallback if fallback is a function", async () => {
    const fallback = (err) => err.message;
    const result = await safeGenerate(
      () => {
        throw new Error("fail");
      },
      "error",
      fallback
    );
    expect(result).toBe("fail");
  });

  test("handles non-Error thrown values", async () => {
    const result = await safeGenerate(
      () => {
        throw "not an error object";
      },
      "error",
      "fallback"
    );
    expect(result).toBe("fallback");
  });

  test("handles undefined fallback", async () => {
    const result = await safeGenerate(() => {
      throw new Error("fail");
    }, "error");
    expect(result).toBeUndefined();
  });
});
