import { pathToFileURL } from "node:url";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createIntegrationHarness, createSimpleHarness, createMockFactory } from "./integrationHarness.js";

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
  async function getRegisteredModuleSpecifier(modulePath, mockImpl = vi.fn()) {
    const mockRegistrar = vi.fn();

    const harness = createIntegrationHarness({
      useFakeTimers: false,
      useRafMock: false,
      mockRegistrar,
      mocks: {
        [modulePath]: mockImpl
      }
    });

    let calls;
    try {
      await harness.setup();
      calls = mockRegistrar.mock.calls.slice();
    } finally {
      harness.cleanup();
    }

    const [registeredPath] = calls.at(-1) ?? [];
    return { registeredPath, mockRegistrar, mockCalls: calls };
  }

  it("registers function-based mock factories transparently", async () => {
    const factoryMock = vi.fn();
    const mockRegistrar = vi.fn();

    const harness = createIntegrationHarness({
      useFakeTimers: false,
      useRafMock: false,
      mockRegistrar,
      mocks: {
        "./test/function-module.js": factoryMock
      }
    });

    await harness.setup();
    const calls = mockRegistrar.mock.calls.slice();
    harness.cleanup();

    const expectedModuleSpecifier = new URL("test/function-module.js", REPO_ROOT_URL).href;

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
        "./test/value-module.js": mockValue
      }
    });

    await harness.setup();
    const expectedModuleSpecifier = new URL("test/value-module.js", REPO_ROOT_URL).href;
    const [, factory] = mockRegistrar.mock.calls.find(
      ([modulePath]) => modulePath === expectedModuleSpecifier
    );
    harness.cleanup();

    expect(factory).toBeTypeOf("function");
    expect(factory()).toBe(mockValue);
  });

  it("resolves relative module paths against the repository root", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("./src/utils/example.js");

    expect(registeredPath).toBe(new URL("src/utils/example.js", REPO_ROOT_URL).href);
  });

  it("preserves Vite `/src/` alias specifiers", async () => {
    const specifier = "/src/helpers/example.js";
    const { registeredPath } = await getRegisteredModuleSpecifier(specifier);

    expect(registeredPath).toBe(specifier);
  });

  it("normalizes traversal attempts to stay within the repository root", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("../../../../etc/passwd");

    expect(registeredPath).toBe(new URL("etc/passwd", REPO_ROOT_URL).href);
  });

  it("normalizes deep relative module paths before registering mocks", async () => {
    const deepRelativePath = "../../../src/helpers/classicBattle/eventDispatcher.js";
    const { registeredPath, mockCalls } = await getRegisteredModuleSpecifier(deepRelativePath);

    const expectedSpecifier = new URL("src/helpers/classicBattle/eventDispatcher.js", REPO_ROOT_URL)
      .href;

    expect(registeredPath).toBe(expectedSpecifier);
    expect(mockCalls).toContainEqual([expectedSpecifier, expect.any(Function)]);
  });

  it("normalizes Windows-style traversal attempts", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("..\\\\..\\\\evil/module.js");

    expect(registeredPath).toBe(new URL("evil/module.js", REPO_ROOT_URL).href);
  });

  it("converts Windows drive paths to file URLs", async () => {
    const windowsPath = "C:/projects/judokon/mocks/module.js";
    const { registeredPath } = await getRegisteredModuleSpecifier(windowsPath);

    expect(registeredPath).toBe(pathToFileURL(windowsPath).href);
  });

  it("converts absolute POSIX paths to file URLs", async () => {
    const absolutePath = "/tmp/judokon/mocks/module.js";
    const { registeredPath } = await getRegisteredModuleSpecifier(absolutePath);

    expect(registeredPath).toBe(pathToFileURL(absolutePath).href);
  });

  it("passes through valid absolute URLs", async () => {
    const urlSpecifier = "https://example.com/module.js";
    const { registeredPath } = await getRegisteredModuleSpecifier(urlSpecifier);

    expect(registeredPath).toBe(urlSpecifier);
  });

  it("preserves bare module specifiers", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("lodash");

    expect(registeredPath).toBe("lodash");
  });

  it("preserves bare module subpaths", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("react-dom/client");

    expect(registeredPath).toBe("react-dom/client");
  });

  it("preserves scoped bare module specifiers", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("@scope/package");

    expect(registeredPath).toBe("@scope/package");
  });

  it("preserves scoped subpath module specifiers", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("@scope/package/sub");

    expect(registeredPath).toBe("@scope/package/sub");
  });

  it("throws for empty sanitized relative paths", async () => {
    const harness = createIntegrationHarness({
      useFakeTimers: false,
      useRafMock: false,
      mocks: {
        "..": vi.fn()
      }
    });

    await expect(harness.setup()).rejects.toThrow(
      /Unable to resolve mock module path "\.\." relative to repository root/
    );

    harness.cleanup();
  });
});

