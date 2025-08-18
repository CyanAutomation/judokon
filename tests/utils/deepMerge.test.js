import { describe, it, expect } from "vitest";
import { deepMerge } from "../../src/utils/deepMerge.js";

describe("deepMerge", () => {
  it("merges nested objects without mutating inputs", () => {
    const a = { foo: { bar: 1, baz: 2 } };
    const b = { foo: { bar: 3 } };
    const result = deepMerge(a, b);
    expect(result).toEqual({ foo: { bar: 3, baz: 2 } });
    expect(a).toEqual({ foo: { bar: 1, baz: 2 } });
    expect(b).toEqual({ foo: { bar: 3 } });
  });

  it("replaces arrays and clones them", () => {
    const a = { list: [1, 2] };
    const arr = [3];
    const b = { list: arr };
    const result = deepMerge(a, b);
    expect(result.list).toEqual([3]);
    expect(result.list).not.toBe(arr);
    expect(a.list).toEqual([1, 2]);
  });

  it("overrides non-object values", () => {
    const a = { count: 1, flag: true };
    const b = { count: 2, flag: false };
    const result = deepMerge(a, b);
    expect(result).toEqual({ count: 2, flag: false });
  });
});
