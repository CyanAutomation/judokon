import { generateRandomCard } from "../randomCard.js";
import { getRandomJudoka } from "../cardUtils.js";
import { loadSettings } from "../settingsStorage.js";
import { isEnabled } from "../featureFlags.js";
import { fetchJson } from "../dataUtils.js";
import { createGokyoLookup } from "../utils.js";
import { DATA_DIR } from "../constants.js";
import { showMessage } from "../setupBattleInfoBar.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { setupLazyPortraits } from "../lazyPortrait.js";

let judokaData = null;
let gokyoLookup = null;
let computerJudoka = null;
let loadErrorModal = null;

function showLoadError(error) {
  const msg = error?.message || "Unable to load data.";
  showMessage(msg);
  if (!loadErrorModal) {
    const title = document.createElement("h2");
    title.id = "load-error-title";
    title.textContent = "Load Error";

    const desc = document.createElement("p");
    desc.id = "load-error-desc";
    desc.textContent = msg;

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const retry = createButton("Retry", { id: "retry-draw-button" });
    retry.addEventListener("click", async () => {
      loadErrorModal.close();
      try {
        await drawCards();
      } catch (retryError) {
        console.debug("Failed to retry card draw:", retryError);
        window.location.reload();
      }
    });
    actions.append(retry);

    const frag = document.createDocumentFragment();
    frag.append(title, desc, actions);

    loadErrorModal = createModal(frag, { labelledBy: title, describedBy: desc });
    document.body.appendChild(loadErrorModal.element);
  } else {
    const descEl = loadErrorModal.element.querySelector("#load-error-desc");
    if (descEl) descEl.textContent = msg;
  }
  loadErrorModal.open();
}

/**
 * Draw battle cards for the player and computer.
 *
 * @pseudocode
 * 1. Load judoka and gokyo data when not cached.
 * 2. Filter out judoka marked `isHidden`.
 * 3. Render a random player card using `generateRandomCard` and store the result.
 * 4. Choose a random opponent judoka avoiding duplicates.
 * 5. If `JudokaCard.render` returns an HTMLElement, render a placeholder card for the computer with obscured stats; otherwise log an error.
 * 6. Return the selected judoka objects.
 *
 * @returns {Promise<{playerJudoka: object|null, computerJudoka: object|null}>}
 */
async function ensureJudokaData() {
  if (judokaData) return Array.isArray(judokaData) ? judokaData : [];
  try {
    judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
    return Array.isArray(judokaData) ? judokaData : [];
  } catch (error) {
    showLoadError(error);
    return [];
  }
}

async function ensureGokyoLookup() {
  if (gokyoLookup) return gokyoLookup;
  try {
    const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    gokyoLookup = createGokyoLookup(gokyoData);
    return gokyoLookup;
  } catch (error) {
    showLoadError(error);
    return createGokyoLookup([]);
  }
}

function pickOpponent(available, playerJudoka) {
  let compJudoka = getRandomJudoka(available);
  if (!playerJudoka) return compJudoka;
  let attempts = 0;
  const maxAttempts = Math.max(available.length || 0, 5);
  while (compJudoka.id === playerJudoka.id && attempts < maxAttempts) {
    compJudoka = getRandomJudoka(available);
    attempts += 1;
  }
  return compJudoka;
}

async function renderComputerPlaceholder(container, placeholder, enableInspector) {
  const judokaCard = new JudokaCard(placeholder, gokyoLookup, {
    useObscuredStats: true,
    enableInspector
  });
  try {
    if (typeof judokaCard.render === "function") {
      const card = await judokaCard.render();
      if (!(card && typeof card === "object" && card.nodeType === 1)) {
        console.error("JudokaCard did not render an HTMLElement");
        return;
      }
      container.innerHTML = "";
      container.appendChild(card);
      // Defer lazy portrait setup when unsupported (e.g., JSDOM)
      if (typeof IntersectionObserver !== "undefined") {
        try {
          setupLazyPortraits(card);
        } catch {}
      }
    }
  } catch (error) {
    console.debug("Error rendering JudokaCard:", error);
  }
}

export async function drawCards() {
  // Always attempt to load both datasets so retries re-fetch both.
  const allJudoka = await ensureJudokaData();
  const available = allJudoka.filter((j) => !j.isHidden);

  const lookup = await ensureGokyoLookup();
  // If lookup failed completely, bail out; judoka may be empty but we can still proceed.
  if (!lookup) return { playerJudoka: null, computerJudoka: null };

  const playerContainer = document.getElementById("player-card");
  const computerContainer = document.getElementById("computer-card");

  try {
    await loadSettings();
  } catch {}
  const enableInspector = isEnabled("enableCardInspector");

  let playerJudoka = null;
  await generateRandomCard(
    available,
    null,
    playerContainer,
    false,
    (j) => {
      playerJudoka = j;
    },
    { enableInspector }
  );

  const compJudoka = pickOpponent(available, playerJudoka);
  computerJudoka = compJudoka;

  const placeholder = allJudoka.find((j) => j.id === 1) || compJudoka;
  await renderComputerPlaceholder(computerContainer, placeholder, enableInspector);

  return { playerJudoka, computerJudoka };
}

export function getComputerJudoka() {
  return computerJudoka;
}

export function clearComputerJudoka() {
  computerJudoka = null;
}

export function getGokyoLookup() {
  return gokyoLookup;
}

/**
 * Ensure the gokyo lookup is available, loading it if missing.
 * Primarily used by tests or code paths that call `revealComputerCard` directly.
 * @returns {Promise<ReturnType<typeof createGokyoLookup>>} Lookup (empty on failure).
 */
export async function getOrLoadGokyoLookup() {
  return await ensureGokyoLookup();
}

export function _resetForTest() {
  judokaData = null;
  gokyoLookup = null;
  computerJudoka = null;
  loadErrorModal = null;
}
