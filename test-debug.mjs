import { isEnabled } from "./src/helpers/featureFlags.js";

// Test 1: Check if __FF_OVERRIDES works
console.log("Test 1: Without __FF_OVERRIDES");
console.log("isEnabled('statHotkeys'):", isEnabled("statHotkeys"));

// Test 2: Set __FF_OVERRIDES
globalThis.window = { __FF_OVERRIDES: { statHotkeys: true } };
console.log("\nTest 2: With __FF_OVERRIDES.statHotkeys = true");
console.log("isEnabled('statHotkeys'):", isEnabled("statHotkeys"));

// Test 3: Disable it
globalThis.window.__FF_OVERRIDES.statHotkeys = false;
console.log("\nTest 3: With __FF_OVERRIDES.statHotkeys = false");
console.log("isEnabled('statHotkeys'):", isEnabled("statHotkeys"));
