// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/vendor/ajv6.min.js", () => {
  throw new Error("local import failed");
});

describe("getAjv fallback stub", () => {
  const message = "Ajv import failed; validation disabled";
  let originalNodeVersion;
  let errorSpy;

  beforeEach(() => {
    originalNodeVersion = process.versions.node;
    delete process.versions.node;
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.resetModules();
  });

  afterEach(() => {
    process.versions.node = originalNodeVersion;
    errorSpy.mockRestore();
  });

  it("provides stub with errorsText and sets errors", async () => {
    const { getAjv } = await import("../../src/helpers/dataUtils.js");
    const ajv = await getAjv();

    const validate = ajv.compile({});
    const result = validate({});

    expect(result).toBe(false);
    expect(ajv.errors).toEqual([{ message }]);
    expect(validate.errors).toEqual([{ message }]);
    expect(ajv.errorsText(validate.errors)).toBe(message);
  });
});
