import { vi } from "vitest";
import * as countryUtils from "../helpers/countryUtils.js";
import { generateCardTopBar } from "../helpers/cardTopBar.js";

// Mock data
vi.spyOn(countryUtils, "getCountryNameFromCode").mockResolvedValue("France");
const judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  countryCode: "fr",
};

const flagUrl = "https://flagcdn.com/w320/fr.png";

describe("generateCardTopBar", () => {
  test("should include the correct alt text for the flag", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.html).toContain('alt="France flag"');
  });

  test("should include the judoka's name in the HTML", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.html).toContain("Clarisse");
    expect(result.html).toContain("Agbegnenou");
  });

  test("should include the flag URL in the HTML", async () => {
    const result = await generateCardTopBar(judoka, flagUrl);
    expect(result.html).toContain(flagUrl);
  });

  test("should handle missing flagUrl by using the placeholder", async () => {
    const result = await generateCardTopBar(judoka);
    expect(result.flagUrl).toContain("placeholder-flag.png");
    expect(result.html).toContain("placeholder-flag.png");
  });

  test("should handle missing judoka gracefully", async () => {
    const result = await generateCardTopBar(null, flagUrl);
    expect(result.title).toBe("No data");
    expect(result.html).toContain("No data available");
  });

  test("should handle missing countryCode gracefully", async () => {
    const incompleteJudoka = { firstname: "Clarisse", surname: "Agbegnenou" };
    const result = await generateCardTopBar(incompleteJudoka, flagUrl);
    expect(result.html).toContain('alt="Unknown flag"');
  });
});