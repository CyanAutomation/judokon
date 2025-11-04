const DEFAULT_LAYOUT_ID = "unknown";
const DEFAULT_Z_INDEX = 1;
const cssEscape =
  typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape
    : (value) =>
        String(value).replace(
          /[\0-\x1f\x7f-\x9f\s!\"#$%&'()*+,.\/:;<=>?@\[\\\]^`{|}~]/g,
          (char) => `\\${char}`
        );

function getNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function resolveRoot(rootOrSelector) {
  if (!rootOrSelector) {
    if (typeof document === "undefined") return null;
    return document.querySelector("#battleRoot");
  }

  if (typeof rootOrSelector === "string") {
    if (typeof document === "undefined") return null;
    return document.querySelector(rootOrSelector);
  }

  return rootOrSelector;
}

function toPercent(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) {
    return 0;
  }
  return (value / total) * 100;
}

function ensureArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function shouldRenderRegion(region, isFeatureFlagEnabled) {
  const flagId = region?.visibleIf?.featureFlag;
  if (!flagId) return true;
  try {
    return Boolean(isFeatureFlagEnabled(flagId));
  } catch (error) {
    return false;
  }
}

function hideElement(element) {
  if (!element) return;
  element.setAttribute("data-layout-visibility", "hidden");
  element.setAttribute("hidden", "");
}

function showElement(element) {
  if (!element) return;
  element.setAttribute("data-layout-visibility", "visible");
  element.removeAttribute("hidden");
}

function applyRegionStyle(region, anchor, grid) {
  const { rect = {}, zIndex } = region;
  const { x = 0, y = 0, width = 0, height = 0 } = rect;

  const leftPercent = toPercent(x, grid.cols);
  const topPercent = toPercent(y, grid.rows);
  const widthPercent = toPercent(width, grid.cols);
  const heightPercent = toPercent(height, grid.rows);

  anchor.style.position = "absolute";
  anchor.style.left = `${leftPercent}%`;
  anchor.style.top = `${topPercent}%`;
  anchor.style.width = `${widthPercent}%`;
  anchor.style.height = `${heightPercent}%`;
  anchor.style.zIndex = `${Number.isFinite(zIndex) ? zIndex : DEFAULT_Z_INDEX}`;
  anchor.dataset.layoutRegionId = region.id || "";
}

function collectAnchors(root, regionId) {
  if (!root || !regionId) return [];
  const selector = `[data-layout-id="${cssEscape(regionId)}"]`;
  return Array.from(root.querySelectorAll(selector));
}

export function validateLayoutDefinition(layout) {
  const errors = [];
  if (!layout || typeof layout !== "object") {
    errors.push("Layout definition must be an object.");
    return { errors };
  }
  const { grid, regions } = layout;

  if (!grid || typeof grid !== "object") {
    errors.push("Layout grid is required.");
  } else {
    if (!Number.isFinite(grid.cols) || grid.cols <= 0) {
      errors.push("Layout grid.cols must be a positive number.");
    }
    if (!Number.isFinite(grid.rows) || grid.rows <= 0) {
      errors.push("Layout grid.rows must be a positive number.");
    }
  }

  if (!Array.isArray(regions) || regions.length === 0) {
    errors.push("Layout regions must be a non-empty array.");
  } else {
    const seenRegionIds = new Set();
    const gridCols = Number.isFinite(grid?.cols) ? grid.cols : null;
    const gridRows = Number.isFinite(grid?.rows) ? grid.rows : null;

    regions.forEach((region, index) => {
      if (!region || typeof region !== "object") {
        errors.push(`Layout region at index ${index} must be an object.`);
        return;
      }

      const regionId = typeof region.id === "string" ? region.id.trim() : "";
      if (!regionId) {
        errors.push(`Layout region at index ${index} requires a valid string id.`);
      } else if (seenRegionIds.has(regionId)) {
        errors.push(`Layout region id '${regionId}' is duplicated.`);
      } else {
        seenRegionIds.add(regionId);
      }

      if (region.visibleIf && typeof region.visibleIf === "object") {
        const flagId = region.visibleIf.featureFlag;
        if (flagId != null && (typeof flagId !== "string" || !flagId.trim())) {
          errors.push(
            `Layout region '${regionId || index}' visibleIf.featureFlag must be a non-empty string.`
          );
        }
      } else if (region.visibleIf != null) {
        errors.push(`Layout region '${regionId || index}' visibleIf must be an object when present.`);
      }

      const rect = region.rect;
      if (!rect || typeof rect !== "object") {
        errors.push(`Layout region '${regionId || index}' requires a rect object.`);
        return;
      }

      const { x, y, width, height } = rect;
      const rectFields = [
        ["x", x],
        ["y", y],
        ["width", width],
        ["height", height],
      ];

      rectFields.forEach(([key, value]) => {
        if (!Number.isFinite(value)) {
          errors.push(`Layout region '${regionId || index}' rect.${key} must be a finite number.`);
        } else if (value < 0) {
          errors.push(`Layout region '${regionId || index}' rect.${key} cannot be negative.`);
        }
      });

      if (Number.isFinite(width) && width === 0) {
        errors.push(`Layout region '${regionId || index}' rect.width must be greater than zero.`);
      }
      if (Number.isFinite(height) && height === 0) {
        errors.push(`Layout region '${regionId || index}' rect.height must be greater than zero.`);
      }

      if (
        Number.isFinite(gridCols) &&
        Number.isFinite(width) &&
        Number.isFinite(x) &&
        x + width > gridCols
      ) {
        errors.push(
          `Layout region '${regionId || index}' width exceeds grid bounds (x + width > cols).`
        );
      }

      if (
        Number.isFinite(gridRows) &&
        Number.isFinite(height) &&
        Number.isFinite(y) &&
        y + height > gridRows
      ) {
        errors.push(
          `Layout region '${regionId || index}' height exceeds grid bounds (y + height > rows).`
        );
      }
    });
  }

  return { errors };
}

