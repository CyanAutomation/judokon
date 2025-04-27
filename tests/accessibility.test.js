import { generateCardSignatureMove } from "../helpers/cardRender.js";

// Mock data
const mockJudoka = { signatureMoveId: 1 }; // Matches "Uchi-mata"
const mockGokyo = [
  { id: 0, name: "Unknown" },
  { id: 1, name: "Uchi-mata" },
  { id: 2, name: "O-soto-gari" }
];

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
  
  it("handles special characters in technique names", () => {
    const specialGokyo = [{ id: 1, name: "O-soto-gari" }];
    const specialJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(specialJudoka, specialGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("O-soto-gari");
  });

  it("handles empty strings in technique names", () => {
    const emptyGokyo = [{ id: 1, name: "" }];
    const emptyJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(emptyJudoka, emptyGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles null values in technique names", () => {
    const nullGokyo = [{ id: 1, name: null }];
    const nullJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(nullJudoka, nullGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles undefined values in technique names", () => {
    const undefinedGokyo = [{ id: 1, name: undefined }];
    const undefinedJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(undefinedJudoka, undefinedGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles non-string values in technique names", () => {
    const nonStringGokyo = [{ id: 1, name: 123 }];
    const nonStringJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(nonStringJudoka, nonStringGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles mixed types in gokyo array", () => {
    const mixedGokyo = [{ id: 1, name: "Uchi-mata" }, { id: "2", name: null }];
    const mixedJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(mixedJudoka, mixedGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Uchi-mata");
  });

  it("handles empty gokyo array", () => {
    const emptyGokyo = [];
    const emptyJudoka = { signatureMoveId: 1 };
    const html = generateCardSignatureMove(emptyJudoka, emptyGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown");
  });

  it("handles large gokyo array", () => {
    const largeGokyo = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Technique ${i}`
    }));
    const largeJudoka = { signatureMoveId: 500 };
    const html = generateCardSignatureMove(largeJudoka, largeGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Technique 500");
  });

  it("handles large gokyo array with special characters", () => {
    const largeGokyo = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Technique ${i} - Special!`
    }));
    const largeJudoka = { signatureMoveId: 500 };
    const html = generateCardSignatureMove(largeJudoka, largeGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Technique 500 - Special!");
  });

  it("handles large gokyo array with mixed types", () => {
    const largeGokyo = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: i % 2 === 0 ? `Technique ${i}` : null
    }));
    const largeJudoka = { signatureMoveId: 500 };
    const html = generateCardSignatureMove(largeJudoka, largeGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Technique 500");
  });

  it("handles large gokyo array with undefined values", () => {
    const largeGokyo = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: i % 2 === 0 ? `Technique ${i}` : undefined
    }));
    const largeJudoka = { signatureMoveId: 500 };
    const html = generateCardSignatureMove(largeJudoka, largeGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Technique 500");
  });

  it("handles large gokyo array with null values", () => {
    const largeGokyo = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: i % 2 === 0 ? `Technique ${i}` : null
    }));
    const largeJudoka = { signatureMoveId: 500 };
    const html = generateCardSignatureMove(largeJudoka, largeGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Technique 500");
  });

    it("handles mismatched types between signatureMoveId and gokyo id", () => {
    const mismatchedGokyo = [
      { id: "1", name: "Uchi-mata" }, // id as a string
      { id: 2, name: "O-soto-gari" }
    ];
    const judokaWithNumericId = { signatureMoveId: 1 }; // signatureMoveId as a number
  
    const html = generateCardSignatureMove(judokaWithNumericId, mismatchedGokyo);
    expect(html).toContain("Signature Move:");
    expect(html).toContain("Unknown"); // Should not match due to type mismatch
  });
});
