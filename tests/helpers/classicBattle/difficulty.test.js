import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createBattleCardContainers } from "../../utils/testUtils.js";
import { STATS } from "../../../src/helpers/battleEngineFacade.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

describe("simulateOpponentStat difficulty", () => {
  let simulateOpponentStat;

  beforeEach(async () => {
    document.body.innerHTML = "";
    const { opponentCard } = createBattleCardContainers();
    document.body.appendChild(opponentCard);
    opponentCard.innerHTML = `
      <ul>
        <li class="stat"><strong>power</strong> <span>1</span></li>
        <li class="stat"><strong>speed</strong> <span>2</span></li>
        <li class="stat"><strong>technique</strong> <span>3</span></li>
        <li class="stat"><strong>kumikata</strong> <span>4</span></li>
        <li class="stat"><strong>newaza</strong> <span>5</span></li>
      </ul>
    `;
    ({ simulateOpponentStat } = await import("../../../src/helpers/classicBattle.js"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a random stat on easy", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const stat = simulateOpponentStat("easy");
    expect(STATS.includes(stat)).toBe(true);
  });

  it("chooses among stats at or above average on medium", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const stat = simulateOpponentStat("medium");
    expect(["technique", "kumikata", "newaza"]).toContain(stat);
  });

  it("chooses the highest stat on hard", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const stat = simulateOpponentStat("hard");
    expect(stat).toBe("newaza");
  });
});
