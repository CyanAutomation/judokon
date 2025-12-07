// Simulate the updateRoundHeader logic
function byId(id) {
  const el = global.els?.[id];
  if (!el) console.log(`[byId] Element ${id} not found`);
  return el;
}

let sharedScoreboardHelpers = null;

function updateRoundHeader(round, target) {
  console.log(`[updateRoundHeader] called with round=${round}, target=${target}`);
  
  // Phase 3: Primary update via shared Scoreboard component
  try {
    if (sharedScoreboardHelpers?.updateRoundCounter) {
      console.log(`[updateRoundHeader] Calling shared updateRoundCounter(${round})`);
      sharedScoreboardHelpers.updateRoundCounter(round);
    }
  } catch {
    console.log(`[updateRoundHeader] shared component failed`);
  }

  // Phase 3: Keep CLI element for visual consistency (not primary source)
  const el = byId("round-counter");
  const root = byId("cli-root");
  let resolvedTarget = target;
  console.log(`[updateRoundHeader] resolvedTarget initial=${resolvedTarget}`);
  
  if (resolvedTarget === undefined || resolvedTarget === null || resolvedTarget === "") {
    console.log(`[updateRoundHeader] resolvedTarget is empty, trying engineFacade.getPointsToWin()`);
    try {
      const getter = () => { throw new Error("boom"); }; // Simulating error
      if (typeof getter === "function") {
        resolvedTarget = getter();
        console.log(`[updateRoundHeader] getPointsToWin() returned=${resolvedTarget}`);
      }
    } catch (e) {
      console.log(`[updateRoundHeader] getPointsToWin() threw:`, e.message);
    }
  }
  
  if (resolvedTarget === undefined || resolvedTarget === null || resolvedTarget === "") {
    console.log(`[updateRoundHeader] still empty, checking existing target`);
    const existing = root?.dataset?.target;
    if (existing !== undefined) {
      resolvedTarget = Number.isNaN(Number(existing)) ? existing : Number(existing);
      console.log(`[updateRoundHeader] restored from existing=${resolvedTarget}`);
    }
  }
  
  if (resolvedTarget === undefined || resolvedTarget === null || resolvedTarget === "") {
    console.log(`[updateRoundHeader] still empty, using fallback=5`);
    resolvedTarget = 5;
  }
  
  console.log(`[updateRoundHeader] final resolvedTarget=${resolvedTarget}`);
  const displayTarget =
    typeof resolvedTarget === "number" && !Number.isNaN(resolvedTarget)
      ? resolvedTarget
      : String(resolvedTarget);
  
  if (el) {
    el.textContent = `Round ${round} Target: ${displayTarget}`;
    console.log(`[updateRoundHeader] set el.textContent="${el.textContent}"`);
    try {
      el.dataset.target = String(displayTarget);
    } catch {}
  }

  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(displayTarget);
  }
}

// Test 1: Call with explicit target=7
global.els = {
  "round-counter": { textContent: "", dataset: {} },
  "cli-root": { dataset: {} }
};

updateRoundHeader(2, 7);
console.log("Test 1 result:", global.els["round-counter"].textContent);
console.log("");

// Test 2: Call with getPointsToWin returning 9
global.els = {
  "round-counter": { textContent: "", dataset: {} },
  "cli-root": { dataset: { target: "5" } }
};

updateRoundHeader(0, undefined);
console.log("Test 2 result:", global.els["round-counter"].textContent);
