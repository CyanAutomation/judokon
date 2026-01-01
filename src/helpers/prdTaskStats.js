/**
 * Extract task statistics from a PRD markdown string.
 *
 * @pseudocode
 * 1. Find text between the `## Tasks` heading and the next `##` heading or EOF.
 * 2. Split this section into lines and check for `- [ ]` or `- [x]` markers.
 * 3. Increment counts for each task line and completed task.
 * 4. Return an object with `total` and `completed` counts.
 *
 * @param {string} [text=""] - Markdown content to parse.
 * @returns {{ total: number, completed: number }} Task counts.
 */
export function getPrdTaskStats(text = "") {
  const match = text.match(/##\s*Tasks([\s\S]*?)(?:\n##\s|$)/);
  if (!match) return { total: 0, completed: 0 };
  const lines = match[1].split(/\n/);
  let total = 0;
  let completed = 0;
  for (const line of lines) {
    const result = line.match(/-\s*\[(\s*x\s*|\s+)\]/i);
    if (result) {
      total += 1;
      if (result[1].trim().toLowerCase() === "x") completed += 1;
    }
  }
  return { total, completed };
}
