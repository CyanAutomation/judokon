function renderInline(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>");
}

export const marked = {
  /**
   * Very small markdown parser supporting headings, bold and italic text,
   * paragraphs, lists, tables and horizontal rules (each rule followed by a
   * line break for spacing).
   *
   * @param {string} md - Markdown string.
   * @returns {string} HTML string.
   */
  parse(md) {
    function renderList(lines) {
      let html = "";
      const stack = [];

      const itemRegex = /^(\s*)([-*]|\d+\.)\s+(?:\[[xX ]\]\s+)?(.*)$/;

      lines.forEach((line) => {
        const match = line.match(itemRegex);
        if (!match) return;
        const [, indent, marker, text] = match;
        const level = Math.floor(indent.length / 2);
        const type = /\d+\./.test(marker) ? "ol" : "ul";

        while (stack.length && level < stack[stack.length - 1].level) {
          const { type: t } = stack.pop();
          html += `</li></${t}>`;
        }

        if (
          stack.length === 0 ||
          level > stack[stack.length - 1].level ||
          type !== stack[stack.length - 1].type
        ) {
          if (stack.length && level === stack[stack.length - 1].level) {
            const { type: t } = stack.pop();
            html += `</li></${t}>`;
          }
          html += `<${type}><li>${renderInline(text)}`;
          stack.push({ type, level });
        } else {
          html += `</li><li>${renderInline(text)}`;
        }
      });

      while (stack.length) {
        const { type } = stack.pop();
        html += `</li></${type}>`;
      }
      return html;
    }

    function renderTable(lines) {
      const clean = lines.filter((l) => !/^(\s*\|\s*)*$/.test(l));

      function splitRow(row) {
        let text = row.trim();
        if (text.startsWith("|")) text = text.slice(1);
        if (text.endsWith("|")) text = text.slice(0, -1);
        return text.split("|").map((c) => c.trim());
      }

      const headers = splitRow(clean[0]);
      const bodyRows = clean.slice(2).map(splitRow);

      const thead = `<thead><tr>${headers
        .map((h) => `<th>${renderInline(h)}</th>`)
        .join("")}</tr></thead>`;

      const tbodyContent = bodyRows
        .map((cells) => `<tr>${cells.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
        .join("");

      const tbody = `<tbody>${tbodyContent}</tbody>`;

      return `<table>${thead}${tbody}</table>`;
    }

    return md
      .trim()
      .split(/\n\n+/)
      .map((block) => {
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(block.trim())) {
          return "<br/><hr/><br/>";
        }
        if (block.startsWith("# ")) {
          return `<br/><h2>${renderInline(block.slice(2).trim())}</h2>`;
        }
        if (block.startsWith("## ")) {
          return `<h3>${renderInline(block.slice(3).trim())}</h3>`;
        }
        if (block.startsWith("### ")) {
          return `<h4>${renderInline(block.slice(4).trim())}</h4>`;
        }
        const lines = block.split("\n");
        if (
          lines.length >= 2 &&
          lines.every((l) => l.trim().startsWith("|")) &&
          /^\s*(\|\s*-{3,}\s*)+\|?\s*$/.test(lines[1])
        ) {
          return renderTable(lines);
        }
        const listPattern = /^\s*(?:[-*]|\d+\.)\s+(?:\[[xX ]\]\s+)?/;
        if (lines.every((l) => listPattern.test(l))) {
          return renderList(lines);
        }
        return `<p>${renderInline(block.trim())}</p>`;
      })
      .join("");
  },
  /**
   * Parse inline markdown (no block handling).
   *
   * @param {string} md - Markdown string.
   * @returns {string} HTML string.
   */
  parseInline(md) {
    return renderInline(md);
  }
};
