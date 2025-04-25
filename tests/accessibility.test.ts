import { generateCardSignatureMove } from "../utilities/cardRender.ts"

interface Judoka {
  signatureMoveId?: string
}

interface GokyoEntry {
  id?: string
  name?: string
}

const mockJudoka: Judoka = { signatureMoveId: "uchi-mata" }
const mockGokyo: GokyoEntry[] = [{ id: "uchi-mata", name: "Uchi Mata" }]

describe("generateCardSignatureMove", () => {
  it("renders the correct signature move when found", () => {
    const html = generateCardSignatureMove(mockJudoka, mockGokyo)
    expect(html).toContain("Signature Move:")
    expect(html).toContain("Uchi Mata")
  })

  it("returns 'Unknown' for case-insensitive mismatch", () => {
    const caseInsensitiveJudoka: Judoka = { signatureMoveId: "UCHI-MATA" }
    const html = generateCardSignatureMove(caseInsensitiveJudoka, mockGokyo)
    expect(html).toContain("Signature Move:")
    expect(html).toContain("Unknown")
  })

  it("handles malformed gokyo entries gracefully", () => {
    const malformedGokyo: GokyoEntry[] = [{ id: "uchi-mata" }, { name: "Uchi Mata" }]
    const html = generateCardSignatureMove(mockJudoka, malformedGokyo)
    expect(html).toContain("Signature Move:")
    expect(html).toContain("Unknown")
  })

  it("returns 'Unknown' if gokyo is not an array", () => {
    const html = generateCardSignatureMove(mockJudoka, null as unknown as GokyoEntry[])
    expect(html).toContain("Unknown")
  })

  it("returns 'Unknown' if signatureMoveId is missing", () => {
    const html = generateCardSignatureMove({} as Judoka, mockGokyo)
    expect(html).toContain("Unknown")
  })
})