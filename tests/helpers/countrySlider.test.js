import { describe, it, expect, vi } from "vitest";

describe("createCountrySlider", () => {
  it("renders flag buttons using populateCountryList", async () => {
    const track = document.createElement("div");

    const slideA = document.createElement("button");
    slideA.className = "slide";
    const slideB = document.createElement("button");
    slideB.className = "slide";

    const populateCountryList = vi.fn(async (c) => {
      c.appendChild(slideA);
      c.appendChild(slideB);
    });

    vi.doMock("../../src/helpers/country/list.js", () => ({ populateCountryList }));

    const { createCountrySlider } = await import("../../src/helpers/countrySlider.js");

    await createCountrySlider(track);

    expect(populateCountryList).toHaveBeenCalledWith(track);
    const slides = track.querySelectorAll(".slide");
    expect(slides).toHaveLength(2);
    expect(slides[0]).toBe(slideA);
    expect(slides[1]).toBe(slideB);
  });
});
