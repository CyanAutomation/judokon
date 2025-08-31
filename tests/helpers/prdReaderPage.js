/** Sample PRD documents used for unit tests. */
export const mockDocsMap = {
  "b.md": "# Second doc",
  "a.md": "# First doc"
};

/** Basic parser that wraps markdown headings in an `<h1>` tag. */
export const basicParser = (md) => `<h1>${md}</h1>`;
