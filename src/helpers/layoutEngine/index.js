import {
  applyLayout as applyLayoutImpl,
  validateLayoutDefinition as validateLayoutDefinitionImpl,
} from "./applyLayout.js";
import { loadLayout as loadLayoutImpl } from "./loadLayout.js";
import {
  getLayoutModule as getLayoutModuleImpl,
  layoutRegistry as layoutRegistryImpl,
} from "./layoutRegistry.js";

/**
 * Re-export wrapper for the layout application helper.
 *
 * @summary Provides tree-shakable access to `applyLayout` via the layout engine
 * entry module while delegating to the concrete implementation.
 *
 * @pseudocode
 * 1. Import the implementation from `applyLayout.js`.
 * 2. Expose the same function reference for external consumers.
 *
 * @type {typeof applyLayoutImpl}
 */
export const applyLayout = applyLayoutImpl;

/**
 * Re-export wrapper for validating layout definitions.
 *
 * @summary Surface the validation helper alongside other layout engine
 * utilities without duplicating implementation logic.
 *
 * @pseudocode
 * 1. Import the validator from `applyLayout.js`.
 * 2. Re-export the reference so callers can validate payloads.
 *
 * @type {typeof validateLayoutDefinitionImpl}
 */
export const validateLayoutDefinition = validateLayoutDefinitionImpl;

/**
 * Re-export wrapper for loading layouts from registry or inline fallback.
 *
 * @summary Delegates to `loadLayout.js` and exposes the helper through the
 * layout engine facade module.
 *
 * @pseudocode
 * 1. Import the loader function.
 * 2. Re-export the existing reference to avoid additional layers.
 *
 * @type {typeof loadLayoutImpl}
 */
export const loadLayout = loadLayoutImpl;

/**
 * Re-export wrapper for locating layout modules in the registry.
 *
 * @summary Exposes the registry lookup helper from the layout engine index so
 * other modules can access generated layout modules.
 *
 * @pseudocode
 * 1. Import the lookup function from `layoutRegistry.js`.
 * 2. Re-export the same reference for downstream consumers.
 *
 * @type {typeof getLayoutModuleImpl}
 */
export const getLayoutModule = getLayoutModuleImpl;

/**
 * Re-export of the generated layout registry map.
 *
 * @summary Provides access to the mutable registry for advanced use-cases such
 * as tests or custom layout orchestration.
 *
 * @pseudocode
 * 1. Import the registry object populated during build.
 * 2. Re-export the shared instance to maintain a single source of truth.
 *
 * @type {typeof layoutRegistryImpl}
 */
export const layoutRegistry = layoutRegistryImpl;
