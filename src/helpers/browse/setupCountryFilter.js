import { toggleCountryPanel } from "../countryPanel.js";
/**
 * Highlight the selected flag button within a container.
 *
 * @pseudocode
 * 1. Remove `selected` class from all flag buttons in the container.
 * 2. Add `selected` class to the provided button.
 *
 * @param {Element} container
 * @param {HTMLButtonElement} button
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Highlight the selected flag button within a container.
 *
 * @summary Remove `selected` from all flag buttons in `container` and add it to `button`.
 * @pseudocode
 * 1. Remove `selected` from all `button.flag-button` in the container.
 * 2. Add `selected` class to the provided `button`.
 *
 * @param {Element} container - Container that holds flag buttons.
 * @param {HTMLButtonElement} button - The button to mark as selected.
 * @returns {void}
 */
export function highlightSelection(container, button) {
  const buttons = container.querySelectorAll("button.flag-button");
  buttons.forEach((b) => b.classList.remove("selected"));
  button.classList.add("selected");
}

/**
 * Clear the country filter and reset judoka list.
 *
 * @pseudocode
 * 1. Deselect all country buttons.
 * 2. Render the full judoka list.
 * 3. Update the live region to show all countries.
 * 4. Close the country panel.
 *
 * @param {Element} listContainer
 * @param {Array<Judoka>} judokaList
 * @param {Function} render
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {(count: number, country: string) => void} updateLiveRegion
 * @returns {Promise<void>}
 */
export async function clearCountryFilter(
  listContainer,
  judokaList,
  render,
  toggleButton,
  panel,
  updateLiveRegion
) {
  const buttons = listContainer.querySelectorAll("button.flag-button");
  buttons.forEach((b) => b.classList.remove("selected"));
  await render(judokaList);
  updateLiveRegion(judokaList.length, "all countries");
  toggleCountryPanel(toggleButton, panel, false);
}

/**
 * Apply a country filter and render the resulting judoka list.
 *
 * @pseudocode
 * 1. Highlight the selected flag button.
 * 2. Filter judoka by the button's country value.
 * 3. Render the filtered list.
 * 4. Update the live region with the result count.
 * 5. Remove existing no-results message.
 * 6. If no results, append a no-results message.
 * 7. Close the country panel.
 *
 * @param {HTMLButtonElement} button
 * @param {Element} listContainer
 * @param {Array<Judoka>} judokaList
 * @param {Function} render
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {Element} carouselEl
 * @param {(count: number, country: string) => void} updateLiveRegion
 * @returns {Promise<void>}
 */
export async function applyCountryFilter(
  button,
  listContainer,
  judokaList,
  render,
  toggleButton,
  panel,
  carouselEl,
  updateLiveRegion
) {
  const selected = button.value;
  highlightSelection(listContainer, button);
  const filtered =
    selected === "all" ? judokaList : judokaList.filter((j) => j.country === selected);
  await render(filtered);
  updateLiveRegion(filtered.length, selected === "all" ? "all countries" : selected);
  const existingMessage = carouselEl.querySelector(".no-results-message");
  if (existingMessage) {
    existingMessage.remove();
  }
  if (filtered.length === 0) {
    const noResultsMessage = document.createElement("div");
    noResultsMessage.className = "no-results-message";
    noResultsMessage.setAttribute("role", "status");
    noResultsMessage.setAttribute("aria-live", "polite");
    noResultsMessage.textContent = "No judoka available for this country";
    carouselEl.appendChild(noResultsMessage);
  }
  toggleCountryPanel(toggleButton, panel, false);
}

/**
 * Configure country filter interactions for the carousel.
 *
 * @pseudocode
 * 1. Define helper to update aria-live region with count and country.
 * 2. On clearButton click:
 *    a. Deselect all country buttons.
 *    b. Render full judoka list.
 *    c. Update live region.
 *    d. Close country panel.
 * 3. On listContainer click:
 *    a. If clicked element is a flag button:
 *       i. Determine selected country.
 *       ii. Highlight selection.
 *       iii. Filter judokaList by country.
 *       iv. Render filtered list.
 *       v. Update live region.
 *       vi. Remove any existing no-results message.
 *       vii. If no results, show 'no-results-message'.
 *       viii. Close country panel.
 *
 * @param {Element} listContainer
 * @param {HTMLButtonElement} clearButton
 * @param {Array<Judoka>} judokaList
 * @param {Function} render
 * @param {HTMLButtonElement} toggleButton
 * @param {Element} panel
 * @param {Element} carouselEl
 * @param {Element} ariaLiveEl
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Configure country filter interactions for the carousel.
 *
 * @summary Wire up event handlers for country filter UI: clear and selection handling.
 * @pseudocode
 * 1. Attach click handler to the clear button that resets the filter.
 * 2. Attach click handler to `listContainer` to handle flag button selection and filtering.
 *
 * @param {Element} listContainer - Container that contains flag buttons.
 * @param {HTMLButtonElement} clearButton - Button to clear the country filter.
 * @param {Array<Judoka>} judokaList - Full judoka dataset.
 * @param {Function} render - Rendering function that accepts filtered lists.
 * @param {HTMLButtonElement} toggleButton - Toggle control for the country panel.
 * @param {Element} panel - The country panel element.
 * @param {Element} carouselEl - Carousel element used to show no-results messages.
 * @param {Element} ariaLiveEl - Live region element to announce counts.
 * @returns {void}
 */
export function setupCountryFilter(
  listContainer,
  clearButton,
  judokaList,
  render,
  toggleButton,
  panel,
  carouselEl,
  ariaLiveEl
) {
  let liveRegion = ariaLiveEl;

  function updateLiveRegion(count, country) {
    liveRegion = carouselEl.querySelector(".carousel-aria-live") || liveRegion;
    liveRegion.textContent = `Showing ${count} judoka for ${country}`;
  }

  clearButton.addEventListener("click", async () => {
    await clearCountryFilter(
      listContainer,
      judokaList,
      render,
      toggleButton,
      panel,
      updateLiveRegion
    );
  });

  listContainer.addEventListener("click", async (e) => {
    const button = e.target.closest("button.flag-button");
    if (!button) return;
    await applyCountryFilter(
      button,
      listContainer,
      judokaList,
      render,
      toggleButton,
      panel,
      carouselEl,
      updateLiveRegion
    );
  });
}

export default setupCountryFilter;
