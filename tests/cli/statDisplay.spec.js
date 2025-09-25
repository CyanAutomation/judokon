import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import * as engineFacade from "../../src/helpers/battleEngineFacade.js";
import { StatsPanel } from "../../src/components/StatsPanel.js";

describe("CLI StatDisplay sync via StatsPanel", () => {
  beforeEach(() => {
    // jsdom DOM root
    document.body.innerHTML = "<div id=app></div>";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("updates when statsUpdated event fires (payload carries stats)", async () => {
    const onSpy = vi.spyOn(engineFacade, "on");
    const offSpy = vi.spyOn(engineFacade, "off");

    const panel = new StatsPanel({ power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 });
    document.getElementById("app").appendChild(panel.element);
    await panel.update();

    // Find initial text values
    const before = Array.from(panel.element.querySelectorAll("li.stat span")).map(
      (n) => n.textContent
    );
    expect(before.join(",")).toContain("1");

    // Capture the subscribed handler and call it
    expect(onSpy).toHaveBeenCalled();
    const handler = onSpy.mock.calls.find((c) => c[0] === "statsUpdated")[1];
    await handler({ stats: { power: 9, speed: 8, technique: 7, kumikata: 6, newaza: 5 } });

    const after = Array.from(panel.element.querySelectorAll("li.stat span")).map(
      (n) => n.textContent
    );
    expect(after.join(",")).toContain("9");

    panel.destroy();
    expect(offSpy).toHaveBeenCalledWith("statsUpdated", expect.any(Function));
  });

  it("pulls snapshot via getCurrentStats when payload lacks stats", async () => {
    const onSpy = vi.spyOn(engineFacade, "on");
    const getSnap = vi.spyOn(engineFacade, "getCurrentStats").mockReturnValue({
      power: 10,
      speed: 20,
      technique: 30,
      kumikata: 40,
      newaza: 50
    });

    const panel = new StatsPanel({ power: 0, speed: 0, technique: 0, kumikata: 0, newaza: 0 });
    document.getElementById("app").appendChild(panel.element);
    await panel.update();

    const handler = onSpy.mock.calls.find((c) => c[0] === "statsUpdated")[1];
    await handler({});

    const values = Array.from(panel.element.querySelectorAll("li.stat span")).map(
      (n) => n.textContent
    );
    expect(values).toEqual(["10", "20", "30", "40", "50"]);

    panel.destroy();
    getSnap.mockRestore();
  });
});
