import countryCodeMapping from './data/countryCodeMapping.json';

// Mock data
const mockJudoka = { signatureMoveId: "uchi-mata" };
const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];

describe("Malformed Data", () => {
  it("handles case sensitivity in signatureMoveId", () => {
    const caseInsensitiveJudoka = { signatureMoveId: "UCHI-MATA" };
    const html = generateCardSignatureMove(caseInsensitiveJudoka, mockGokyo);

    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles malformed gokyo entries gracefully", () => {
    const malformedGokyo = [{ id: "uchi-mata" }, { name: "Uchi Mata" }];
    const html = generateCardSignatureMove(mockJudoka, malformedGokyo);

    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });
});