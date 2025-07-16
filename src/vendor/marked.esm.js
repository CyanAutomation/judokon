export const marked = {
  /**
   * Very small markdown parser supporting headings and paragraphs.
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
        return `<p>${block.trim()}</p>`;
      })
      .join("");
  }
};
