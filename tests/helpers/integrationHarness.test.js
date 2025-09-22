import { describe, expect, it, vi } from "vitest";

import { createIntegrationHarness, createMockFactory } from "./integrationHarness.js";

const REPO_ROOT_URL = new URL("../..", import.meta.url);

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

    const expectedModuleSpecifier = new URL("test/function-module", REPO_ROOT_URL).href;

    expect(calls).toContainEqual([expectedModuleSpecifier, factoryMock]);
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
    const expectedModuleSpecifier = new URL("test/value-module", REPO_ROOT_URL).href;
    const [, factory] = mockRegistrar.mock.calls.find(
      ([modulePath]) => modulePath === expectedModuleSpecifier
    );
    harness.cleanup();

    expect(factory).toBeTypeOf("function");
    expect(factory()).toBe(mockValue);
  });
});
