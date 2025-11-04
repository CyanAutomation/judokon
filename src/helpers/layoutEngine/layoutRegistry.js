const layoutRegistryInstance = Object.create(null);

/**
 * Placeholder registry map populated by the build step.
 *
 * Structure:
 * {
 *   [modeId: string]: {
 *     default: LayoutModule,
 *     variants?: {
 *       [variantId: string]: LayoutModule
 *     }
 *   }
 * }
 *
 * @summary Holds build-time generated layout modules keyed by battle mode.
 *
 * @pseudocode
 * 1. Instantiate an empty object without a prototype.
 * 2. Allow the build pipeline to assign default and variant modules onto the map.
 * 3. Share the singleton map across imports to coordinate layout lookup.
 *
 * @type {Record<string, { default: any, variants?: Record<string, any> }>} // Layout modules are generated at build time.
 */
export const layoutRegistry = layoutRegistryInstance;

/**
 * Retrieves a layout module from the generated registry.
 *
 * @pseudocode
 * 1. Look up the mode entry on the registry map.
 * 2. When a variantId is supplied, prefer the variant-specific export.
 * 3. Otherwise fall back to the mode's default layout module.
 * 4. Return `undefined` if no entry matches.
 *
 * @param {string} modeId - Battle mode identifier to read from the registry.
 * @param {string} [variantId] - Optional variant identifier when multiple layouts exist.
 * @returns {any|undefined} The resolved layout module or `undefined` when not registered.
 */
export function getLayoutModule(modeId, variantId) {
  if (!modeId) return undefined;
  const entry = layoutRegistry[modeId];
  if (!entry) return undefined;
  if (variantId && entry.variants && entry.variants[variantId]) {
    return entry.variants[variantId];
  }
  return entry.default;
}

export default { layoutRegistry, getLayoutModule };
