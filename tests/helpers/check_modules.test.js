import { describe, it, vi } from "vitest";

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  mockMarker: "MOCKED"
}));

describe("Check module resolution", () => {
  it("check if mock is applied", async () => {
    const mod = await import("../../src/helpers/setupScoreboard.js");
    console.log("Module keys:", Object.keys(mod));
    console.log("mockMarker:", mod.mockMarker);
    console.log("Has updateTimer:", "updateTimer" in mod);
  });
});
