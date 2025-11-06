import { isEnabled as isFeatureFlagEnabledDefault } from "../featureFlags.js";
import { logEvent } from "../telemetry.js";

const DEFAULT_LAYOUT_ID = "unknown";
const DEFAULT_Z_INDEX = 1;

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

function evaluateVisibility(region, isFeatureFlagEnabled) {
  const flagId = region?.visibleIf?.featureFlag;
  if (!flagId) {
    return { isVisible: true, flagId: null };
  }

  let enabled = false;
  try {
    enabled = Boolean(isFeatureFlagEnabled(flagId));
  } catch {
    enabled = false;
  }

  return { isVisible: enabled, flagId };
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

function buildAnchorIndex(root) {
  const index = new Map();
  if (!root || typeof root.querySelectorAll !== "function") {
    return index;
  }

  const anchors = root.querySelectorAll("[data-layout-id]");
  anchors.forEach((anchor) => {
    const regionId = anchor.getAttribute("data-layout-id");
    if (!regionId) return;
    if (!index.has(regionId)) {
      index.set(regionId, []);
    }
    index.get(regionId).push(anchor);
  });

  return index;
}

function getAnimationFrameProvider(animationFrameProvider) {
  if (typeof animationFrameProvider === "function") {
    return animationFrameProvider;
  }

  if (typeof globalThis !== "undefined" && typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame.bind(globalThis);
  }

  return (callback) => {
    if (typeof callback === "function") {
      callback();
    }
  };
}

function enqueueMutation(queue, mutation) {
  if (typeof mutation === "function") {
    queue.push(mutation);
  }
}

function emitSkippedRegionTelemetry(layoutId, skippedByFeatureFlag, featureFlagDecisions) {
  if (!skippedByFeatureFlag.length) return;
  const skippedRegions = skippedByFeatureFlag.map((entry) => entry.regionId);
  const flags = Array.from(new Set(skippedByFeatureFlag.map((entry) => entry.flagId))).filter(
    Boolean
  );
  logEvent("layout.skippedRegions", {
    layoutId,
    skipped: skippedByFeatureFlag.map((entry) => ({ ...entry })),
    skippedRegions,
    flags,
    featureFlagDecisions
  });
}

function flushMutations(queue, schedule) {
  if (!Array.isArray(queue) || queue.length === 0) return;

  const runMutations = () => {
    queue.forEach((mutation) => {
      mutation();
    });
  };

  try {
    schedule(runMutations);
  } catch {
    runMutations();
  }
}

/**
 * Validates the structure of a layout definition payload before applying it.
 *
 * @summary Ensures the grid information is present, every region has a unique
 * identifier, and the rectangle metadata stays within the declared grid
 * bounds. Any violations are returned as human readable error strings so the
 * caller can surface them in logs or telemetry.
 *
 * @pseudocode
 * 1. Fail fast if the layout, grid, or regions collection are missing.
 * 2. Validate grid dimensions are positive finite numbers.
 * 3. Iterate regions to check identifiers, visibility predicates, and rect coordinates.
 * 4. Collect boundary violations whenever the rect exceeds the grid dimensions.
 * 5. Return an errors array summarizing all discovered issues.
 *
 * @param {object} layout - Raw layout configuration returned from a module or inline script.
 * @returns {{ errors: string[] }} An object containing any validation error messages.
 */
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
        if (
          flagId !== undefined &&
          flagId !== null &&
          (typeof flagId !== "string" || !flagId.trim())
        ) {
          errors.push(
            `Layout region '${regionId || index}' visibleIf.featureFlag must be a non-empty string.`
          );
        }
      } else if (region.visibleIf !== null && region.visibleIf !== undefined) {
        errors.push(
          `Layout region '${regionId || index}' visibleIf must be an object when present.`
        );
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
        ["height", height]
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

function finalizeResult(result, start) {
  const stop = getNow();
  result.durationMs = stop - start;
  return result;
}

function processRegion(
  region,
  anchorIndex,
  unusedAnchorIds,
  grid,
  resolver,
  warn,
  result,
  mutationQueue
) {
  if (!region || typeof region !== "object") {
    warn("layoutEngine.applyLayout: encountered invalid region definition.");
    return;
  }

  const anchors = anchorIndex.get(region.id) || [];
  if (!anchors.length) {
    result.missingAnchors.push(region.id || "");
    warn(`layoutEngine.applyLayout: no anchor found for region '${region.id}'.`);
    return;
  }

  unusedAnchorIds.delete(region.id);

  let anchorList = anchors;
  if (anchorList.length > 1) {
    result.conflictingAnchors.push(region.id);
    warn(
      `layoutEngine.applyLayout: multiple anchors found for region '${region.id}', using the first match.`
    );
    anchorList = [anchorList[0]];
  }

  const { isVisible, flagId } = evaluateVisibility(region, resolver);

  if (flagId) {
    result.featureFlagDecisions.push({
      regionId: region.id,
      flagId,
      enabled: isVisible
    });
  }

  if (!isVisible) {
    result.skippedRegions.push(region.id);
    if (flagId) {
      result.skippedByFeatureFlag.push({ regionId: region.id, flagId });
      warn(
        `layoutEngine.applyLayout: region '${region.id}' skipped – feature flag '${flagId}' disabled.`
      );
    }
    anchorList.forEach((anchor) => {
      enqueueMutation(mutationQueue, () => hideElement(anchor));
    });
    return;
  }

  anchorList.forEach((anchor) => {
    enqueueMutation(mutationQueue, () => {
      showElement(anchor);
      applyRegionStyle(region, anchor, grid);
    });
  });

  result.appliedRegions.push(region.id);
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
 * @param {Function} [options.animationFrameProvider] - Override for requestAnimationFrame scheduling.
 * @param {{ warn?: Function, error?: Function }} [options.logger] - Logger for warnings and errors.
 * @returns {{
 *   appliedLayoutId: string,
 *   appliedRegions: string[],
 *   skippedRegions: string[],
 *   missingAnchors: string[],
 *   conflictingAnchors: string[],
 *   orphanedAnchors: string[],
 *   skippedByFeatureFlag: { regionId: string, flagId: string }[],
 *   featureFlagDecisions: { regionId: string, flagId: string, enabled: boolean }[],
 *   durationMs: number,
 *   errors: string[]
 * }} Telemetry describing the outcome.
 */
export function applyLayout(layoutDefinition, options = {}) {
  const start = getNow();
  const {
    root: rootOrSelector,
    isFeatureFlagEnabled = isFeatureFlagEnabledDefault,
    logger = {},
    animationFrameProvider
  } = options;
  const warn = typeof logger.warn === "function" ? logger.warn : () => {};
  const error = typeof logger.error === "function" ? logger.error : () => {};

  const result = {
    appliedLayoutId: DEFAULT_LAYOUT_ID,
    appliedRegions: [],
    skippedRegions: [],
    missingAnchors: [],
    conflictingAnchors: [],
    orphanedAnchors: [],
    skippedByFeatureFlag: [],
    featureFlagDecisions: [],
    durationMs: 0,
    errors: []
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

  const mutationQueue = [];
  const scheduleAnimationFrame = getAnimationFrameProvider(animationFrameProvider);

  enqueueMutation(mutationQueue, () => annotateRoot(root, layoutId, grid));
  result.appliedLayoutId = layoutId;

  const anchorIndex = buildAnchorIndex(root);
  const unusedAnchorIds = new Set(anchorIndex.keys());

  regions.forEach((region) => {
    processRegion(
      region,
      anchorIndex,
      unusedAnchorIds,
      grid,
      isFeatureFlagEnabled,
      warn,
      result,
      mutationQueue
    );
  });

  if (unusedAnchorIds.size) {
    result.orphanedAnchors = Array.from(unusedAnchorIds);
    result.orphanedAnchors.forEach((orphanId) => {
      warn(
        `layoutEngine.applyLayout: anchor '${orphanId}' is present in the DOM but missing from the layout definition.`
      );
    });
  }

  emitSkippedRegionTelemetry(layoutId, result.skippedByFeatureFlag, result.featureFlagDecisions);
  flushMutations(mutationQueue, scheduleAnimationFrame);

  return finalizeResult(result, start);
}

export default applyLayout;
