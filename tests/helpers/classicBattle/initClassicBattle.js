export async function initClassicBattleTest(opts = {}) {
  const helper = await import("../initClassicBattleTest.js");
  return helper.initClassicBattleTest(opts);
}
