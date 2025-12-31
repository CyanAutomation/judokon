# Playwright Test Failures & Resolutions

This document logs significant Playwright test failures, their root causes, and resolutions or workarounds implemented. It serves as a historical reference to common issues encountered during Playwright test development and execution.

---

### Failure: CLI `describe` command fails due to `md5` hash calculation

**Problem:**
The CLI `describe` command was failing, specifically related to the `md5` hash calculation of page metadata. The error indicated that the `metadata` object was unexpectedly `None`, leading to an `AttributeError` when attempting to `.encode()`.

**Root Cause (if known):**
The `get_page_metadata` function, called within `describe_page`, was returning `None` in certain scenarios, particularly when the `WebSurfer.getPageMetadata()` JavaScript function on the page did not yield a dictionary or returned an empty/invalid value. The `metadata` variable was not explicitly checked for `None` before being used in `json.dumps` and subsequently in the `md5` hash calculation.

**Resolution/Workaround:**
Added a check in `get_page_metadata` to ensure that if `WebSurfer.getPageMetadata()` returns `None` or an empty/non-dictionary value, an empty dictionary `{}` is returned instead. This prevents the `AttributeError` during hash calculation and ensures `json.dumps` always receives a valid input.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):** [YYYY-MM-DD]
**Relevant Files/PRs:** `playwright/cli.spec.js`, `src/playwright/playwright_controller.py`

---


### Failure: CLI `scroll` command fails with invalid direction

**Problem:**
The CLI `scroll` command was failing when an invalid direction (e.g., "top", "bottom") was provided, as the underlying Playwright `scroll_id` function only accepts "up" or "down".

**Root Cause (if known):**
The CLI command parser was not strictly validating the `direction` argument before passing it to `scroll_id`. The `scroll_id` function itself expected only "up" or "down", leading to unexpected behavior or errors with other values.

**Resolution/Workaround:**
Implemented validation for the `direction` argument in the CLI parsing logic to restrict it to "up" or "down". Added a clear error message for invalid inputs.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable): [YYYY-MM-DD]
**Relevant Files/PRs:** `playwright/cli.spec.js`

---


### Failure: `playwright.test_get_all_webpage_text` test passes when it should fail

**Problem:**
The test `playwright.test_get_all_webpage_text` was incorrectly passing even when `n_lines` was set to a very small number (e.g., 1 or 2), which should ideally truncate the output and potentially cause an assertion related to content presence to fail. The assertion `assert "Welcome to the Fake Page" in text` was passing because the entire text was being returned regardless of `n_lines`.

**Root Cause (if known):**
The `WebpageTextUtilsPlaywright.get_all_webpage_text` function's internal logic was not correctly applying the `n_lines` truncation. Specifically, the line `text_in_viewport = "\n".join(text_in_viewport.split("\n")[:n_lines])` was not effectively limiting the content if the page had fewer lines than `n_lines`, or if the assertion was too broad to catch the truncation.

**Resolution/Workaround:**
Modified `WebpageTextUtilsPlaywright.get_all_webpage_text` to correctly apply `n_lines` for truncation and to remove empty lines more robustly. Updated the test to use a more precise assertion that would fail if truncation was not applied as expected.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `playwright/test_playwright_controller.py`, `src/playwright/webpage_text_utils.py`

---


### Failure: Playwright `click_id` fails when element is not visible

**Problem:**
The `click_id` function was failing to locate or click elements that were hidden or not visible on the page, even if they existed in the DOM. This led to `PlaywrightTimeoutError` because `wait_for_selector` was not considering the visibility state correctly, or the element was covered.

**Root Cause (if known):**
The `wait_for_selector` call within `click_id` was not explicitly configured to wait for the element to be in a 'visible' state. Additionally, `scroll_into_view_if_needed()` might not always make an element fully clickable if it's obscured by other elements or off-screen in a way that Playwright's click logic can't handle.

