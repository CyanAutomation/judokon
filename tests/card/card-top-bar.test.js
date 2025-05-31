import { vi } from "vitest";
import * as countryUtils from "../../helpers/countryUtils.js";
import { generateCardTopBar, createNameContainer, createFlagImage } from "../../helpers/cardTopBar.js";

// Utility function for normalization
const normalizeHtml = (html) =>
  html
    .replace(/>\s+</g, "><") // Collapse spaces between tags
    .replace(/></g, "> <")   // Add space between adjacent tags
    .replace(/\s+/g, " ")    // Collapse all whitespace
    .trim();

// Mock Data
const judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  countryCode: "fr"
};

const flagUrl = "https://flagcdn.com/w320/fr.png";

beforeEach(() => {
  vi.spyOn(countryUtils, "getCountryNameFromCode").mockResolvedValue("France");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateCardTopBar", () => {
  describe("basic rendering", () => {
    it("should return valid HTML for a judoka's top bar with placeholder flag", async () => {
      const expectedHtml = `
        <div class="card-top-bar">
          <div class="card-name">
            <span class="firstname">John</span>
            <span class="surname">Doe</span>
          </div>
          <div class="card-flag">
            <img src="../assets/countryFlags/placeholder-flag.png" alt="Unknown flag" onerror="this.src='../assets/countryFlags/placeholder-flag.png'">
          </div>
        </div>
      `;

      const result = await generateCardTopBar({ firstname: "John", surname: "Doe" }, null);

      expect(normalizeHtml(result.outerHTML)).toBe(normalizeHtml(expectedHtml));
    });
  });

  describe("judoka variations", () => {
    it("should include the correct alt text for the flag based on country name", async () => {
      const result = await generateCardTopBar(judoka, flagUrl);
      expect(result.outerHTML).toContain('alt="France flag"');
    });

    it("should include the judoka's name in the HTML", async () => {
      const result = await generateCardTopBar(judoka, flagUrl);
      const htmlString = result.outerHTML;
      expect(htmlString).toContain("Clarisse");
      expect(htmlString).toContain("Agbegnenou");
    });

    it("should include the flag URL in the HTML", async () => {
      const result = await generateCardTopBar(judoka, flagUrl);
      expect(result.outerHTML).toContain(flagUrl);
    });

    it("should fallback to placeholder flag URL when flagUrl is missing", async () => {
      const result = await generateCardTopBar(judoka);
      expect(result.outerHTML).toContain("placeholder-flag.png");
    });

    it("should handle missing judoka gracefully", async () => {
      const result = await generateCardTopBar(null, flagUrl);
      expect(result.outerHTML).toContain("No data available");
    });

    it("should fallback to 'Unknown' for country name when countryCode is missing", async () => {
      countryUtils.getCountryNameFromCode.mockResolvedValueOnce("Unknown");
      const incompleteJudoka = { firstname: "Clarisse", surname: "Agbegnenou" };
      const result = await generateCardTopBar(incompleteJudoka, flagUrl);
      expect(result.outerHTML).toContain('alt="Unknown flag"');
    });
  });
});

describe("cardTopBar.js", () => {
  describe("createNameContainer", () => {
    it.each([
      {
        firstname: "John",
        surname: "Doe",
        expectedHtml: `<div class='card-name'><span class='firstname'>John</span><span class='surname'>Doe</span></div>`
      },
      {
        firstname: "",
        surname: "",
        expectedHtml: `<div class='card-name'><span class='firstname'></span><span class='surname'></span></div>`
      },
      {
        firstname: null,
        surname: null,
        expectedHtml: `<div class='card-name'><span class='firstname'></span><span class='surname'></span></div>`
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
  });

  describe("createFlagImage", () => {
    it("should render flag image with correct src and alt attributes", () => {
      const finalFlagUrl = "https://flagcdn.com/w320/us.png";
      const countryName = "United States";

      const flagImage = createFlagImage(finalFlagUrl, countryName);

      expect(flagImage.outerHTML).toContain(
        `<img src="https://flagcdn.com/w320/us.png" alt="United States flag"`
      );
    });
  });
});