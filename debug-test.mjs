import { vi } from "vitest";

// Mock setup similar to the test
const mocks = {
  setPointsToWin: vi.fn(),
  logEvent: vi.fn(),
};

vi.mock("./src/helpers/battleEngineFacade.js", () => ({
  setPointsToWin: mocks.setPointsToWin
}));
vi.mock("./src/helpers/telemetry.js", () => ({ 
  logEvent: mocks.logEvent 
}));

const { wrap } = await import("./src/helpers/storage.js");
const { BATTLE_POINTS_TO_WIN } = await import("./src/config/storageKeys.js");
const rounds = (await import("./src/data/battleRounds.js")).default;
const { POINTS_TO_WIN_OPTIONS } = await import("./src/config/battleDefaults.js");

// Test setup
console.log("rounds[1]:", rounds[1]);
console.log("POINTS_TO_WIN_OPTIONS:", POINTS_TO_WIN_OPTIONS);

// Set up the storage like the test does
wrap(BATTLE_POINTS_TO_WIN).set(rounds[1].value);
console.log("Storage value after set:", wrap(BATTLE_POINTS_TO_WIN).get());

// Test the exact logic from the implementation
const storage = wrap(BATTLE_POINTS_TO_WIN, { fallback: "none" });
const saved = storage.get();
console.log("Saved value with fallback none:", saved);
console.log("Number(saved):", Number(saved));
console.log("POINTS_TO_WIN_OPTIONS.includes(Number(saved)):", POINTS_TO_WIN_OPTIONS.includes(Number(saved)));

// Process env check
const IS_VITEST = typeof process !== "undefined" && process.env && process.env.VITEST === "true";
console.log("IS_VITEST:", IS_VITEST);
