export const marked = {
  /**
   * Very small markdown parser supporting headings, bold text, paragraphs and lists.
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
        const regex = ordered ? /^(\s*)\d+\.\s*(.*)$/ : /^(\s*)[-*]\s*(?:\[[xX ]\])?\s*(.*)$/;
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

    return md
      .trim()
      .split(/\n\n+/)
      .map((block) => {
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
        if (lines.every((l) => /^\s*[-*]/.test(l))) {
          return renderList(lines, false);
        }
        if (lines.every((l) => /^\s*\d+\./.test(l))) {
          return renderList(lines, true);
        }
        return `<p>${renderInline(block.trim())}</p>`;
      })
      .join("");
  }
};
