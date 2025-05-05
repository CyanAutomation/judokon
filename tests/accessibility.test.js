import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Matches "Uchi-mata"
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  it("renders the correct signature move when found", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Uchi-mata");
  });

  it("falls back to 'Jigoku-guruma' if no matching technique is found", () => {
    const html = generateCardSignatureMove({ signatureMoveId: 999 }, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Jigoku-guruma");
  });

  it("falls back to 'Jigoku-guruma' if gokyoLookup is null or undefined", () => {
    const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
    const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
    expect(htmlWithNull).toContain("Signature Move:");
    expect(htmlWithNull).toContain("Jigoku-guruma");
    expect(htmlWithUndefined).toContain("Signature Move:");
    expect(htmlWithUndefined).toContain("Jigoku-guruma");
  });

  it("falls back to 'Jigoku-guruma' if gokyoLookup is empty", () => {
    const emptyGokyo = {};
    const html = generateCardSignatureMove(mockJudoka, emptyGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Jigoku-guruma");
  });

  it("falls back to 'Jigoku-guruma' if gokyo name is invalid", () => {
    const invalidGokyo = {
      1: { id: 1, name: null } // Invalid name
    };
    const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Jigoku-guruma");
  });

  it("falls back to 'Jigoku-guruma' if signatureMoveId is missing", () => {
    const html = generateCardSignatureMove({}, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Jigoku-guruma");
  });

  it("handles special characters in technique names", () => {
    const specialGokyo = {
      1: { id: 1, name: "Ō-soto-gari" }
    };
    const specialJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(specialJudoka, specialGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Ō-soto-gari");
  });
});