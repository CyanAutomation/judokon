import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: "uchi-mata" };
const mockGokyo = [{ id: "uchi-mata", name: "Uchi Mata" }];

describe("generateCardSignatureMove", () => {
  it("renders the correct signature move when found", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Uchi Mata");
  });

  it("returns 'Unknown' for case-insensitive mismatch", () => {
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

  it("returns 'Unknown' if gokyo is not an array", () => {
    const html = generateCardSignatureMove(mockJudoka, null);
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if signatureMoveId is missing", () => {
    const html = generateCardSignatureMove({}, mockGokyo);
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if no matching technique is found", () => {
    const html = generateCardSignatureMove({ signatureMoveId: 999 }, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if gokyo is an empty array", () => {
    const html = generateCardSignatureMove(mockJudoka, []);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles numeric signatureMoveId correctly", () => {
    const numericGokyo = [{ id: 1, name: "Ippon Seoi Nage" }];
    const numericJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(numericJudoka, numericGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Ippon Seoi Nage");
  });

  it("generates the correct HTML structure", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toBe(`
      <div class="card-signature">
        <span class="signature-move-label"><strong>Signature Move:</strong></span>
        <span class="signature-move-value">Uchi Mata</span>
      </div>
    `);
  });
});
