import { describe, it, expect, vi, afterEach } from "vitest";
import { DATA_DIR } from "../../src/helpers/constants.js";

function createCarousel() {
  const wrapper = document.createElement("div");
  const inner = document.createElement("div");
  inner.className = "card-carousel";
  wrapper.appendChild(inner);
  return wrapper;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("setupCarouselToggle", () => {
  it("marks carousel as built only after successful insertion", async () => {
    const button = document.createElement("button");
    const container = document.createElement("div");
    container.classList.add("hidden");
    document.body.append(button, container);

    const fetchJson = vi.fn().mockResolvedValue([]);
    const validateData = vi.fn();
    const buildCardCarousel = vi.fn().mockResolvedValue(createCarousel());
    const initScrollMarkers = vi.fn();

    vi.doMock("../../src/helpers/dataUtils.js", async () => {
      const actual = await vi.importActual("../../src/helpers/dataUtils.js");
      return { ...actual, fetchJson, validateData };
    });
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers
    }));

    const { setupCarouselToggle } = await import("../../src/game.js");

    const handleClick = setupCarouselToggle(button, container);

    await handleClick();

    expect(buildCardCarousel).toHaveBeenCalledTimes(1);

    await handleClick();

    expect(buildCardCarousel).toHaveBeenCalledTimes(1);
  });

  // Rapid clicks should reuse the original build promise instead of triggering duplicates.
  it("awaits an in-flight build when clicks happen rapidly", async () => {
    const button = document.createElement("button");
    const container = document.createElement("div");
    container.classList.add("hidden");
    document.body.append(button, container);

    const fetchJson = vi.fn().mockResolvedValue([]);
    const validateData = vi.fn();
    let resolveBuild;
    const buildDeferred = new Promise((resolve) => {
      resolveBuild = resolve;
    });
    const buildCardCarousel = vi.fn().mockReturnValue(buildDeferred);
    const initScrollMarkers = vi.fn();

    vi.doMock("../../src/helpers/dataUtils.js", async () => {
      const actual = await vi.importActual("../../src/helpers/dataUtils.js");
      return { ...actual, fetchJson, validateData };
    });
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers
    }));

    const { setupCarouselToggle } = await import("../../src/game.js");

    const handleClick = setupCarouselToggle(button, container);

    const firstClick = handleClick();
    const secondClick = handleClick();

    await Promise.resolve();
    expect(container.classList.contains("hidden")).toBe(true);

    resolveBuild(createCarousel());

    const results = await Promise.all([firstClick, secondClick]);

    expect(results).toEqual([undefined, undefined]);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson.mock.calls).toEqual([[`${DATA_DIR}judoka.json`], [`${DATA_DIR}gokyo.json`]]);
    expect(container.classList.contains("hidden")).toBe(false);
    expect(buildCardCarousel).toHaveBeenCalledTimes(1);
  });

  it("skips invalid judoka entries and still builds carousel", async () => {
    const button = document.createElement("button");
    const container = document.createElement("div");
    container.classList.add("hidden");
    document.body.append(button, container);

    const valid = { id: 1 };
    const invalid = { id: 2, invalid: true };

    const fetchJson = vi.fn().mockResolvedValueOnce([valid, invalid]).mockResolvedValueOnce([]);

    const validateData = vi.fn((data, type) => {
      if (type === "judoka" && data.invalid) {
        throw new Error("bad");
      }
    });

    const buildCardCarousel = vi.fn().mockResolvedValue(createCarousel());
    const initScrollMarkers = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.doMock("../../src/helpers/dataUtils.js", async () => {
      const actual = await vi.importActual("../../src/helpers/dataUtils.js");
      return { ...actual, fetchJson, validateData };
    });
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers
    }));

    const { setupCarouselToggle } = await import("../../src/game.js");

    const handleClick = setupCarouselToggle(button, container);

    await handleClick();

    expect(buildCardCarousel).toHaveBeenCalledWith([valid], []);
    expect(container.classList.contains("hidden")).toBe(false);
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it("does not mark built when container is missing", async () => {
    const button = document.createElement("button");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const fetchJson = vi.fn();
    const validateData = vi.fn();
    const buildCardCarousel = vi.fn();
    const initScrollMarkers = vi.fn();

    vi.doMock("../../src/helpers/dataUtils.js", async () => {
      const actual = await vi.importActual("../../src/helpers/dataUtils.js");
      return { ...actual, fetchJson, validateData };
    });
    vi.doMock("../../src/helpers/carouselBuilder.js", () => ({
      buildCardCarousel,
      initScrollMarkers
    }));

    const { setupCarouselToggle } = await import("../../src/game.js");

    const handleClick = setupCarouselToggle(button, null);

    await handleClick();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(buildCardCarousel).not.toHaveBeenCalled();

    await handleClick();

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(buildCardCarousel).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
