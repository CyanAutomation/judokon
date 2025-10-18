/**
 * Conditionally expose the Classic Battle test API when running under test
 * runners (Vitest, Playwright) without bundling the heavyweight helpers in
 * production.
 *
 * @pseudocode
 * 1. Detect common Node-based and browser-based test environments.
 * 2. If not in a test environment, exit early.
 * 3. Dynamically import the test API module and invoke `exposeTestAPI()`.
 * 4. Swallow any errors to avoid noisy failures during bootstrap.
 *
 * @returns {Promise<void>} Resolves once the exposure attempt completes.
 */
export async function exposeClassicBattleTestAPI() {
  if (!shouldExposeTestAPI()) {
    return;
  }

  try {
    const mod = await import("../testApi.js");
    mod?.exposeTestAPI?.();
  } catch (error) {
    // Ignore exposure failures; tests can manually import as a fallback.
  }
}

function shouldExposeTestAPI() {
  if (typeof process !== "undefined") {
    if (process.env?.NODE_ENV === "test") return true;
    if (process.env?.VITEST === "true" || process.env?.VITEST === true) {
      return true;
    }
  }

  if (typeof window !== "undefined") {
    try {
      if (window.__TEST__ || window.__VITEST__ || window.__PLAYWRIGHT__) {
        return true;
      }
    } catch {}

    const href = (() => {
      try {
        return window.location?.href || "";
      } catch {
        return "";
      }
    })();
    if (href.includes("127.0.0.1") || href.includes("localhost")) {
      return true;
    }

    const nav = (() => {
      try {
        return window.navigator;
      } catch {
        return undefined;
      }
    })();
    if (!nav) return false;

    if (nav.webdriver) {
      return true;
    }

    let userAgent = "";
    try {
      if (typeof nav.userAgent === "string") {
        userAgent = nav.userAgent.toLowerCase();
      }
    } catch {}

    if (!userAgent) {
      try {
        const brands = nav.userAgentData?.brands;
        if (Array.isArray(brands)) {
          userAgent = brands
            .map((brand) => brand.brand)
            .join(" ")
            .toLowerCase();
        }
      } catch {
        userAgent = "";
      }
    }

    if (!userAgent) {
      return false;
    }

    if (userAgent.includes("playwright")) {
      return true;
    }
    if (userAgent.includes("headless")) {
      return true;
    }
  }

  return false;
}