**Resolution/Workaround:**
Updated the `wait_for_selector` call in `click_id` to include `state="visible"`. Also ensured `scroll_into_view_if_needed()` is called. These changes ensure that Playwright explicitly waits for the element to be both present and visible before attempting to interact with it, reducing failures due to hidden or off-screen elements.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`

---


### Failure: Playwright `select_option` issue with single/multi-select dropdowns

**Problem:**
The `select_option` function was intermittently failing to correctly select options in various dropdowns, particularly in custom-styled ones or multi-select elements. It seemed to struggle with programmatic selection when a direct click wasn't feasible or sufficient.

**Root Cause (if known):**
The original `select_option` logic primarily relied on clicking if the element was visible. If clicking failed, it attempted a generic programmatic approach that might not trigger all necessary events for custom dropdowns (e.g., `change`, `input`, `blur`). For multi-selects, it might have been only selecting one option or not correctly dispatching events.

**Resolution/Workaround:**
Enhanced `select_option` with more robust event dispatching for programmatic selection, including `mousedown`, `mouseup`, `click`, and `change` events. Added handling for `aria-selected` attributes and `data-value` on parent elements to better support custom dropdowns. Prioritized direct click if element is visible and has a bounding box, then falls back to comprehensive event dispatching.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`, `playwright/multiple-options.spec.js`, `playwright/expanded-dropdown.spec.js`

---


### Failure: Playwright `fill_id` fails to fill correctly for `target=_blank` elements in single-tab mode

**Problem:**
When `fill_id` was used in `single_tab_mode`, elements with `target=_blank` attributes (e.g., forms or links that would normally open a new tab upon submission/click) were causing issues. The content was either not being filled, or the page state was becoming inconsistent.

**Root Cause (if known):**
The `single_tab_mode` logic in `fill_id` (and potentially other interaction functions) was not comprehensively removing `target=_blank` attributes from all relevant elements that might interfere with same-tab navigation or form submission. It was specifically missing forms and anchors.

**Resolution/Workaround:**
Updated `fill_id` to iterate through all `a[target=_blank]` and `form[target=_blank]` elements on the page and remove their `target` attributes when `single_tab_mode` is active. This ensures that any action that would typically open a new tab is instead handled within the current tab, maintaining the `single_tab_mode` integrity.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`

---


### Failure: Playwright `hover_id` element not found

**Problem:**
The `hover_id` function occasionally failed with a "No such element" error, even when the element was visually present on the page. This occurred particularly during rapid test execution or when elements were dynamically loaded.

**Root Cause (if known):**
Similar to `click_id`, the `hover_id` function was attempting to hover without explicitly waiting for the element to be fully loaded and visible. The `target.wait_for(timeout=5000)` might not be sufficient if the element's visibility state was still changing.

**Resolution/Workaround:**
Ensured that `hover_id` uses `target.wait_for(state="visible")` or a similar mechanism to guarantee the element is ready for interaction. Implemented a small `asyncio.sleep(0.3)` after `scroll_into_view_if_needed()` to allow the browser to render the element after scrolling.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`

---


### Failure: `describe_page`'s `get_screenshot` option returns `None` on some pages

**Problem:**
The `get_screenshot` option within `describe_page` was sometimes returning `None` instead of screenshot bytes, especially on pages that were slow to load or encountered rendering issues. The warning "Screenshot failed, page might not be loaded" was observed.

**Root Cause (if known):**
The `page.screenshot()` call could fail if the page was still loading, had a script error, or was in an unstable state. The initial `wait_for_load_state` might not cover all scenarios, leading to a race condition where a screenshot was attempted before the page was fully renderable.

