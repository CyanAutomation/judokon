import { describe, it, expect, vi } from "vitest";
import { interactions } from "../utils/componentTestUtils.js";

describe("onDomReady (Enhanced Natural Document Lifecycle)", () => {
  it("runs callback immediately when document is ready", async () => {
    // Set document ready state naturally
    interactions.naturalDocumentReady("complete", false);

    const { onDomReady } = await import("../../src/helpers/domReady.js");
    const fn = vi.fn();
    onDomReady(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs callback after DOMContentLoaded when loading using natural document state", async () => {
    // Set document to loading state naturally
    interactions.naturalDocumentReady("loading", false);

    const addSpy = vi.spyOn(document, "addEventListener");
    const { onDomReady } = await import("../../src/helpers/domReady.js");
    const fn = vi.fn();

    onDomReady(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith("DOMContentLoaded", fn, { once: true });

    // Trigger natural document ready
    interactions.naturalDocumentReady("complete", true);

    // Allow the event to process
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
