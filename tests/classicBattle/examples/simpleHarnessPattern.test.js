import { describe, expect, it, vi } from "vitest";
import { createSimpleHarness } from "../../helpers/integrationHarness.js";

const fakeStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn()
};

const sampleModuleMock = vi.hoisted(() => ({
  getBattleMessage: vi.fn(() => "mocked battle message")
}));

vi.mock("./sampleModule.js", () => sampleModuleMock);

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

    const { getBattleMessage } = await harness.importModule("./sampleModule.js");
    const message = getBattleMessage();

    expect(message).toBe("mocked battle message");
    expect(sampleModuleMock.getBattleMessage).toHaveBeenCalledOnce();
  });
});
