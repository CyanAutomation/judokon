import { vi } from "vitest";
import * as countryUtils from "../../src/utils/countryCodes.js";
import {
  generateCardTopBar,
  createNameContainer,
  createFlagImage
} from "../../src/helpers/cardTopBar.js";

const judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  countryCode: "fr"
};

const flagUrl = "https://flagcdn.com/w320/fr.png";

beforeEach(() => {
  vi.spyOn(countryUtils, "getCountryByCode").mockResolvedValue("France");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateCardTopBar", () => {
  it("renders judoka name, flag URL, and alt text", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    const nameContainer = result.querySelector(".card-name");
    expect(nameContainer).toBeInstanceOf(HTMLDivElement);
    expect(nameContainer?.getAttribute("aria-label")).toBe("Clarisse Agbegnenou");

    const firstnameSpan = nameContainer?.querySelector(".firstname");
    const surnameSpan = nameContainer?.querySelector(".surname");
    expect(firstnameSpan).toBeInstanceOf(HTMLSpanElement);
    expect(firstnameSpan?.textContent).toBe("Clarisse");
    expect(surnameSpan).toBeInstanceOf(HTMLSpanElement);
    expect(surnameSpan?.textContent).toBe("Agbegnenou");

    const flagContainer = result.querySelector(".card-flag");
    expect(flagContainer).toBeInstanceOf(HTMLDivElement);
    expect(flagContainer?.dataset.tooltipId).toBe("card.flag");
    expect(flagContainer?.getAttribute("aria-label")).toBe("France flag");

    const flagImage = flagContainer?.querySelector("img");
    expect(flagImage).toBeInstanceOf(HTMLImageElement);
    expect(flagImage?.getAttribute("src")).toBe(flagUrl);
    expect(flagImage?.getAttribute("alt")).toBe("France flag");
    expect(flagImage?.getAttribute("aria-label")).toBe("France flag");
    expect(flagImage?.getAttribute("loading")).toBe("lazy");
  });

  it("handles invalid judoka input types gracefully", async () => {
    await expect(generateCardTopBar(42, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar(true, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar({}, flagUrl)).resolves.toBeTruthy();
  });

  it("escapes HTML in firstname, surname, and country name", async () => {
    countryUtils.getCountryByCode.mockResolvedValueOnce("<France>");
    const result = await generateCardTopBar(
      { firstname: "<John>", surname: '"Doe"', countryCode: "fr" },
      flagUrl
    );
    const nameContainer = result.querySelector(".card-name");
    const firstnameSpan = nameContainer?.querySelector(".firstname");
    const surnameSpan = nameContainer?.querySelector(".surname");
    expect(firstnameSpan?.textContent).toBe("<John>");
    expect(surnameSpan?.textContent).toBe('"Doe"');
    expect(nameContainer?.getAttribute("aria-label")).toBe('<John> "Doe"');

    const flagContainer = result.querySelector(".card-flag");
    const flagImage = flagContainer?.querySelector("img");
    expect(flagImage?.getAttribute("alt")).toBe("<France> flag");
    expect(flagImage?.getAttribute("aria-label")).toBe("<France> flag");
    expect(flagContainer?.getAttribute("aria-label")).toBe("<France> flag");
  });
});

describe("createNameContainer", () => {
  it.each([
    {
      firstname: "John",
      surname: "Doe",
      expectedFirstname: "John",
      expectedSurname: "Doe",
      expectedAriaLabel: "John Doe"
    },
    {
      firstname: "",
      surname: "",
      expectedFirstname: "",
      expectedSurname: "",
      expectedAriaLabel: "Unknown judoka"
    },
    {
      firstname: null,
      surname: null,
      expectedFirstname: "",
      expectedSurname: "",
      expectedAriaLabel: "Unknown judoka"
    }
  ])(
    "should render name container with firstname: '$firstname' and surname: '$surname'",
    ({ firstname, surname, expectedFirstname, expectedSurname, expectedAriaLabel }) => {
      const nameContainer = createNameContainer(firstname, surname);
      const firstnameSpan = nameContainer.querySelector(".firstname");
      const surnameSpan = nameContainer.querySelector(".surname");

      expect(nameContainer.className).toBe("card-name");
      expect(nameContainer.getAttribute("aria-label")).toBe(expectedAriaLabel);
      expect(firstnameSpan).toBeInstanceOf(HTMLSpanElement);
      expect(firstnameSpan?.textContent).toBe(expectedFirstname);
      expect(surnameSpan).toBeInstanceOf(HTMLSpanElement);
      expect(surnameSpan?.textContent).toBe(expectedSurname);
    }
  );

  it("sync: escapes HTML in firstname and surname", () => {
    const nameContainer = createNameContainer("<John>", '"Doe"');
    const firstnameSpan = nameContainer.querySelector(".firstname");
    const surnameSpan = nameContainer.querySelector(".surname");

    expect(firstnameSpan?.textContent).toBe("<John>");
    expect(surnameSpan?.textContent).toBe('"Doe"');
    expect(nameContainer.getAttribute("aria-label")).toBe('<John> "Doe"');
  });
});

describe("createFlagImage", () => {
  it("should render flag image with correct src and alt attributes", () => {
    const finalFlagUrl = "https://flagcdn.com/w320/us.png";
    const countryName = "United States";
    const flagImage = createFlagImage(finalFlagUrl, countryName);
    const flagContainer = flagImage;
    const img = flagContainer.querySelector("img");

    expect(flagContainer.className).toBe("card-flag");
    expect(flagContainer.dataset.tooltipId).toBe("card.flag");
    expect(flagContainer.getAttribute("aria-label")).toBe("United States flag");
    expect(img).toBeInstanceOf(HTMLImageElement);
    expect(img?.getAttribute("src")).toBe(finalFlagUrl);
    expect(img?.getAttribute("alt")).toBe("United States flag");
    expect(img?.getAttribute("aria-label")).toBe("United States flag");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("sync: escapes HTML in country name for alt attribute", () => {
    const flagImage = createFlagImage(flagUrl, "<France>");
    const img = flagImage.querySelector("img");

    expect(flagImage.getAttribute("aria-label")).toBe("<France> flag");
    expect(img?.getAttribute("alt")).toBe("<France> flag");
    expect(img?.getAttribute("aria-label")).toBe("<France> flag");
  });

  it("uses 'Unknown flag' alt if countryName is falsy", () => {
    const flagImage = createFlagImage(flagUrl, "");
    const img = flagImage.querySelector("img");

    expect(flagImage.getAttribute("aria-label")).toBe("Unknown flag");
    expect(img?.getAttribute("alt")).toBe("Unknown flag");
    expect(img?.getAttribute("aria-label")).toBe("Unknown flag");
  });
});
