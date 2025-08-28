import { vi } from "vitest";

/**
 * Create a starter mock that captures an onDrift callback and exposes a
 * `triggerDrift` helper.
 *
 * @returns {{starter: ReturnType<typeof vi.fn>, triggerDrift: (remaining: number) => void}}
 */
export function createDriftStarter() {
  let onDrift;
  const starter = vi.fn((onTick, _expired, _dur, driftCb) => {
    onDrift = driftCb;
    onTick(3);
  });
  return {
    starter,
    triggerDrift: (remaining) => {
      if (typeof onDrift === "function") onDrift(remaining);
    }
  };
}