**Resolution/Workaround:**
Implemented a retry mechanism within `get_screenshot`. If the initial `page.screenshot()` fails, the page is reloaded (`page.evaluate("window.stop()")` then `page.reload()`) and a second attempt to capture the screenshot is made. This improves robustness for flaky page loads.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`

---


### Failure: Incorrect PDF content extraction in `get_page_markdown`

**Problem:**
When `get_page_markdown` was used on PDF documents, the extracted content was often incomplete, malformed, or entirely missing, especially for PDFs embedded in HTML or rendered by client-side viewers (like PDF.js). The initial PDF extraction logic primarily relied on `page.evaluate()` to scrape visible text, which is often insufficient for complex PDF structures or text within canvases. The fallback to `MarkItDown` required downloading the PDF, which wasn't always triggered effectively or correctly handled for all PDF types.

**Resolution/Workaround:**
Enhanced `_is_pdf_page` to check for `document.contentType`, `embed[type="application/pdf"]`, `object[type="application/pdf"]`, and `window.PDFViewerApplication` to more reliably detect PDFs. Improved `_extract_pdf_content` with a multi-pronged approach: first, a browser-based extraction (if `PDFViewerApplication` is available or by scraping visible text), and if that yields insufficient results, a robust fallback to download the PDF and use `MarkItDown` for extraction.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/webpage_text_utils.py`

---


### Failure: CLI `switch_tab` and `close_tab` lead to incorrect active page or errors

**Problem:**
When using CLI commands for `switch_tab` and `close_tab`, the active page context was sometimes not correctly updated, or `close_tab` would error when attempting to close the last remaining tab. `switch_tab` also failed to correctly bring the tab to the foreground.

**Root Cause (if known):**
The logic for `switch_tab` was missing a step to explicitly bring the target tab to the foreground using `tab.bring_to_front()`. For `close_tab`, there was no explicit check to prevent closing the last tab in the context, and the logic for selecting the new active tab after closing was simplistic.

**Resolution/Workaround:**
In `switch_tab`, added `await tab.bring_to_front()` to ensure the selected tab becomes the active one. In `close_tab`, added a check `if len(tabs) == 1:` to raise a `ValueError` if an attempt is made to close the last tab. Improved the logic for selecting the new active tab after closure to ensure a valid tab is always chosen (e.g., if tab 0 is closed, switch to tab 1; otherwise, switch to `tab_id - 1`).

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`, `playwright/cli.spec.js`

---


### Failure: `on_new_page` `wait_for_load_state` timeout during page blocking

**Problem:**
When `on_new_page` was blocking a URL (e.g., due to URL status manager rules), the subsequent `page.wait_for_load_state` call would often timeout, even though the page wasn't technically "loading" in a way that would ever complete successfully. This caused unnecessary delays and warnings.

**Root Cause (if known):**
When a page is blocked, its navigation might not reach a "load" state, as network requests are aborted. `wait_for_load_state` patiently waits for an event that will never come, leading to a timeout.

**Resolution/Workaround:**
Added a `try-except PlaywrightTimeoutError` block around `page.wait_for_load_state` within `on_new_page`. If a timeout occurs, a warning is logged, and `page.evaluate("window.stop()")` is called to explicitly stop any pending network activity, preventing further waiting.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `src/playwright/playwright_controller.py`

---


### Failure: `test_new_page_button` in `PlaywrightController` leads to `page is not defined`

**Problem:**
The `test_new_page_button` was failing with a `page is not defined` error within the test itself, specifically related to accessing `page.content()` after a `click_id` operation, when `single_tab_mode` was active.

**Root Cause (if known):**
In `single_tab_mode`, `click_id` now ensures navigation happens in the same tab. The original test logic assumed that `new_page` returned by `click_id` would always be a new page object, but in `single_tab_mode`, it returns `None`. The subsequent assertions then tried to use `new_page.content()` without a `None` check.

**Resolution/Workaround:**
Modified `test_new_page_button` to correctly differentiate behavior based on `single_tab_mode`. If `single_tab_mode` is `True`, it now correctly asserts that `new_page` is `None` and checks `page.content()` (the original page) for the new content. If `single_tab_mode` is `False`, it asserts that `new_page` is not `None` and checks `new_page.content()`.

**Status:**
Resolved

**Date Identified:** [YYYY-MM-DD]
**Date Resolved (if applicable):` [YYYY-MM-DD]
**Relevant Files/PRs:** `playwright/test_playwright_controller.py`

---