import { vi } from "vitest";

export async function withMutedConsole(fn, levels = ["error", "warn"]) {
  const spies = levels.map((lvl) => vi.spyOn(console, lvl).mockImplementation(() => {}));
  try {
    return await fn();
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
}

export async function withAllowedConsole(fn) {
  return await fn();
}

