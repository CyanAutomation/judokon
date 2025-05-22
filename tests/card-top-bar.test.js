import { vi } from "vitest";
import * as countryUtils from "../helpers/countryUtils.js";
import { generateCardTopBar } from "../helpers/cardTopBar.js";
import { createNameContainer, createFlagImage } from "../helpers/cardTopBar.js";

// Mock data
vi.spyOn(countryUtils, "getCountryNameFromCode").mockResolvedValue("France");
const judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  countryCode: "fr"
};

const flagUrl = "https://flagcdn.com/w320/fr.png";

describe("generateCardTopBar", () => {
  test("should include the correct alt text for the flag", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain('alt="France flag"');
  });

  test("should include the judoka's name in the HTML", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain("Clarisse");
    expect(htmlString).toContain("Agbegnenou");
  });

  test("should include the flag URL in the HTML", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain(flagUrl);
  });

  test("should handle missing flagUrl by using the placeholder", async () => {
    const result = await generateCardTopBar(judoka);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain("placeholder-flag.png");
  });

  test("should handle missing judoka gracefully", async () => {
    const result = await generateCardTopBar(null, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain("No data available");
  });

  test("should handle missing countryCode gracefully", async () => {
    countryUtils.getCountryNameFromCode.mockResolvedValueOnce("Unknown");

    const incompleteJudoka = { firstname: "Clarisse", surname: "Agbegnenou" };
    const result = await generateCardTopBar(incompleteJudoka, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain('alt="Unknown flag"');
  });
});

describe("cardTopBar.js", () => {
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
      "handles firstname: '$firstname' and surname: '$surname'",
      ({ firstname, surname, expectedHtml }) => {
        const nameContainer = createNameContainer(firstname, surname);
        expect(nameContainer.outerHTML).toContain(expectedHtml);
      }
    );
  });

  describe("createFlagImage", () => {
    it.each([
      {
        finalFlagUrl: "https://example.com/flag.png",
        countryName: "United States",
        expectedHtml:
          "<div class='card-flag'><img src='https://example.com/flag.png' alt='United States flag' onerror='this.src=\"../assets/flags/placeholder.png\"'></div>"
      },
      {
        finalFlagUrl: "",
        countryName: "",
        expectedHtml:
          "<div class='card-flag'><img src='../assets/flags/placeholder.png' alt=' flag' onerror='this.src=\"../assets/flags/placeholder.png\"'></div>"
      },
      {
        finalFlagUrl: null,
        countryName: null,
        expectedHtml:
          "<div class='card-flag'><img src='../assets/flags/placeholder.png' alt=' flag' onerror='this.src=\"../assets/flags/placeholder.png\"'></div>"
      }
    ])(
      "handles finalFlagUrl: '$finalFlagUrl' and countryName: '$countryName'",
      ({ finalFlagUrl, countryName, expectedHtml }) => {
        const flagImage = createFlagImage(finalFlagUrl, countryName);
        expect(flagImage.outerHTML).toContain(expectedHtml);
      }
    );
  });
});
