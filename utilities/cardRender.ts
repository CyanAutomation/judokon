assistant to=oboe.edit_file
<instructions>
- In `utilities/cardRender.ts`, after the line `import {getValue} from "./utils.ts"`, add:
  ```ts
  interface Stats {
    power: number | string;
    speed: number | string;
    technique: number | string;
    kumikata: number | string;
    newaza: number | string;
  }

  export interface Judoka {
    id?: number;
    firstname?: string;
    surname?: string;
    stats?: Stats;
    signatureMoveId?: number;
  }

  interface Technique {
    id: number;
    name: string;
  }
  ```
- Replace the constant `const PLACEHOLDER_PORTRAIT = "assets/judokaPortraits/judokaPortrait-0.png"` with:
  ```ts
  const PLACEHOLDER_PORTRAIT: string = "assets/judokaPortraits/judokaPortrait-0.png";
  ```
- Update the function signatures to include types:
  1. Change `export function generateCardPortrait(judoka)` to:
     ```ts
     export function generateCardPortrait(judoka: Judoka | null | undefined): string {
     ```
  2. Change `export function generateCardStats(judoka)` to:
     ```ts
     export function generateCardStats(judoka: Judoka | null | undefined): string {
     ```
  3. Change `export function generateCardSignatureMove(judoka, gokyo)` to:
     ```ts
     export function generateCardSignatureMove(judoka: Judoka | null | undefined, gokyo: Technique[] | null | undefined): string {
     ```
- Leave the implementation logic unchanged.
</instructions>
