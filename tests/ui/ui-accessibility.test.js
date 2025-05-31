import { generateCardSignatureMove } from "../../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Matches "Uchi-mata"
const mockGokyo = {
  1: { id: 1, name: "Uchi-mata" },
  2: { id: 2, name: "O-soto-gari" }
};

describe("generateCardSignatureMove", () => {
  it("escapes special characters in technique names", () => {
    const mockJudoka = { signatureMoveId: 1 };
    const specialGokyo = {
      1: { id: 1, name: "<script>alert('XSS')</script>" }
    };

    const html = generateCardSignatureMove(mockJudoka, specialGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
  });

  const fallbackCases = [
    {
      description: "no matching technique is found",
      judoka: { signatureMoveId: 999 },
      gokyo: mockGokyo
    },
    { description: "gokyoLookup is null", judoka: mockJudoka, gokyo: null },
    { description: "gokyoLookup is undefined", judoka: mockJudoka, gokyo: undefined },
    { description: "gokyoLookup is empty", judoka: mockJudoka, gokyo: {} },
    {
      description: "gokyo name is invalid",
      judoka: mockJudoka,
      gokyo: { 1: { id: 1, name: null } }
    },
    { description: "signatureMoveId is missing", judoka: {}, gokyo: mockGokyo }
  ];

  fallbackCases.forEach(({ description, judoka, gokyo }) => {
    it(`falls back to 'Jigoku-guruma' if ${description}`, () => {
      const html = generateCardSignatureMove(judoka, gokyo);
      expect(html).toContain("Signature Move:");
      expect(html).toContain("Jigoku-guruma");
    });
  });

  it("handles an empty judoka object gracefully", () => {
    const html = generateCardSignatureMove({}, mockGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Jigoku-guruma");
  });

  it("handles invalid gokyo structure gracefully", () => {
    const invalidGokyo = { 1: { invalidKey: "invalidValue" } };
    const html = generateCardSignatureMove(mockJudoka, invalidGokyo);
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

  it("escapes special characters in technique names", () => {
    const specialGokyo = {
      1: { id: 1, name: "<script>alert('XSS')</script>" }
    };
    const html = generateCardSignatureMove(mockJudoka, specialGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("&lt;script&gt;alert(&#039;XSS&#039;)&lt;/script&gt;");
  });
});
