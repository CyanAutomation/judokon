JU-DO-KON! – Mystery Card Simplification Plan (progress3)

Context

- New design decision: simplify the Mystery Card (judoka id=1) to remove placeholder stats/signature rows and focus on a large question-mark SVG, while keeping the normal card border and common background color.
- Provided SVG path to use: M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z

Goals

- Detect the Mystery card reliably (id === 1 during opponent placeholder render).
- Render a simplified layout: keep top bar, replace body with a centered, large question-mark SVG.
- Ensure card uses the common background and normal border.
- Maintain accessibility: aria-label for the card and the icon container.

Implementation Steps

1. Add mystery detection and aria-label override in JudokaCard
2. Add a dedicated Mystery section renderer with the provided SVG
3. Skip stats/signature/portrait for Mystery; span the new section across rows
4. Add minimal CSS for `.mystery-section` to center and size the SVG
5. Sanity-check existing tests (JudokaCard obscuring test remains unaffected)

Notes

- Do not change external call sites. Auto-detect id=1 with useObscuredStats.
- Keep `cardType` as `common` for Mystery to satisfy the “common background” requirement.
- Top bar is retained to keep name/flag and consistency; focus remains on the large SVG body.

Status

- Completed: 1) detection + aria, 2) mystery section, 3) skip sections and span, 4) CSS
- Pending: 5) sanity-check tests, adjust if any UI assertions expect '?' rows
