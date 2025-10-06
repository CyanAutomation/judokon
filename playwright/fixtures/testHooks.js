/**
 * Private test fixtures for hover-zoom accessibility tests.
 * These are test-only helpers and should not be used in production code.
 */

const state = {
  animationsDisabled: false,
  previousAnimationValue: null,
  addedNodes: new Set()
};

// Disable animations for deterministic hover tests
export function disableAnimations() {
  const style = document.createElement("style");
  style.textContent = `
    * {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `;
  document.head.appendChild(style);
}

// Add a dynamic card for zoom testing
export function addDynamicCard() {
  const card = document.createElement("div");
  card.setAttribute("data-testid", "dynamic-card");
  card.textContent = "Dynamic Card for Zoom Test";
  card.className = "judoka-card";
  document.body.appendChild(card);
  state.addedNodes.add(card);
}

// Add a test card with judoka data
export function addCard(judoka) {
  const card = document.createElement("div");
  card.className = "judoka-card";
  card.setAttribute("data-testid", `card-${judoka.firstname}-${judoka.surname}`);
  card.innerHTML = `
    <div class="card-front">
      <h3>${judoka.firstname} ${judoka.surname}</h3>
      <p>${judoka.country}</p>
    </div>
  `;
  document.querySelector(".judoka-cards")?.appendChild(card) || document.body.appendChild(card);
  state.addedNodes.add(card);
}

// Disable hover animations on the browse page for deterministic testing
export function disableHoverAnimations() {
  const body = document.body;
  if (!body || state.animationsDisabled) return;
  state.previousAnimationValue = body.hasAttribute("data-test-disable-animations")
    ? body.getAttribute("data-test-disable-animations")
    : null;
  body.setAttribute("data-test-disable-animations", "true");
  state.animationsDisabled = true;
}

// Enable hover animations (restore previous state)
export function enableHoverAnimations() {
  const body = document.body;
  if (!body || !state.animationsDisabled) return;
  if (state.previousAnimationValue === null) {
    body.removeAttribute("data-test-disable-animations");
  } else {
    body.setAttribute("data-test-disable-animations", state.previousAnimationValue);
  }
  state.animationsDisabled = false;
}

// Reset test hook state
export function reset() {
  enableHoverAnimations();
  for (const node of state.addedNodes) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
  state.addedNodes.clear();
}
