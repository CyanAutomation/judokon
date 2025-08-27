export async function initClassicBattleTest() {
  const mod = await import("../../../src/helpers/classicBattle.js");
  if (typeof mod.__ensureClassicBattleBindings === "function") {
    await mod.__ensureClassicBattleBindings();
  }
  return mod;
}