function annotateRoot(root, layoutId, grid) {
  if (!root) return;
  root.dataset.appliedLayoutId = layoutId;
  if (!root.style.position) {
    root.style.position = "relative";
  }
  root.style.setProperty("--layout-grid-cols", `${grid.cols}`);
  root.style.setProperty("--layout-grid-rows", `${grid.rows}`);
}

/**
 * Applies grid-based layout regions to DOM anchors within a battle layout root.
 *
 * @summary Resolves the target root element, validates the layout payload, and
 * applies inline transforms (top/left/width/height/z-index) to anchors marked
 * with matching `data-layout-id` attributes. Regions gated by feature flags are
 * hidden by toggling the `hidden` attribute and `data-layout-visibility`.
 *
 * @pseudocode
 * 1. Resolve the target root element from options or fall back to `#battleRoot`.
 * 2. Validate the layout payload; abort early when critical fields are missing.
 * 3. Annotate the root with layout metadata and grid variables.
 * 4. Iterate regions, resolve matching anchors, and apply inline positioning.
 * 5. Toggle visibility based on `visibleIf.featureFlag`.
 * 6. Return telemetry capturing applied/skipped regions and duration.
 *
 * @param {object} layoutDefinition - The layout module export to apply.
 * @param {object} [options] - Configuration for feature flags, root resolution, and logging.
 * @param {Element|string} [options.root] - DOM element or selector for the layout root.
 * @param {Function} [options.isFeatureFlagEnabled] - Feature flag resolver.
 * @param {object} [options.logger] - Logger with `warn`/`error`.
 * @returns {{
 *   appliedLayoutId: string,
 *   appliedRegions: string[],
 *   skippedRegions: string[],
 *   missingAnchors: string[],
 *   durationMs: number,
 *   errors: string[]
 * }} Telemetry describing the outcome.
 */
function finalizeResult(result, start) {
  const stop = getNow();
  result.durationMs = stop - start;
  return result;
}

function processRegion(region, root, grid, resolver, warn, result) {
  if (!region || typeof region !== "object") {
    warn("layoutEngine.applyLayout: encountered invalid region definition.");
    return;
  }

  const anchors = collectAnchors(root, region.id);
  if (!anchors.length) {
    result.missingAnchors.push(region.id || "");
    warn(`layoutEngine.applyLayout: no anchor found for region '${region.id}'.`);
    return;
  }

  const shouldRender = shouldRenderRegion(region, resolver);
  const anchorList = ensureArray(anchors);

  anchorList.forEach((anchor) => {
    if (!shouldRender) {
      hideElement(anchor);
      result.skippedRegions.push(region.id);
      return;
    }

    showElement(anchor);
    applyRegionStyle(region, anchor, grid);
  });

  if (shouldRender) {
    result.appliedRegions.push(region.id);
  }
}

export function applyLayout(layoutDefinition, options = {}) {
  const start = getNow();
  const {
    root: rootOrSelector,
    isFeatureFlagEnabled = () => true,
    logger = {},
  } = options;
  const warn = typeof logger.warn === "function" ? logger.warn : () => {};
  const error = typeof logger.error === "function" ? logger.error : () => {};

  const result = {
    appliedLayoutId: DEFAULT_LAYOUT_ID,
    appliedRegions: [],
    skippedRegions: [],
    missingAnchors: [],
    durationMs: 0,
    errors: [],
  };

  const root = resolveRoot(rootOrSelector);
  if (!root) {
    result.errors.push("Layout root element could not be resolved.");
    error("layoutEngine.applyLayout: root element not found.");
    return finalizeResult(result, start);
  }

  const { errors } = validateLayoutDefinition(layoutDefinition);
  if (errors.length) {
    result.errors.push(...errors);
    errors.forEach((msg) => error(`layoutEngine.applyLayout: ${msg}`));
    return finalizeResult(result, start);
  }

  const layoutId = layoutDefinition.id || DEFAULT_LAYOUT_ID;
  const { grid, regions } = layoutDefinition;

  annotateRoot(root, layoutId, grid);
  result.appliedLayoutId = layoutId;

  regions.forEach((region) => {
    processRegion(region, root, grid, isFeatureFlagEnabled, warn, result);
  });

  return finalizeResult(result, start);
}

export default applyLayout;
