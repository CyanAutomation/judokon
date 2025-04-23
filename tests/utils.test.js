import {getFlagUrl, generateCardSignatureMove} from "../utils.js"

describe("getFlagUrl", () => {
  it("returns correct URL for valid country code", () => {
    expect(getFlagUrl("JP")).toBe("https://flagcdn.com/w320/jp.png")
  })

  it("returns placeholder for missing code", () => {
    expect(getFlagUrl(null)).toMatch(/placeholder/)
  })
})

describe("generateCardSignatureMove", () => {
  const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];
  const mockJudoka = { signatureMoveId: "uchi-mata" };

  it("returns HTML with technique name", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toBe('<div class="signature-move">Uchi Mata</div>');
  });

  it('returns "Unknown" for unmatched ID', () => {
    const html = generateCardSignatureMove({ signatureMoveId: "nonexistent" }, mockGokyo);
    expect(html).toBe('<div class="signature-move">Unknown</div>');
  });

  it("handles empty gokyo array gracefully", () => {
    const html = generateCardSignatureMove(mockJudoka, []);
    expect(html).toBe('<div class="signature-move">Unknown</div>');
  });
});
