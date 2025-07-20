import { describe, it, expect, vi } from "vitest";

let generateMock;
let setupLazyPortraitsMock;

vi.mock("../../src/helpers/cardBuilder.js", () => ({
  generateJudokaCardHTML: (...args) => generateMock(...args)
}));
vi.mock("../../src/helpers/lazyPortrait.js", () => ({
  setupLazyPortraits: (...args) => setupLazyPortraitsMock(...args)
}));

import { renderJudokaCard } from "../../src/helpers/cardUtils.js";

const judoka = {
  id: 2,
  firstname: "Jane",
  surname: "Smith",
  country: "USA",
  countryCode: "us",
  stats: { power: 8, speed: 7, technique: 6, kumikata: 5, newaza: 4 },
  weightClass: "-78kg",
  signatureMoveId: 1,
  rarity: "common",
  gender: "female"
};

describe("renderJudokaCard", () => {
  it("obscures stats and name when useObscuredStats is true", async () => {
    generateMock = vi.fn(async () => document.createElement("div"));
    setupLazyPortraitsMock = vi.fn();
    const container = document.createElement("div");
    await renderJudokaCard(judoka, {}, container, { useObscuredStats: true });
    const calledJudoka = generateMock.mock.calls[0][0];
    expect(calledJudoka.firstname).toBe("?");
    expect(calledJudoka.surname).toBe("?");
    Object.values(calledJudoka.stats).forEach((v) => expect(v).toBe("?"));
  });
});
