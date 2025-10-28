const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const OPPONENT_CARD_CONTAINER_ARIA_LABEL = "Opponent card";
export const OPPONENT_PLACEHOLDER_ARIA_LABEL = "Mystery opponent card";
export const OPPONENT_PLACEHOLDER_ID = "mystery-card-placeholder";

function resolveDocument(documentRef) {
  if (documentRef && typeof documentRef.createElement === "function") {
    return documentRef;
  }
  if (typeof document !== "undefined" && document?.createElement) {
    return document;
  }
  return null;
}

export function createOpponentCardPlaceholder(documentRef) {
  const doc = resolveDocument(documentRef);
  if (!doc) return null;

  const placeholder = doc.createElement("div");
  placeholder.id = OPPONENT_PLACEHOLDER_ID;
  placeholder.className = "card common-rarity";
  placeholder.setAttribute("aria-label", OPPONENT_PLACEHOLDER_ARIA_LABEL);

  const svg = doc.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 960 960");
  svg.classList.add("mystery-icon");

  const path = doc.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute(
    "d",
    "M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z"
  );

  svg.appendChild(path);
  placeholder.appendChild(svg);

  return placeholder;
}

export function applyOpponentCardPlaceholder(container, { documentRef } = {}) {
  if (!container) return null;

  const doc = resolveDocument(documentRef || container?.ownerDocument);
  const placeholder = createOpponentCardPlaceholder(doc);
  if (!placeholder) return null;

  const debugPanel = container.querySelector("#debug-panel");
  container.innerHTML = "";
  if (debugPanel) container.appendChild(debugPanel);
  container.appendChild(placeholder);

  try {
    container.setAttribute("aria-label", OPPONENT_PLACEHOLDER_ARIA_LABEL);
  } catch {}

  return placeholder;
}

