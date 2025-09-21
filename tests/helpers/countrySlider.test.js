import { describe, it, expect, vi } from "vitest";
import { createButton } from "./components/Button.js";

describe("createCountrySlider", () => {
  it("renders flag buttons using populateCountryList", async () => {
    const track = document.createElement("div");

    const slideA = createButton("Slide A", { className: "slide" });
    const slideB = createButton("Slide B", { className: "slide" });

    const populateCountryList = vi.fn(async (c) => {
      c.appendChild(slideA.element);
      c.appendChild(slideB.element);
    });

    vi.doMock("../../src/helpers/country/list.js", () => ({ populateCountryList }));

    const { createCountrySlider } = await import("../../src/helpers/countrySlider.js");

    await createCountrySlider(track);

    expect(populateCountryList).toHaveBeenCalledWith(track);
    const slides = track.querySelectorAll(".slide");
    expect(slides).toHaveLength(2);
    expect(slides[0]).toBe(slideA.element);
    expect(slides[1]).toBe(slideB.element);
  });
});
