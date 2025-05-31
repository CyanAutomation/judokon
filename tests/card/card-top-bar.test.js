import { vi } from "vitest";
import * as countryUtils from "../../helpers/countryUtils.js";
import {
  generateCardTopBar,
  createNameContainer,
  createFlagImage
} from "../../helpers/cardTopBar.js";

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
  vi.spyOn(countryUtils, "getCountryNameFromCode").mockResolvedValue("France");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateCardTopBar", () => {
  it("should render top bar with placeholder flag when no flagUrl is provided", async () => {
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
    countryUtils.getCountryNameFromCode.mockResolvedValueOnce("Unknown");
    const incompleteJudoka = { firstname: "Clarisse", surname: "Agbegnenou" };
    const result = await generateCardTopBar(incompleteJudoka, flagUrl);
    expect(result.outerHTML).toContain('alt="Unknown flag"');
  });

  it("should handle invalid judoka input types gracefully", async () => {
    await expect(generateCardTopBar(42, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar(true, flagUrl)).resolves.toBeTruthy();
    await expect(generateCardTopBar({}, flagUrl)).resolves.toBeTruthy();
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
