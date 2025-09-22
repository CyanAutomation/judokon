import { pathToFileURL } from "node:url";
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

    const [registeredPath] = calls.at(-1);
    return { registeredPath, mockRegistrar };
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

  it("normalizes traversal attempts to stay within the repository root", async () => {
    const { registeredPath } = await getRegisteredModuleSpecifier("../../../../etc/passwd");

    expect(registeredPath).toBe(new URL("etc/passwd", REPO_ROOT_URL).href);
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
