/**
 * Setup country search functionality for the country filter panel.
 *
 * @pseudocode
 * 1. Listen to input events on the search field.
 * 2. Filter visible country options based on the search query.
 * 3. Hide non-matching options and show matching ones.
 * 4. Announce results count via aria-live region.
 *
 * @param {HTMLInputElement} searchInput - The search input element.
 * @param {Element} countryListContainer - Container with country radio options.
 */
export function setupCountrySearch(searchInput, countryListContainer) {
  if (!searchInput || !countryListContainer) return;

  const filterOptions = () => {
    const query = searchInput.value.trim().toLowerCase();
    const fieldset = countryListContainer.querySelector("fieldset.country-filter-group");
    if (!fieldset) return;

    const labels = Array.from(fieldset.querySelectorAll("label.flag-button"));
    let visibleCount = 0;

    labels.forEach((label) => {
      const countryValue =
        label.getAttribute("data-country-value")?.toLowerCase() || "";
      const countryText = label.textContent?.toLowerCase() || "";

      const matches =
        !query ||
        countryValue.includes(query) ||
        countryText.includes(query) ||
        countryValue === "all";

      if (matches) {
        label.style.display = "";
        const input = fieldset.querySelector(`#${label.getAttribute("for")}`);
        if (input) input.style.display = "";
        visibleCount++;
      } else {
        label.style.display = "none";
        const input = fieldset.querySelector(`#${label.getAttribute("for")}`);
        if (input) input.style.display = "none";
      }
    });

    // Announce results for screen readers
    const ariaLive = searchInput.getAttribute("aria-live") || "polite";
    if (ariaLive && visibleCount === 0 && query) {
      // Could add an aria-live announcement here
    }
  };

  searchInput.addEventListener("input", filterOptions);

  // Clear search when panel closes
  const panel = document.getElementById("country-panel");
  if (panel) {
    const observer = new MutationObserver(() => {
      if (!panel.hasAttribute("open")) {
        searchInput.value = "";
        filterOptions(); // Reset visibility
      }
    });
    observer.observe(panel, { attributes: true, attributeFilter: ["open"] });
  }
}

/**
 * Setup keyboard navigation for country filter.
 * Allows typing first letter to jump to country.
 *
 * @pseudocode
 * 1. Listen to keydown events on the country list container.
 * 2. When a letter key is pressed, find the first country starting with that letter.
 * 3. Focus and check the matching radio input.
 * 4. Support repeated presses to cycle through matches.
 *
 * @param {Element} countryListContainer - Container with country radio options.
 */
export function setupKeyboardNavigation(countryListContainer) {
  if (!countryListContainer) return;

  let lastKey = "";
  let lastKeyTime = 0;
  let matchIndex = 0;

  countryListContainer.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    // Only handle single letter keys
    if (key.length !== 1 || !/[a-z]/.test(key)) return;

    // Prevent default to avoid triggering browser shortcuts
    event.preventDefault();

    const now = Date.now();
    const timeSinceLastKey = now - lastKeyTime;

    // Reset match index if different key or > 1 second elapsed
    if (key !== lastKey || timeSinceLastKey > 1000) {
      matchIndex = 0;
    } else {
      matchIndex++;
    }

    lastKey = key;
    lastKeyTime = now;

    const fieldset = countryListContainer.querySelector(
      "fieldset.country-filter-group"
    );
    if (!fieldset) return;

    const labels = Array.from(fieldset.querySelectorAll("label.flag-button"));
    const visibleLabels = labels.filter(
      (label) => label.style.display !== "none"
    );

    // Find matches starting with the typed letter
    const matches = visibleLabels.filter((label) => {
      const countryValue =
        label.getAttribute("data-country-value")?.toLowerCase() || "";
      return countryValue.startsWith(key) && countryValue !== "all";
    });

    if (matches.length === 0) return;

    // Cycle through matches
    const targetLabel = matches[matchIndex % matches.length];
    const inputId = targetLabel.getAttribute("for");
    const input = fieldset.querySelector(`#${inputId}`);

    if (input instanceof HTMLInputElement) {
      input.checked = true;
      input.focus();
      // Trigger change event to apply filter
      input.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true })
      );
    }
  });
}
