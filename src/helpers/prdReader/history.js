/**
 * History helpers for the PRD reader.
 *
 * @pseudocode
 * 1. Construct a URL with the current document.
 * 2. Push the state with index and URL.
 *
 * @param {string[]} baseNames
 * @param {number} index
 */
export function pushHistory(baseNames, index) {
  const url = new URL(window.location);
  url.searchParams.set("doc", baseNames[index]);
  history.pushState({ index }, "", url.pathname + url.search);
}

/**
 * Replace current history entry with the given document.
 *
 * @pseudocode
 * 1. Construct a URL with the current document.
 * 2. Replace state with index and URL.
 *
 * @param {string[]} baseNames
 * @param {number} index
 */
export function replaceHistory(baseNames, index) {
  const url = new URL(window.location);
  url.searchParams.set("doc", baseNames[index]);
  history.replaceState({ index }, "", url.pathname + url.search);
}

/**
 * Bind popstate events to document selection.
 *
 * @pseudocode
 * 1. Listen for window popstate events.
 * 2. Extract index from state and invoke callback.
 * 3. Return an unbind function.
 *
 * @param {(i:number) => void} selectDoc
 * @returns {() => void}
 */
export function bindHistory(selectDoc) {
  const handler = (e) => {
    const i = e.state && typeof e.state.index === "number" ? e.state.index : null;
    if (i !== null) selectDoc(i, false);
  };
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