describe("createSimpleHarness (no mocks parameter)", () => {
  it("creates a harness without mocks parameter", async () => {
    const harness = createSimpleHarness();
    expect(harness).toBeTruthy();
    expect(typeof harness.setup).toBe("function");
    expect(typeof harness.cleanup).toBe("function");
    expect(typeof harness.importModule).toBe("function");
  });

  it("sets up and cleans up environment", async () => {
    const harness = createSimpleHarness({ useFakeTimers: false, useRafMock: false });

    await harness.setup();
    expect(document).toBeTruthy();

    harness.cleanup();
    expect(document.body.innerHTML).toBe("");
  });

  it("supports fixtures parameter for injecting test data", async () => {
    const mockStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    const harness = createSimpleHarness({
      useFakeTimers: false,
      useRafMock: false,
      fixtures: { localStorage: mockStorage }
    });

    await harness.setup();
    expect(window.localStorage).toBe(mockStorage);

    harness.cleanup();
  });

  it("provides timer control when useFakeTimers is true", async () => {
    const harness = createSimpleHarness({ useFakeTimers: true, useRafMock: false });

    await harness.setup();
    expect(harness.timerControl).toBeTruthy();
    expect(typeof harness.timerControl.cleanup).toBe("function");

    harness.cleanup();
  });

  it("provides RAF control when useRafMock is true", async () => {
    const harness = createSimpleHarness({ useFakeTimers: false, useRafMock: true });

    await harness.setup();
    expect(harness.rafControl).toBeTruthy();
    expect(typeof harness.rafControl.restore).toBe("function");

    harness.cleanup();
  });

  it("clears mocks after cleanup", async () => {
    const mockFn = vi.fn();
    const harness = createSimpleHarness({ useFakeTimers: false, useRafMock: false });

    await harness.setup();
    mockFn("test");
    harness.cleanup();

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  it("allows custom setup and teardown functions", async () => {
    const setupSpy = vi.fn();
    const teardownSpy = vi.fn();

    const harness = createSimpleHarness({
      useFakeTimers: false,
      useRafMock: false,
      setup: setupSpy,
      teardown: teardownSpy
    });

    await harness.setup();
    expect(setupSpy).toHaveBeenCalledTimes(1);

    harness.cleanup();
    expect(teardownSpy).toHaveBeenCalledTimes(1);
  });

  it("caches imported modules for consistent references", async () => {
    const harness = createSimpleHarness({ useFakeTimers: false, useRafMock: false });

    await harness.setup();

    const module1 = await harness.importModule("./integrationHarness.js");
    const module2 = await harness.importModule("./integrationHarness.js");

    expect(module1).toBe(module2);

    harness.cleanup();
  });

  it("does NOT accept mocks parameter (enforces top-level vi.mock pattern)", () => {
    // This test verifies the new API intentionally excludes mocks
    const harness = createSimpleHarness({
      useFakeTimers: false,
      useRafMock: false,
      mocks: { "some/module.js": () => ({}) } // Should be ignored
    });

    // Harness should still be created successfully, but mocks param is ignored
    expect(harness).toBeTruthy();
    expect(typeof harness.setup).toBe("function");
  });

  describe("integration with vi.resetModules() for top-level vi.mock()", () => {
    // These tests demonstrate that createSimpleHarness plays nicely with
    // top-level vi.mock() calls by calling vi.resetModules() during setup

    it("resets module cache during setup to apply top-level mocks", async () => {
      const resetSpy = vi.spyOn(vi, "resetModules");

      const harness = createSimpleHarness({ useFakeTimers: false, useRafMock: false });

      await harness.setup();

      expect(resetSpy).toHaveBeenCalled();

      harness.cleanup();
      resetSpy.mockRestore();
    });

    it("allows test files to import modules that use top-level vi.mock()", async () => {
      // This test just verifies the harness doesn't break the mocking system
      const harness = createSimpleHarness({ useFakeTimers: false, useRafMock: false });

      await harness.setup();
      // If vi.mock() is set up at the top level, importModule will get the mocked version
      const module = await harness.importModule("./integrationHarness.js");
      expect(module).toBeTruthy();

      harness.cleanup();
    });
  });
});
