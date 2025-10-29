// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/vendor/marked.esm.js", () => ({
  marked: {
    parse: vi.fn()
  }
}));

import { markdownToHtml } from "../../src/helpers/markdownToHtml.js";
import { marked } from "../../src/vendor/marked.esm.js";

const parseMock = marked.parse;

describe("markdownToHtml", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("returns an empty string without invoking marked.parse for falsy inputs", () => {
    expect(markdownToHtml("")).toBe("");
    expect(markdownToHtml(null)).toBe("");
    expect(markdownToHtml(undefined)).toBe("");

    expect(marked.parse).not.toHaveBeenCalled();
  });

  it("delegates to marked.parse for text input and surfaces the returned HTML", () => {
    const md = "# Title";
    const html = "<h1>Title</h1>";
    parseMock.mockReturnValueOnce(html);

    expect(markdownToHtml(md)).toBe(html);
    expect(marked.parse).toHaveBeenCalledTimes(1);
    expect(marked.parse).toHaveBeenCalledWith(md);
  });
});
