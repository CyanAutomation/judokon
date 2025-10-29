import { describe, it, expect, vi, afterEach } from "vitest";
import { createPortraitSection } from "../../src/helpers/cardSections.js";
import * as cardRender from "../../src/helpers/cardRender.js";
import * as cardTopBar from "../../src/helpers/cardTopBar.js";

const judoka = {
  id: 1,
  firstname: "John",
  surname: "Doe",
  weightClass: "-100kg"
};

describe("createPortraitSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders weight class text and portrait alt text", () => {
    const portrait = createPortraitSection(judoka);

    const weight = portrait.querySelector(".card-weight-class");
    expect(weight).not.toBeNull();
    expect(weight.dataset.tooltipId).toBe("card.weightClass");
    expect(weight.textContent).toBe(judoka.weightClass);

    const portraitImage = portrait.querySelector("img");
    expect(portraitImage).not.toBeNull();
    expect(portraitImage.alt).toBe(`${judoka.firstname} ${judoka.surname}`);
  });

  it("appends the weight class element after the portrait markup", () => {
    const portrait = createPortraitSection(judoka);
    const weight = portrait.querySelector(".card-weight-class");

    expect(weight).not.toBeNull();
    expect(portrait.lastElementChild).toBe(weight);
  });

  it("falls back to the no-data container when portrait generation fails", async () => {
    vi.spyOn(cardRender, "generateCardPortrait").mockImplementation(() => {
      throw new Error("portrait failure");
    });
    const fallbackElement = document.createElement("div");
    vi.spyOn(cardTopBar, "createNoDataContainer").mockReturnValue(fallbackElement);
    const { withMutedConsole } = await import("../utils/console.js");

    const result = await withMutedConsole(async () => {
      return createPortraitSection(judoka);
    });

    expect(cardRender.generateCardPortrait).toHaveBeenCalledWith(judoka);
    expect(cardTopBar.createNoDataContainer).toHaveBeenCalledTimes(1);
    expect(result).toBe(fallbackElement);
  });
});
