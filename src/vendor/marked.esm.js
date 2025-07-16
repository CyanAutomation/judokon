export const marked = {
  /**
   * Very small markdown parser supporting headings, bold text paragraphs, lists,
   * tables and horizontal rules.
   *
   * @param {string} md - Markdown string.
   * @returns {string} HTML string.
   */
  parse(md) {
    function renderInline(text) {
      return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    function renderList(lines, ordered) {
      let html = "";
      const stack = [];
      let prev = 0;

      lines.forEach((line) => {
        const regex = ordered ? /^(\s*)\d+\.\s+(.*)$/ : /^(\s*)[-*]\s+(?:\[[xX ]\]\s+)?(.*)$/;
        const match = line.match(regex);
        if (!match) return;
        const [, indent, text] = match;
        const level = Math.floor(indent.length / 2);
        const type = ordered ? "ol" : "ul";

        if (stack.length === 0) {
          html += `<${type}><li>${renderInline(text)}`;
          stack.push(type);
        } else if (level > prev) {
          html += `<${type}><li>${renderInline(text)}`;
          stack.push(type);
        } else if (level === prev) {
          html += `</li><li>${renderInline(text)}`;
        } else {
          while (prev > level) {
            const t = stack.pop();
            html += `</li></${t}>`;
            prev--;
          }
          html += `</li><li>${renderInline(text)}`;
        }
        prev = level;
      });

      while (stack.length) {
        const t = stack.pop();
        html += `</li></${t}>`;
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
          return "<hr/>";
        }
        if (block.startsWith("# ")) {
          return `<h1>${renderInline(block.slice(2).trim())}</h1>`;
        }
        if (block.startsWith("## ")) {
          return `<h2>${renderInline(block.slice(3).trim())}</h2>`;
        }
        if (block.startsWith("### ")) {
          return `<h3>${renderInline(block.slice(4).trim())}</h3>`;
        }
        const lines = block.split("\n");
        if (
          lines.length >= 2 &&
          lines.every((l) => l.trim().startsWith("|")) &&
          /^\s*(\|\s*-{3,}\s*)+\|?\s*$/.test(lines[1])
        ) {
          return renderTable(lines);
        }
        if (lines.every((l) => /^\s*[-*]\s+(?:\[[xX ]\]\s+)?/.test(l))) {
          return renderList(lines, false);
        }
        if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
          return renderList(lines, true);
        }
        return `<p>${renderInline(block.trim())}</p>`;
      })
      .join("");
  }
};
