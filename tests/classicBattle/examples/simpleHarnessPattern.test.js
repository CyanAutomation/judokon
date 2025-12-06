import { describe, expect, it, vi } from "vitest";
import { createSimpleHarness } from "../../helpers/integrationHarness.js";

const fakeStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  clear: vi.fn()
};

const mockFactory = vi.hoisted(() => {
  const { pathToFileURL } = require("node:url");
  const urlObj = new URL("./sampleModule.js", import.meta.url);
  const path = pathToFileURL(urlObj.pathname).href;
  const getBattleMessage = vi.fn(() => "mocked battle message");
  
  return {
    path,
    factory: () => ({ getBattleMessage }),
    getBattleMessage
  };
});

vi.mock(mockFactory.path, () => mockFactory.factory());

const harness = createSimpleHarness({ fixtures: { localStorage: fakeStorage } });

describe("Simple harness pattern", () => {
  beforeEach(async () => {
    await harness.setup();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it("applies top-level mocks before imports", async () => {
    expect(window.localStorage).toBe(fakeStorage);

    const { getBattleMessage } = await harness.importModule(mockFactory.path);
    const message = getBattleMessage();

    expect(message).toBe("mocked battle message");
    expect(mockFactory.getBattleMessage).toHaveBeenCalledOnce();
  });
});
