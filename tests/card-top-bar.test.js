import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test/setup.js'],
  },
});

const judoka = {
  firstname: "Clarisse",
  surname: "Agbegnenou",
  country: "fr",
};

const flagUrl = "https://flagcdn.com/w320/fr.png";

describe("generateCardTopBar", () => {
    describe("Accessibility", () => {
      test("should have no accessibility violations", async () => {
        const judoka = {
          firstname: "Clarisse",
          surname: "Agbegnenou",
          country: "fr",
        }
        const result = generateCardTopBar(judoka, "https://flagcdn.com/w320/fr.png")

        const container = document.createElement("div")
        container.innerHTML = result.html

        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
      test("should have appropriate alt text", () => {
        const result = generateCardTopBar(judoka, flagUrl)
        const container = document.createElement("div")
        container.innerHTML = result.html
        const img = container.querySelector("img")
        expect(img).toHaveAttribute("alt", "France flag")
      })
    })
  })