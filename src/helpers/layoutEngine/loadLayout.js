import { validateLayoutDefinition } from "./applyLayout.js";
import { getLayoutModule } from "./layoutRegistry.js";

const DEFAULT_INLINE_SCRIPT_ID = "layout-default";

function getDocument(docOverride) {
  if (docOverride) return docOverride;
  if (typeof document !== "undefined") return document;
  return null;
}

function parseInlineFallback(scriptElement) {
  if (!scriptElement) {
    return { layout: null, error: "Inline fallback script tag not found." };
  }

  try {
    const json = scriptElement.textContent || scriptElement.innerHTML || "";
    if (!json.trim()) {
      return { layout: null, error: "Inline fallback script is empty." };
    }
    const layout = JSON.parse(json);
    return { layout };
  } catch (parseError) {
    return { layout: null, error: `Failed to parse inline fallback JSON: ${parseError.message}` };
  }
}

function resolveInlineFallback(modeId, options, logger) {
  const doc = getDocument(options.document);
  if (!doc) {
    return {
      layout: null,
      error: "Document unavailable while attempting to read inline fallback."
    };
  }

  const scriptId = options.inlineScriptId || `${DEFAULT_INLINE_SCRIPT_ID}-${modeId}`;
  const script = doc.getElementById(scriptId) || doc.getElementById(DEFAULT_INLINE_SCRIPT_ID);
  const { layout, error } = parseInlineFallback(script);

  if (error) {
    logger.warn?.(`layoutEngine.loadLayout: ${error}`);
    return { layout: null, error };
  }

  return { layout };
}

function resolveRegistryLayout(modeId, variantId, logger) {
  try {
    const moduleExport = getLayoutModule(modeId, variantId);
    if (!moduleExport) {
      return { layout: null, error: "Layout module not found in registry." };
    }
    if (moduleExport && typeof moduleExport === "object" && "default" in moduleExport) {
      return { layout: moduleExport.default, module: moduleExport };
    }
    return { layout: moduleExport, module: moduleExport };
  } catch (thrown) {
    const error = thrown instanceof Error ? thrown.message : String(thrown);
    logger.error?.(`layoutEngine.loadLayout: registry lookup failed – ${error}`);
    return { layout: null, error };
  }
}

/**
 * Loads a layout definition for a given battle mode and optional variant.
 *
 * @summary Attempts to resolve a layout from the static registry first, and
 * falls back to parsing the inline JSON script embedded in the page when the
 * registry miss occurs or validation fails.
 *
 * @pseudocode
 * 1. Attempt to resolve a layout module from the generated registry.
 * 2. Validate the retrieved layout payload; discard it when invalid.
 * 3. On registry miss or validation failure, parse the inline fallback script.
 * 4. Validate the fallback layout; collect errors if both sources fail.
 * 5. Return the resolved layout plus metadata describing the source and errors.
 *
 * @param {string} modeId - Unique battle mode identifier (e.g. "classic").
 * @param {{
 *   variantId?: string,
 *   document?: Document,
 *   inlineScriptId?: string,
 *   logger?: { warn?: Function, error?: Function }
 * }} [options] - Resolver options.
 * @returns {{
 *   layout: object|null,
 *   source: "registry"|"inline-fallback"|"none",
 *   usedFallback: boolean,
 *   errors: string[],
 *   module?: any
 * }} Layout resolution outcome.
 */
export function loadLayout(modeId, options = {}) {
  const { variantId, logger = {} } = options;
  const warn = typeof logger.warn === "function" ? logger.warn : () => {};
  const errorLogger = typeof logger.error === "function" ? logger.error : () => {};

  if (!modeId) {
    const errorMessage = "modeId is required to load a layout.";
    errorLogger(`layoutEngine.loadLayout: ${errorMessage}`);
    return {
      layout: null,
      source: "none",
      usedFallback: false,
      errors: [errorMessage]
    };
  }

  const registryOutcome = resolveRegistryLayout(modeId, variantId, { warn, error: errorLogger });
  const errors = [];

  if (registryOutcome.layout) {
    const { errors: validationErrors } = validateLayoutDefinition(registryOutcome.layout);
    if (validationErrors.length === 0) {
      return {
        layout: registryOutcome.layout,
        source: "registry",
        usedFallback: false,
        errors,
        module: registryOutcome.module
      };
    }
    validationErrors.forEach((message) =>
      warn(`layoutEngine.loadLayout: registry layout invalid – ${message}`)
    );
    errors.push(...validationErrors);
  } else if (registryOutcome.error) {
    warn(`layoutEngine.loadLayout: ${registryOutcome.error}`);
    errors.push(registryOutcome.error);
  }

  const fallbackOutcome = resolveInlineFallback(modeId, options, { warn, error: errorLogger });
  if (fallbackOutcome.layout) {
    const { errors: validationErrors } = validateLayoutDefinition(fallbackOutcome.layout);
    if (validationErrors.length === 0) {
      return {
        layout: fallbackOutcome.layout,
        source: "inline-fallback",
        usedFallback: true,
        errors
      };
    }
    validationErrors.forEach((message) =>
      warn(`layoutEngine.loadLayout: fallback layout invalid – ${message}`)
    );
    errors.push(...validationErrors);
  } else if (fallbackOutcome.error) {
    errors.push(fallbackOutcome.error);
  }

  return {
    layout: null,
    source: "none",
    usedFallback: true,
    errors
  };
}

export default loadLayout;
