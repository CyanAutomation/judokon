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

describe("generateCardTopBar", () => {
  it("renders judoka name, flag URL, and alt text", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain("Clarisse");
    expect(result.outerHTML).toContain("Agbegnenou");
    expect(result.outerHTML).toContain(flagUrl);
    expect(result.outerHTML).toContain('alt="France flag"');
  });

  it("handles invalid judoka input types gracefully", async () => {
    await expect(generateCardTopBar(42, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar(true, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar({}, flagUrl)).resolves.toBeTruthy();
  });

  it("escapes HTML in firstname, surname, and country name", async () => {
    vi.spyOn(countryUtils, "getCountryByCode").mockResolvedValueOnce("<France>");
    const result = await generateCardTopBar(
      { firstname: "<John>", surname: '"Doe"', countryCode: "fr" },
      flagUrl
    );
    expect(result.outerHTML).toContain("&lt;John&gt;");
    expect(result.outerHTML).toContain('"Doe"');
    expect(result.outerHTML).toContain('alt="<France> flag"');
  });
});

describe("createNameContainer", () => {
  it.each([
    {
      firstname: "John",
      surname: "Doe",
      expectedHtml:
        "<div class='card-name'><span class='firstname'>John</span><span class='surname'>Doe</span></div>"
    },
    {
      firstname: "",
      surname: "",
      expectedHtml:
        "<div class='card-name'><span class='firstname'></span><span class='surname'></span></div>"
    },
    {
      firstname: null,
      surname: null,
      expectedHtml:
        "<div class='card-name'><span class='firstname'></span><span class='surname'></span></div>"
    }
  ])(
    "should render name container with firstname: '$firstname' and surname: '$surname'",
    ({ firstname, surname, expectedHtml }) => {
      const nameContainer = createNameContainer(firstname, surname);
      const normalizedExpected = expectedHtml.replace(/"/g, "'");
      const normalizedResult = nameContainer.outerHTML.replace(/"/g, "'");
      expect(normalizedResult).toBe(normalizedExpected);
    }
  );

  it("sync: escapes HTML in firstname and surname", () => {
    const nameContainer = createNameContainer("<John>", '"Doe"');
    expect(nameContainer.outerHTML).toContain("&lt;John&gt;");
    expect(nameContainer.outerHTML).toContain('"Doe"');
  });
});

describe("createFlagImage", () => {
  it("should render flag image with correct src and alt attributes", () => {
    const finalFlagUrl = "https://flagcdn.com/w320/us.png";
    const countryName = "United States";
    const flagImage = createFlagImage(finalFlagUrl, countryName);

    expect(flagImage.outerHTML).toContain(
      `<img src="https://flagcdn.com/w320/us.png" alt="United States flag"`
    );
    expect(flagImage.outerHTML).toContain('loading="lazy"');
    expect(flagImage.dataset.tooltipId).toBe("card.flag");
  });

  it("sync: escapes HTML in country name for alt attribute", () => {
    const flagImage = createFlagImage(flagUrl, "<France>");
    expect(flagImage.outerHTML).toContain('alt="<France> flag"');
  });

  it("uses 'Unknown flag' alt if countryName is falsy", () => {
    const flagImage = createFlagImage(flagUrl, "");
    expect(flagImage.outerHTML).toContain('alt="Unknown flag"');
  });
});
