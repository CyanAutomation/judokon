/**
 * Pushes a new state onto the browser's history stack for the PRD reader.
 *
 * @summary This function updates the browser's URL and history entry to reflect
 * the currently viewed PRD document, allowing for navigation using browser
 * back/forward buttons.
 *
 * @pseudocode
 * 1. Create a new `URL` object based on the current `window.location`.
 * 2. Set the `doc` search parameter of the URL to the `baseNames[index]`, which represents the name of the current PRD document.
 * 3. Use `history.pushState()` to add a new entry to the browser's session history.
 *    a. The `state` object contains the `index` of the current document.
 *    b. The `title` is an empty string (modern browsers often ignore this).
 *    c. The `url` is constructed from the current `pathname` and the updated `search` parameters.
 *
 * @param {string[]} baseNames - An array of base names for the PRD documents.
 * @param {number} index - The index of the current PRD document in the `baseNames` array.
 * @returns {void}
 */
export function pushHistory(baseNames, index) {
  const url = new URL(window.location);
  url.searchParams.set("doc", baseNames[index]);
  history.pushState({ index }, "", url.pathname + url.search);
}

/**
 * Replaces the current entry in the browser's history stack for the PRD reader.
 *
 * @summary This function updates the browser's URL and modifies the current
 * history entry, effectively changing the URL without adding a new entry to
 * the history stack. This is useful for initial page loads or when
 * canonicalizing URLs.
 *
 * @pseudocode
 * 1. Create a new `URL` object based on the current `window.location`.
 * 2. Set the `doc` search parameter of the URL to the `baseNames[index]`, representing the name of the current PRD document.
 * 3. Use `history.replaceState()` to modify the current entry in the browser's session history.
 *    a. The `state` object contains the `index` of the current document.
 *    b. The `title` is an empty string.
 *    c. The `url` is constructed from the current `pathname` and the updated `search` parameters.
 *
 * @param {string[]} baseNames - An array of base names for the PRD documents.
 * @param {number} index - The index of the current PRD document in the `baseNames` array.
 * @returns {void}
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
    if (i !== null) selectDoc(i);
  };
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
