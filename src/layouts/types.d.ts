export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutVisibleIf {
  featureFlag: string;
}

export interface LayoutRegion {
  id: string;
  rect: LayoutRect;
  zIndex?: number;
  ariaLabel?: string;
  snapTo?: string;
  visibleIf?: LayoutVisibleIf;
}

export interface LayoutMeta {
  hash?: string;
  generatedAt?: string;
  author?: string;
}

export interface LayoutDefinition {
  id?: string;
  variantId?: string;
  version?: string;
  meta?: LayoutMeta;
  grid: {
    cols: number;
    rows: number;
  };
  regions: LayoutRegion[];
}

export type LayoutRegistryEntry = {
  default: LayoutDefinition | { default: LayoutDefinition };
  variants?: Record<string, LayoutDefinition | { default: LayoutDefinition }>;
};

export type LayoutRegistryMap = Record<string, LayoutRegistryEntry>;
