import { vi } from "vitest";
import * as countryUtils from "../helpers/countryUtils.js";
import { generateCardTopBar } from "../helpers/cardTopBar.js";

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
    expect(result.html).toContain(flagUrl);
  });

  test("should handle missing flagUrl by using the placeholder", async () => {
    const result = await generateCardTopBar(judoka);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain("placeholder-flag.png");
    expect(htmlString).toContain("placeholder-flag.png");
  });

  test("should handle missing judoka gracefully", async () => {
    const result = await generateCardTopBar(null, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain("No data available");
  });

  test("should handle missing countryCode gracefully", async () => {
    // Override the mock for this specific test
    countryUtils.getCountryNameFromCode.mockResolvedValueOnce("Unknown");

    const incompleteJudoka = { firstname: "Clarisse", surname: "Agbegnenou" };
    const result = await generateCardTopBar(incompleteJudoka, flagUrl);
    const htmlString = result.outerHTML;
    expect(htmlString).toContain('alt="Unknown flag"');
  });
});
