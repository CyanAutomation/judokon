import { vi } from "vitest";
import * as countryUtils from "../../src/utils/countryCodes.js";
import {
  generateCardTopBar,
  createNameContainer,
  createFlagImage
} from "../../src/helpers/cardTopBar.js";

// Utility function for normalization
const normalizeHtml = (html) =>
  html.replace(/>\s+</g, "><").replace(/></g, "> <").replace(/\s+/g, " ").trim();

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
  it("should render top bar with placeholder flag when no flagUrl is provided", async () => {
    const expectedHtml = `
      <div class="card-top-bar">
        <div class="card-name">
          <span class="firstname">John</span>
          <span class="surname">Doe</span>
        </div>
        <div class="card-flag" data-tooltip-id="card.flag">
          <img src="../assets/countryFlags/placeholder-flag.png" alt="Unknown flag" loading="lazy" onerror="this.src='../assets/countryFlags/placeholder-flag.png'">
        </div>
      </div>
    `;

    const result = await generateCardTopBar({ firstname: "John", surname: "Doe" }, null);

    expect(normalizeHtml(result.outerHTML)).toBe(normalizeHtml(expectedHtml));
  });

  it("should include correct alt text for country name in flag image", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain('alt="France flag"');
  });

  it("should include judoka's firstname", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain("Clarisse");
  });

  it("should include judoka's surname", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain("Agbegnenou");
  });

  it("should include the flag URL in the HTML", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain(flagUrl);
  });

  it("should fallback to placeholder flag when flagUrl is missing", async () => {
    const result = await generateCardTopBar(judoka);
    expect(result.outerHTML).toContain("placeholder-flag.png");
  });

  it("should render placeholder text when judoka is missing", async () => {
    const result = await generateCardTopBar(null, flagUrl);
    expect(result.outerHTML).toContain("No data available");
  });

  it("should fallback to 'Unknown' when countryCode is missing", async () => {
    countryUtils.getCountryByCode.mockResolvedValueOnce("Unknown");
    const incompleteJudoka = { firstname: "Clarisse", surname: "Agbegnenou" };
    const result = await generateCardTopBar(incompleteJudoka, flagUrl);
    expect(result.outerHTML).toContain('alt="Unknown flag"');
  });

  it("should handle invalid judoka input types gracefully", async () => {
    await expect(generateCardTopBar(42, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar(true, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar({}, flagUrl)).resolves.toBeTruthy();
  });

  it("escapes HTML in firstname and surname", async () => {
    const result = await generateCardTopBar(
      { firstname: "<John>", surname: '"Doe"', countryCode: "fr" },
      flagUrl
    );
    expect(result.outerHTML).toContain("&lt;John&gt;");
    expect(result.outerHTML).toContain('"Doe"');
  });

  it("escapes HTML in country name for alt attribute", async () => {
    vi.spyOn(countryUtils, "getCountryByCode").mockResolvedValueOnce("<France>");
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain('alt="<France> flag"');
  });

  it("includes alt attribute even if countryName is falsy", async () => {
    vi.spyOn(countryUtils, "getCountryByCode").mockResolvedValueOnce("");
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.outerHTML).toContain('alt="Unknown flag"');
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

  it("escapes HTML in firstname and surname", () => {
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

  it("escapes HTML in country name for alt attribute", () => {
    const flagImage = createFlagImage(flagUrl, "<France>");
    expect(flagImage.outerHTML).toContain('alt="<France> flag"');
  });

  it("uses 'Unknown flag' alt if countryName is falsy", () => {
    const flagImage = createFlagImage(flagUrl, "");
    expect(flagImage.outerHTML).toContain('alt="Unknown flag"');
  });
});
