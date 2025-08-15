// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

const sampleJudoka = [
  {
    id: 0,
    firstname: "Jane",
    surname: "Doe",
    country: "USA",
    countryCode: "US",
    stats: {
      power: 1,
      speed: 1,
      technique: 1,
      kumikata: 1,
      newaza: 1
    },
    weightClass: "-48",
    signatureMoveId: 1,
    rarity: "common"
  },
  {
    id: 1,
    firstname: "John",
    surname: "Smith",
    country: "GBR",
    countryCode: "GB",
    stats: {
      power: 2,
      speed: 2,
      technique: 2,
      kumikata: 2,
      newaza: 2
    },
    weightClass: "-60",
    signatureMoveId: 2,
    rarity: "rare"
  },
  {
    id: 2,
    firstname: "Invalid",
    surname: "Judoka",
    country: "BRA",
    countryCode: "BR",
    stats: {
      power: 3,
      speed: 3,
      technique: 3,
      kumikata: 3
    },
    weightClass: "-73",
    signatureMoveId: 3,
    rarity: "epic"
  }
];

let writtenData = "";

vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue(JSON.stringify(sampleJudoka)),
    writeFile: vi.fn((_, data) => {
      writtenData = data;
      return Promise.resolve();
    })
  }
}));

describe("updateCodes script", () => {
  it("assigns card codes and falls back for invalid entries", async () => {
    await withMutedConsole(
      () => import("../../updateCodes.mjs"),
      ["log", "debug", "error", "warn"]
    );
    const updated = JSON.parse(writtenData);

    expect(updated).toHaveLength(sampleJudoka.length);
    const fallback = updated.find((j) => j.id === 0)?.cardCode;
    expect(typeof fallback).toBe("string");

    updated.forEach((j) => {
      expect(j.cardCode).toMatch(/^[A-Z2-9-]+$/);
    });

    const invalid = updated.find((j) => j.id === 2);
    const valid = updated.find((j) => j.id === 1);
    expect(invalid.cardCode).toBe(fallback);
    expect(valid.cardCode).not.toBe(fallback);
  });
});
