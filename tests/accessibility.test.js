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

  it("returns 'Unknown' if no matching technique is found", () => {
    const html = generateCardSignatureMove({ signatureMoveId: 999 }, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if gokyo name is invalid", () => {
    const invalidGokyo = {
      1: { id: 1, name: null } // Invalid name
    };
    const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if signatureMoveId is missing", () => {
    const html = generateCardSignatureMove({}, mockGokyo);
    expect(html).toContain("Unknown");
  });

  it("returns 'Unknown' if gokyo is null or undefined", () => {
    const htmlWithNull = generateCardSignatureMove(mockJudoka, null);
    const htmlWithUndefined = generateCardSignatureMove(mockJudoka, undefined);
    expect(htmlWithNull).toContain("Unknown");
    expect(htmlWithUndefined).toContain("Unknown");
  });

  it("handles special characters in technique names", () => {
    const specialGokyo = {
      1: { id: 1, name: "O-soto-gari" }
    };
    const specialJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(specialJudoka, specialGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("O-soto-gari");
  });
});
