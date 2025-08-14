/**
 * Navigation utilities.
 *
 * @pseudocode
 * - resolveHomeHref: Build an absolute URL to the app's home (index.html)
 *   that preserves the repository base path (e.g., /judokon) across
 *   environments like local dev (/src/pages/...) or GH Pages (/pages/...).
 * - navigateToHome: Set window.location to the resolved home URL; fall back
 *   to history.replaceState when direct assignment is not available.
 */
export function resolveHomeHref() {
  try {
    const { origin, pathname } = window.location;
    // Capture everything before "/src/pages/" or "/pages/" to preserve base.
    const match = pathname.match(/^(.*?)(?:\/src\/pages\/|\/pages\/)/);
    const base = match ? match[1] : "/";
    const normalizedBase = base.endsWith("/") ? base : `${base}/`;
    return `${origin}${normalizedBase}index.html`;
  } catch {
    // Safe fallback for non-browser environments
    return "../../index.html";
  }
}

export function navigateToHome() {
  try {
    window.location.href = resolveHomeHref();
  } catch {
    try {
      const target = new URL(resolveHomeHref(), window.location.href).href;
      if (typeof history !== "undefined" && typeof history.replaceState === "function") {
        history.replaceState(null, "", target);
      }
    } catch {}
  }
}
