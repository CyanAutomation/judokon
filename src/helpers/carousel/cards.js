import { generateJudokaCard } from "../cardBuilder.js";
import { getFallbackJudoka } from "../judokaUtils.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "../judokaValidation.js";

/**
 * Generate judoka cards and append them to the container.
 *
 * @pseudocode
 * 1. Initialize an empty array `pendingReplacements` to track asynchronous card replacement tasks.
 * 2. Iterate through each `judoka` object in `judokaList`:
 *    a. Initialize `entry` with the current `judoka`.
 *    b. Validate `judoka` using `hasRequiredJudokaFields()`:
 *       i. If validation fails, log an error with missing fields using `getMissingJudokaFields()`.
 *       ii. Set `entry` to a fallback judoka obtained asynchronously via `getFallbackJudoka()`.
 *    c. Generate a `card` element asynchronously using `generateJudokaCard(entry, gokyoLookup, container)`.
 *    d. If `card` generation fails (returns `null` or `undefined`):
 *       i. Log a warning.
 *       ii. Obtain another fallback judoka.
 *       iii. Attempt to generate a `card` again with the new fallback.
 *    e. If a `card` is successfully generated:
 *       i. Query for an `<img>` element within the `card`.
 *       ii. If an `img` element is found:
 *          1. Add an "error" event listener to the `img` element (set to run `once`).
 *          2. Inside the error listener, define an asynchronous `task`:
 *             a. Obtain a fallback judoka.
 *             b. Generate a `fallbackCard` without appending it to the container.
 *             c. If `fallbackCard` is valid and the original `card` is still in the DOM, replace the original `card` with `fallbackCard`.
 *             d. If the original `card` is no longer in the DOM but its parent exists, append the `fallbackCard` to the parent.
 *             e. Catch and log any errors during the fallback swap.
 *          3. Push this `task` Promise into `pendingReplacements`.
 *       iii. Set `card.tabIndex` to 0 to make it focusable.
 *       iv. Set `card.setAttribute("role", "listitem")`.
 *       v. Set `card.setAttribute("aria-label", card.getAttribute("data-judoka-name") || "Judoka card")` using the judoka's name or a generic label.
 *       vi. Append the `card` to the `container`.
 * 3. After the loop, yield control to the event loop using `await Promise.resolve()` to allow any synchronously dispatched image error events to register their tasks.
 * 4. If `pendingReplacements` contains any tasks, await their completion using `Promise.allSettled()`.
 * 5. Return (the function implicitly resolves after all operations).
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {Judoka[]} judokaList - Array of judoka objects.
 * @param {Object} gokyoLookup - Lookup object for gokyo data.
 * @returns {Promise<void>} Resolves after cards are appended (not after images load).
 */
export async function appendCards(container, judokaList, gokyoLookup) {
  // Track any in-flight replacements triggered during this execution.
  const pendingReplacements = [];
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
      const img = card.querySelector("img");
      if (img) {
        // Handle portrait load errors by swapping to a fallback card, but
        // do not block on image load events while building the carousel.
        img.addEventListener(
          "error",
          () => {
            // Start the replacement asynchronously and track it so that
            // appendCards can await if the error occurs before it returns.
            const task = (async () => {
              try {
                const fallback = await getFallbackJudoka();
                // Build a replacement card without auto-appending to container.
                const fallbackCard = await generateJudokaCard(fallback, gokyoLookup);
                if (fallbackCard) {
                  const parent = container || card.parentElement;
                  if (parent && parent.contains(card)) {
                    parent.replaceChild(fallbackCard, card);
                  } else if (parent) {
                    parent.appendChild(fallbackCard);
                  }
                }
              } catch (err) {
                console.error("Failed to swap to fallback card", err);
              }
            })();
            pendingReplacements.push(task);
          },
          { once: true }
        );
      }
      card.tabIndex = 0;
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", card.getAttribute("data-judoka-name") || "Judoka card");
      container.appendChild(card);
    }
  }
  // Give the event loop a turn so any synchronously dispatched image
  // error events can register tasks, then await them.
  await Promise.resolve();
  if (pendingReplacements.length) {
    await Promise.allSettled(pendingReplacements);
  }
  return;
}
