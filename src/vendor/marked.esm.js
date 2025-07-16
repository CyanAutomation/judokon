export const marked = {
  /**
   * Very small markdown parser supporting headings, paragraphs and lists.
   *
   * @param {string} md - Markdown string.
   * @returns {string} HTML string.
   */
  parse(md) {
    return md
      .trim()
      .split(/\n\n+/)
      .map((block) => {
        if (block.startsWith("# ")) {
          return `<h1>${block.slice(2).trim()}</h1>`;
        }
        if (block.startsWith("## ")) {
          return `<h2>${block.slice(3).trim()}</h2>`;
        }
        if (block.startsWith("### ")) {
          return `<h3>${block.slice(4).trim()}</h3>`;
        }
        const lines = block.split("\n");
        if (lines.every((l) => /^[-*] /.test(l))) {
          return `<ul>${lines.map((l) => `<li>${l.slice(2).trim()}</li>`).join("")}</ul>`;
        }
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return `<ol>${lines
            .map((l) => `<li>${l.replace(/^\d+\.\s*/, "").trim()}</li>`)
            .join("")}</ol>`;
        }
        return `<p>${block.trim()}</p>`;
      })
      .join("");
  }
};
