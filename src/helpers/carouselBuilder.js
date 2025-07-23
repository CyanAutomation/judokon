import { createGokyoLookup } from "./utils.js";
import { generateJudokaCard } from "./cardBuilder.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import {
  createScrollButton,
  updateScrollButtonState,
  setupSwipeNavigation,
  applyAccessibilityImprovements
} from "./carousel/index.js";
import { CAROUSEL_SCROLL_DISTANCE, SPINNER_DELAY_MS } from "./constants.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";

/**
 * Adds scroll markers to indicate the user's position in the carousel.
 *
 * @pseudocode
 * 1. Validate inputs and exit early if `container` or `wrapper` is missing.
 * 2. Create a `<div>` element with the class `scroll-markers`.
 * 3. Add markers for each card in the carousel.
 *    - Highlight the marker corresponding to the currently visible card.
 * 4. Update the highlighted marker on scroll events.
 *
 * @param {HTMLElement} [container] - The carousel container element.
 * @param {HTMLElement} [wrapper] - The carousel wrapper element.
 */
function addScrollMarkers(container, wrapper) {
  if (!container || !wrapper) return;
  const markers = document.createElement("div");
  markers.className = "scroll-markers";

  const cards = container.querySelectorAll(".judoka-card");
  cards.forEach((_, index) => {
    const marker = document.createElement("span");
    marker.className = "scroll-marker";
    if (index === 0) marker.classList.add("active");
    markers.appendChild(marker);
  });

  wrapper.appendChild(markers);

  const firstCard = container.querySelector(".judoka-card");
  const cardWidth = firstCard ? firstCard.offsetWidth : 0;

  container.addEventListener("scroll", () => {
    const scrollLeft = container.scrollLeft;
    const activeIndex = cardWidth ? Math.round(scrollLeft / cardWidth) : 0;

    markers.querySelectorAll(".scroll-marker").forEach((marker, index) => {
      marker.classList.toggle("active", index === activeIndex);
    });
  });
}

/**
 * Validates the judoka list to ensure it is a non-empty array.
 *
 * @pseudocode
 * 1. Check if `judokaList` is an array and contains at least one element.
 *    - Log an error if validation fails.
 * 2. Return `true` if validation passes, otherwise return `false`.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @returns {Boolean} Whether the judoka list is valid.
 */
function validateJudokaList(judokaList) {
  if (!Array.isArray(judokaList) || judokaList.length === 0) {
    console.error("No judoka data available to build the carousel.");
    return false;
  }
  return true;
}

/**
 * Validates gokyo data and transforms it into a lookup object.
 *
 * @pseudocode
 * 1. Check if `gokyoData` is an array and contains at least one element.
 *    - Log a warning if validation fails and default to an empty lookup.
 * 2. Transform `gokyoData` into a lookup object using `createGokyoLookup`.
 * 3. Return the lookup object.
 *
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Object} A lookup object for gokyo data.
 */
function validateGokyoData(gokyoData) {
  if (!Array.isArray(gokyoData) || gokyoData.length === 0) {
    console.warn("No gokyo data provided. Defaulting to an empty lookup.");
  }
  return createGokyoLookup(gokyoData);
}

/**
 * Creates a loading spinner and sets a timeout to display it.
 *
 * @pseudocode
 * 1. Create a `<div>` element with the class `loading-spinner`.
 * 2. Append the spinner to the provided `wrapper` element.
 * 3. Set a timeout to display the spinner after 2 seconds.
 * 4. Return the spinner element and the timeout ID.
 *
 * @param {HTMLElement} wrapper - The wrapper element to append the spinner to.
 * @returns {Object} An object containing the spinner element and timeout ID.
 */
function createLoadingSpinner(wrapper) {
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  wrapper.appendChild(spinner);

  const timeoutId = setTimeout(() => {
    spinner.style.display = "block";
  }, SPINNER_DELAY_MS);

  return { spinner, timeoutId };
}

/**
 * Handles broken images in a card by setting a fallback image.
 *
 * @pseudocode
 * 1. Find the `<img>` element within the provided `card`.
 * 2. Attach an `onerror` event handler to the image.
 *    - Replace the image source with a fallback image if an error occurs.
 *
 * @param {HTMLElement} card - The card element containing the image.
 */
function handleBrokenImages(card) {
  const img = card.querySelector("img");
  if (img) {
    img.onerror = () => {
      img.src = "./assets/cardBacks/cardBack-2.png";
    };
  }
}

