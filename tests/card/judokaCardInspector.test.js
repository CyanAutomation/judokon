import { describe, it, expect, afterEach, vi } from "vitest";
import { JudokaCard } from "../../src/components/JudokaCard.js";

const baseJudoka = {
  id: 1,
  firstname: "John",
  surname: "Doe",
  country: "USA",
  countryCode: "us",
  stats: { power: 5, speed: 5, technique: 5, kumikata: 5, newaza: 5 },
  weightClass: "-100kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "male"
};

const gokyoLookup = {
  1: { id: 1, name: "Uchi-mata" }
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("JudokaCard inspector panel", () => {
  it("renders debug panel when extra is serializable", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = await new JudokaCard({ ...baseJudoka, extra: { note: "ok" } }, gokyoLookup, {
      enableInspector: true
    }).render();
    expect(container.querySelector(".debug-panel")).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("renders fallback paragraph when card data cannot be stringified", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = await new JudokaCard({ ...baseJudoka, extra: 1n }, gokyoLookup, {
      enableInspector: true
    }).render();
    expect(container.querySelector(".debug-panel")).toBeNull();
    const fallback = container.querySelector("p");
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toBe("Invalid card data");
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
