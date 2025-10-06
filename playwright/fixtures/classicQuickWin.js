/**
 * Private test fixture for deterministic quick wins in battle tests.
 * This is test-only and should not be used in production code.
 */

let facadePromise = null;
let facade = null;

async function ensureFacade() {
  if (!facadePromise) {
    facadePromise = import("/src/helpers/battleEngineFacade.js")
      .then((module) => {
        facade = module;
        return module;
      })
      .catch((error) => {
        try {
          console.warn("[test] quick win facade import failed", error);
        } catch {}
        facadePromise = null;
        return null;
      });
  }
  return facadePromise;
}

export async function apply() {
  const facade = await ensureFacade();
  if (!facade || typeof facade.setPointsToWin !== "function") {
    return false;
  }
  try {
    facade.setPointsToWin(1);
    if (typeof facade.getPointsToWin === "function") {
      const current = Number(facade.getPointsToWin());
      if (current !== 1) {
        facade.setPointsToWin(1);
        return Number(facade.getPointsToWin()) === 1;
      }
      return true;
    }
    return true;
  } catch (error) {
    try {
      console.warn("[test] quick win apply failed", error);
    } catch {}
    return false;
  }
}

export function readTarget() {
  try {
    if (facade && typeof facade.getPointsToWin === "function") {
      return Number(facade.getPointsToWin());
    }
  } catch {}
  return null;
}

// Simulate a quick win by dispatching a win event (legacy)
export function triggerQuickWin() {
  window.__TEST_API.state.dispatchBattleEvent("quickWin");
}
