import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Matches "Uchi-mata"
const mockGokyo = { id: 1, name: "Uchi-mata" }; // Single technique

describe("generateCardSignatureMove", () => {
  it("renders the correct signature move when found", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Uchi-mata");
  });

  it("returns 'Unknown' if no matching technique is found", () => {
    const html = generateCardSignatureMove({ signatureMoveId: 999 }, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if gokyo name is invalid", () => {
    const invalidGokyo = { id: 1, name: null }; // Invalid name
    const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
    expect(html).toContain("Signature Move:");
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

  it("returns 'Unknown' if gokyo is null or undefined", () => {
    const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
    const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
    expect(htmlWithNull).toContain("Unknown");
    expect(htmlWithUndefined).toContain("Unknown");
  });

  it("handles numeric signatureMoveId correctly", () => {
    const numericGokyo = { id: 1, name: "Ippon Seoi Nage" }; // Single technique
    const numericJudoka = { signatureMoveId: 1 }; // Matches the technique

    const html = generateCardSignatureMove(numericJudoka, numericGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Ippon Seoi Nage");
  });

  it("generates the correct HTML structure", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toContain('<div class="signature-move-container">');
    expect(html).toContain(
      '<span class="signature-move-label"><strong>Signature Move:</strong></span>'
    );
    expect(html).toContain('<span class="signature-move-value">Uchi-mata</span>');
  });

  it("handles special characters in technique names", () => {
    const specialGokyo = { id: 1, name: "O-soto-gari" }; // Single technique
    const specialJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(specialJudoka, specialGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("O-soto-gari");
  });

  it("handles empty strings in technique names", () => {
    const emptyGokyo = { id: 1, name: "" }; // Single technique with an empty name
    const emptyJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(emptyJudoka, emptyGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown"); // Empty name should fallback to "Unknown"
  });

  it("handles null values in technique names", () => {
    const nullGokyo = { id: 1, name: null }; // Single technique with a null name
    const nullJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(nullJudoka, nullGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown"); // Null name should fallback to "Unknown"
  });
});
