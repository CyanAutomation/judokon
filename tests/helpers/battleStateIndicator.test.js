import { JSDOM } from "jsdom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createBattleStateIndicator } from "../../src/helpers/battleStateIndicator";

describe("createBattleStateIndicator", () => {
  let dom;
  let mountEl;
  let announcerEl;
  let events;
  let getCatalog;

  beforeEach(() => {
    dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id="mount"></div><div id="announcer"></div></body></html>'
    );
    global.window = dom.window;
    global.document = dom.window.document;

    mountEl = document.getElementById("mount");
    announcerEl = document.getElementById("announcer");
    events = { on: vi.fn(), off: vi.fn() };
    getCatalog = vi.fn().mockResolvedValue({ display: { include: [] } });
  });

  it("should return a stubbed API if featureFlag is false", async () => {
    const { cleanup, isReady, getActiveState } = await createBattleStateIndicator({
      featureFlag: false,
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    expect(isReady).toBe(false);
    expect(getActiveState()).toBe(null);
    expect(cleanup).toBeDefined();
    expect(mountEl.children.length).toBe(0);
  });

  it("should return a stubbed API in a non-browser environment", async () => {
    global.window = undefined;
    global.document = undefined;

    const { cleanup, isReady, getActiveState } = await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    expect(isReady).toBe(false);
    expect(getActiveState()).toBe(null);
    expect(cleanup).toBeDefined();
  });

  it("should create and mount the root and announcer elements", async () => {
    await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    const rootEl = mountEl.querySelector("#battle-state-indicator");
    const announcerP = announcerEl.querySelector("#battle-state-announcer");

    expect(rootEl).not.toBe(null);
    expect(rootEl.tagName).toBe("UL");
    expect(rootEl.getAttribute("aria-label")).toBe("Battle progress");

    expect(announcerP).not.toBe(null);
    expect(announcerP.tagName).toBe("P");
    expect(announcerP.getAttribute("aria-live")).toBe("polite");
  });

  it("should fetch the catalog and render the state list", async () => {
    const catalog = {
      version: "v1",
      order: ["matchInit", "cooldown", "playerInput"],
      ids: {
        matchInit: 1,
        cooldown: 2,
        playerInput: 3
      },
      labels: {
        matchInit: "Match Initializing",
        cooldown: "Cooldown"
      },
      display: { include: ["matchInit", "cooldown", "playerInput"] }
    };
    getCatalog.mockResolvedValue(catalog);

    const { isReady } = await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    expect(isReady).toBe(true);
    const listItems = mountEl.querySelectorAll("li");
    expect(listItems.length).toBe(3);

    expect(listItems[0].dataset.stateRaw).toBe("matchInit");
    expect(listItems[0].dataset.stateId).toBe("1");
    expect(listItems[0].dataset.stateLabel).toBe("Match Initializing");
    expect(listItems[0].textContent).toBe("Match Initializing");

    expect(listItems[1].dataset.stateRaw).toBe("cooldown");
    expect(listItems[1].dataset.stateId).toBe("2");
    expect(listItems[1].dataset.stateLabel).toBe("Cooldown");
    expect(listItems[1].textContent).toBe("Cooldown");

    expect(listItems[2].dataset.stateRaw).toBe("playerInput");
    expect(listItems[2].dataset.stateId).toBe("3");
    expect(listItems[2].dataset.stateLabel).toBeUndefined();
    expect(listItems[2].textContent).toBe("playerInput");
  });

  it("should subscribe to and handle control.state.changed events", async () => {
    const catalog = {
      version: "v1",
      order: ["matchInit", "cooldown"],
      ids: { matchInit: 1, cooldown: 2 },
      display: { include: ["matchInit", "cooldown"] }
    };
    getCatalog.mockResolvedValue(catalog);

    const { getActiveState } = await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    const handler = events.on.mock.calls[0][1];
    handler({ to: "cooldown" });

    const activeItem = mountEl.querySelector("li.active");
    expect(activeItem.dataset.stateRaw).toBe("cooldown");
    expect(activeItem.getAttribute("aria-current")).toBe("step");

    const announcerP = announcerEl.querySelector("p");
    expect(announcerP.textContent).toBe("State: cooldown");

    expect(getActiveState()).toBe("cooldown");
  });

  it("should cleanup event listeners", async () => {
    const { cleanup } = await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    cleanup();
    expect(events.off).toHaveBeenCalledWith("control.state.changed", expect.any(Function));
    expect(mountEl.children.length).toBe(0);
    expect(announcerEl.children.length).toBe(0);
  });

  it("should handle unknown states", async () => {
    const catalog = {
      version: "v1",
      order: ["matchInit"],
      ids: { matchInit: 1 },
      display: { include: ["matchInit"] }
    };
    getCatalog.mockResolvedValue(catalog);

    await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    const handler = events.on.mock.calls[0][1];
    handler({ to: "unknownState" });

    const rootEl = mountEl.querySelector("#battle-state-indicator");
    expect(rootEl.dataset.unknown).toBe("true");

    const announcerP = announcerEl.querySelector("p");
    expect(announcerP.textContent).toBe("State: unknownState");
  });

  it("should reload the catalog when the version changes", async () => {
    const catalogV1 = {
      version: "v1",
      order: ["matchInit"],
      ids: { matchInit: 1 },
      display: { include: ["matchInit"] }
    };
    const catalogV2 = {
      version: "v2",
      order: ["matchInit", "cooldown"],
      ids: { matchInit: 1, cooldown: 2 },
      display: { include: ["matchInit", "cooldown"] }
    };
    getCatalog.mockResolvedValueOnce(catalogV1).mockResolvedValueOnce(catalogV2);

    await createBattleStateIndicator({
      mount: mountEl,
      announcer: announcerEl,
      events,
      getCatalog
    });

    const handler = events.on.mock.calls[0][1];
    await handler({ to: "cooldown", catalogVersion: "v2" });

    const listItems = mountEl.querySelectorAll("li");
    expect(listItems.length).toBe(2);
    expect(listItems[1].dataset.stateRaw).toBe("cooldown");
  });
});
