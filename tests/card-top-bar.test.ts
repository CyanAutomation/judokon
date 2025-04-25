import {generateCardTopBar} from "../utilities/cardTopBar.ts"

interface Judoka {
  firstname: string
  surname: string
  countryCode?: string
}

const judoka: Judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  countryCode: "fr",
}

const flagUrl = "https://flagcdn.com/w320/fr.png"

describe("generateCardTopBar", () => {
  test("should include the correct alt text for the flag", () => {
    const result = generateCardTopBar(judoka, flagUrl)
    expect(result.html).toContain('alt="France flag"')
  })

  test("should include the judoka's name in the HTML", () => {
    const result = generateCardTopBar(judoka, flagUrl)
    expect(result.html).toContain("Clarisse")
    expect(result.html).toContain("Agbegnenou")
  })

  test("should include the flag URL in the HTML", () => {
    const result = generateCardTopBar(judoka, flagUrl)
    expect(result.html).toContain(flagUrl)
  })

  test("should handle missing flagUrl by using the placeholder", () => {
    const result = generateCardTopBar(judoka)
    expect(result.flagUrl).toContain("placeholder-flag.png")
    expect(result.html).toContain("placeholder-flag.png")
  })

  test("should handle missing judoka gracefully", () => {
    const result = generateCardTopBar(null as unknown as Judoka, flagUrl)
    expect(result.title).toBe("No data")
    expect(result.html).toContain("No data available")
  })

  test("should handle missing countryCode gracefully", () => {
    const incompleteJudoka: Judoka = {firstname: "Clarisse", surname: "Agbegnenou"}
    const result = generateCardTopBar(incompleteJudoka, flagUrl)
    expect(result.html).toContain('alt="Unknown flag"')
  })
})
