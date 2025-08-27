// Helper to (re)initialize Classic Battle bindings in tests.
// Usage: await initClassicBattleTest({ afterMock: true }) immediately after vi.doMock(...)
export async function initClassicBattleTest(opts = {}) {
  const battleMod = await import("../src/helpers/classicBattle.js");
  const afterMock = !!opts.afterMock;
  if (afterMock && typeof battleMod.__resetClassicBattleBindings === "function") {
    await battleMod.__resetClassicBattleBindings();
  }
  if (typeof battleMod.__ensureClassicBattleBindings === "function") {
    await battleMod.__ensureClassicBattleBindings({ force: afterMock });
  }
  return battleMod;
}

