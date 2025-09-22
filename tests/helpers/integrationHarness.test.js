import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { createIntegrationHarness, createMockFactory } from "./integrationHarness.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "..", "..");
const toRepoPath = (specifier) => resolve(REPO_ROOT, specifier);

describe("createMockFactory", () => {
  it("returns function mocks unchanged so they execute as factories", () => {
    const factoryMock = vi.fn();

    expect(createMockFactory(factoryMock)).toBe(factoryMock);
  });

  it("wraps non-function mocks in a callable factory", () => {
    const mockValue = { value: "static mock" };
    const factory = createMockFactory(mockValue);

    expect(factory()).toBe(mockValue);
  });
});

describe("createIntegrationHarness mocks", () => {
  it("registers function-based mock factories transparently", async () => {
    const factoryMock = vi.fn();
    const mockRegistrar = vi.fn();

    const harness = createIntegrationHarness({
      useFakeTimers: false,
      useRafMock: false,
      mockRegistrar,
      mocks: {
        "test/function-module": factoryMock
      }
    });

    await harness.setup();
    const calls = mockRegistrar.mock.calls.slice();
    harness.cleanup();
    const resolvedUrl = pathToFileURL(toRepoPath("test/function-module")).href;

    expect(calls).toEqual(
      expect.arrayContaining([
        [resolvedUrl, expect.any(Function)],
        ["test/function-module", factoryMock]
      ])
    );
  });

  it("registers value mocks via generated factory wrappers", async () => {
    const mockValue = { value: "static mock" };
    const mockRegistrar = vi.fn();

    const harness = createIntegrationHarness({
      useFakeTimers: false,
      useRafMock: false,
      mockRegistrar,
      mocks: {
        "test/value-module": mockValue
      }
    });

    await harness.setup();
    const [, factory] = mockRegistrar.mock.calls.find(
      ([modulePath]) => modulePath === "test/value-module"
    );
    harness.cleanup();

    expect(factory).toBeTypeOf("function");
    expect(factory()).toBe(mockValue);
  });
});
