import { createPortraitSection } from "../../src/helpers/cardSections.js";

const judoka = {
  id: 1,
  firstname: "John",
  surname: "Doe",
  weightClass: "-100kg"
};

describe("weight class tooltip", () => {
  it("adds tooltip id to weight class element", () => {
    const portrait = createPortraitSection(judoka);
    const weight = portrait.querySelector(".card-weight-class");
    expect(weight.dataset.tooltipId).toBe("card.weightClass");
  });
});