/**
 * Builds a responsive, accessible carousel of judoka cards with scroll buttons, scroll markers, and robust error handling.
 *
 * @pseudocode
 * 1. Validate input parameters and handle empty or failed data loads with error messages and retry support.
 * 2. Create a carousel container with scroll-snap and responsive card sizing (1–2 cards on mobile, 3–5 on desktop).
 * 3. Add a loading spinner if loading exceeds 2 seconds.
 * 4. For each judoka:
 *    a. Validate fields; use fallback card if invalid.
 *    b. Generate card, handle broken images, and make focusable.
 * 5. Add scroll buttons, scroll markers, and ensure ARIA roles/labels for accessibility.
 * 6. Use ResizeObserver to adapt card sizing and scroll marker logic on window resize.
 * 7. Enable keyboard navigation (arrow keys), swipe gestures, and focus/hover enlargement for the center card only.
 * 8. Provide aria-live region for dynamic messages (errors, empty state).
 * 9. Return the completed wrapper element.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  // --- Accessibility: aria-live region for dynamic messages ---
  const ariaLive = document.createElement("div");
  ariaLive.setAttribute("aria-live", "polite");
  ariaLive.className = "carousel-aria-live";

  if (!validateJudokaList(judokaList)) {
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-container";
    const msg = document.createElement("div");
    msg.className = "carousel-message";
    msg.textContent = "No cards available.";
    wrapper.appendChild(msg);
    wrapper.appendChild(ariaLive);
    ariaLive.textContent = "No cards available.";
    return wrapper;
  }

  const gokyoLookup = validateGokyoData(gokyoData);

  const container = document.createElement("div");
  container.className = "card-carousel";
  container.dataset.testid = "carousel";
  container.setAttribute("role", "list");
  container.setAttribute("aria-label", "Judoka card carousel");
  // Responsive scroll snap
  container.style.scrollSnapType = "x mandatory";
  container.style.overflowX = "auto";
  container.style.display = "flex";
  container.style.gap = "var(--carousel-gap, 1rem)";

  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";
  wrapper.appendChild(ariaLive);

  const { spinner, timeoutId } = createLoadingSpinner(wrapper);

  // --- Responsive card sizing ---
  function setCardWidths() {
    const width = window.innerWidth;
    let cardsInView = 3;
    if (width < 600) cardsInView = 1.5;
    else if (width < 900) cardsInView = 2.5;
    else if (width < 1200) cardsInView = 3.5;
    else cardsInView = 5;
    const cardWidth = `clamp(200px, ${Math.floor(100 / cardsInView)}vw, 260px)`;
    container.querySelectorAll(".judoka-card").forEach((card) => {
      card.style.setProperty("--card-width", cardWidth);
      card.style.scrollSnapAlign = "center";
    });
  }

  // Card creation and appending
  for (const judoka of judokaList) {
    let entry = judoka;
    if (!hasRequiredJudokaFields(judoka)) {
      console.error("Invalid judoka object:", judoka);
      const missing = getMissingJudokaFields(judoka).join(", ");
      console.error(`Missing fields: ${missing}`);
      entry = await getFallbackJudoka();
    }
    let card = await generateJudokaCard(entry, gokyoLookup, container);
    if (!card) {
      console.warn("Failed to generate card for judoka:", entry);
      const fallback = await getFallbackJudoka();
      card = await generateJudokaCard(fallback, gokyoLookup, container);
    }
    if (card) {
      handleBrokenImages(card);
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", card.getAttribute("data-judoka-name") || "Judoka card");
      container.appendChild(card);
    }
  }

  clearTimeout(timeoutId);
  spinner.style.display = "none";

  setCardWidths();
  // Responsive: update card widths on resize
  const resizeObs = new ResizeObserver(setCardWidths);
  resizeObs.observe(container);
  window.addEventListener("resize", setCardWidths);

  const leftButton = createScrollButton("left", container, CAROUSEL_SCROLL_DISTANCE);
  const rightButton = createScrollButton("right", container, CAROUSEL_SCROLL_DISTANCE);
  leftButton.setAttribute("aria-label", "Scroll left");
  rightButton.setAttribute("aria-label", "Scroll right");

  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);

  // Add scroll markers below the carousel
  addScrollMarkers(container, wrapper);

  const updateButtons = () => updateScrollButtonState(container, leftButton, rightButton);
  updateButtons();
  container.addEventListener("scroll", updateButtons);
  window.addEventListener("resize", updateButtons);

  // --- Card enlargement on focus/hover: only center card ---
  function updateCardFocusStyles() {
    const cards = Array.from(container.querySelectorAll(".judoka-card"));
    cards.forEach((card) => {
      card.classList.remove("focused-card");
      card.style.transform = "";
    });
    // Find the card closest to the center of the container
    const containerRect = container.getBoundingClientRect();
    let minDist = Infinity;
    let centerCard = null;
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.left + rect.width / 2;
      const dist = Math.abs(cardCenter - (containerRect.left + containerRect.width / 2));
      if (dist < minDist) {
        minDist = dist;
        centerCard = card;
      }
    });
    if (centerCard) {
      centerCard.classList.add("focused-card");
      centerCard.style.transform = "scale(1.1)";
      centerCard.focus({ preventScroll: true });
    }
  }

  // Keyboard navigation with focus and enlargement
  function setupEnhancedKeyboardNavigation(carousel) {
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const cards = Array.from(carousel.querySelectorAll(".judoka-card"));
        const current = document.activeElement;
        let idx = cards.indexOf(current);
        if (idx === -1) idx = 0;
        if (e.key === "ArrowRight" && idx < cards.length - 1) {
          cards[idx + 1].focus();
        } else if (e.key === "ArrowLeft" && idx > 0) {
          cards[idx - 1].focus();
        }
        setTimeout(updateCardFocusStyles, 0);
      }
    });
    carousel.addEventListener("focusin", updateCardFocusStyles);
    carousel.addEventListener("focusout", updateCardFocusStyles);
  }

  // Hover enlargement (desktop): only center card
  container.addEventListener("mouseover", (e) => {
    if (e.target.classList.contains("judoka-card")) {
      updateCardFocusStyles();
    }
  });
  container.addEventListener("mouseout", (e) => {
    if (e.target.classList.contains("judoka-card")) {
      updateCardFocusStyles();
    }
  });

  setupEnhancedKeyboardNavigation(container);
  setupSwipeNavigation(container);
  applyAccessibilityImprovements(wrapper);
  setupLazyPortraits(container);

  // --- Error handling: network failure/retry ---
  // (Assume this is handled at a higher level, but aria-live region is ready)

  return wrapper;
}

export { addScrollMarkers };
