const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export const OPPONENT_CARD_CONTAINER_ARIA_LABEL = "Opponent card";
export const OPPONENT_PLACEHOLDER_ARIA_LABEL = "Mystery opponent card";
export const OPPONENT_PLACEHOLDER_ID = "mystery-card-placeholder";

/**
 * @summary Resolve a document reference for DOM operations.
 *
 * @pseudocode
 * 1. Return `documentRef` when it implements `createElement`.
 * 2. Otherwise fall back to the global `document` when available.
 * 3. Return `null` if no suitable document reference exists.
 *
 * @param {Document|null|undefined} documentRef - Possible document reference to validate.
 * @returns {Document|null} Valid document instance or null when unavailable.
 */
function resolveDocument(documentRef) {
  if (documentRef && typeof documentRef.createElement === "function") {
    return documentRef;
  }
  if (typeof document !== "undefined" && document?.createElement) {
    return document;
  }
  return null;
}

/**
 * @summary Create a mystery opponent card placeholder element.
 *
 * @pseudocode
 * 1. Resolve the active document context via `resolveDocument()`.
 * 2. Construct a div container with placeholder styling and ARIA metadata.
 * 3. Build the SVG mystery icon and append it to the container.
 * 4. Return the fully assembled placeholder element or null when unavailable.
 *
 * @param {Document|null|undefined} documentRef - Document reference used to create elements.
 * @returns {HTMLElement|null} Placeholder element or null when document access fails.
 */
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

/**
 * @summary Apply the opponent placeholder to the specified container.
 *
 * @pseudocode
 * 1. Exit early when `container` is missing.
 * 2. Resolve the document context, preferring the provided override.
 * 3. Create the placeholder element and clear existing non-debug contents.
 * 4. Restore the debug panel (if present), append the placeholder, and set ARIA metadata.
 * 5. Ensure the opponent card container is visible by removing the `opponent-hidden` class.
 *
 * @param {HTMLElement|null|undefined} container - Target container that receives the placeholder.
 * @param {{ documentRef?: Document|null }} [options] - Optional document override.
 * @returns {HTMLElement|null} The applied placeholder element or null when no update occurs.
 */
export function applyOpponentCardPlaceholder(container, { documentRef } = {}) {
  if (!container) return null;

  const doc = resolveDocument(documentRef || container?.ownerDocument);
  const placeholder = createOpponentCardPlaceholder(doc);
  if (!placeholder) return null;

  const debugPanel = container.querySelector("#debug-panel");
  container.innerHTML = "";
  if (debugPanel) container.appendChild(debugPanel);
  container.appendChild(placeholder);

  const targetContainer =
    container?.id === "opponent-card" ? container : doc?.getElementById("opponent-card");
  if (targetContainer?.classList?.contains("opponent-hidden")) {
    try {
      targetContainer.classList.remove("opponent-hidden");
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Failed to remove opponent-hidden class:", error?.message ?? error);
      }
    }
  }

  try {
    targetContainer?.classList?.add("is-obscured");
  } catch {}
  try {
    container.classList.add("is-obscured");
  } catch {}

  // Update the container's aria-label to indicate mystery state
  try {
    if (targetContainer) {
      targetContainer.setAttribute("aria-label", OPPONENT_PLACEHOLDER_ARIA_LABEL);
    } else if (container) {
      container.setAttribute("aria-label", OPPONENT_PLACEHOLDER_ARIA_LABEL);
    }
  } catch {}

  return placeholder;
}
