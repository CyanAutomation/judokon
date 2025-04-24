import { generateCardTopBar } from "../utils/cardRender";

const judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  country: "fr",
};

const flagUrl = "https://flagcdn.com/w320/fr.png";

describe("generateCardTopBar", () => {
  test("should include the correct alt text for the flag", () => {
    const result = generateCardTopBar(judoka, flagUrl);
    expect(result.html).toContain('alt="France flag"');
  });

  test("should include the judoka's name in the HTML", () => {
    const result = generateCardTopBar(judoka, flagUrl);
    expect(result.html).toContain("Clarisse");
    expect(result.html).toContain("Agbegnenou");
  });

  test("should include the flag URL in the HTML", () => {
    const result = generateCardTopBar(judoka, flagUrl);
    expect(result.html).toContain(flagUrl);
  });
});