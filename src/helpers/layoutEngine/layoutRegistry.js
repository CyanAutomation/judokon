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
 */
export const layoutRegistry = Object.create(null);

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
