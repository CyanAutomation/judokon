import { describe, it, expect, vi } from "vitest";
import { Card, createCard } from "../../src/components/Card.js";

describe("createCard", () => {
  it("creates a div card with text content", () => {
    const card = createCard("Hello");
    expect(card).toBeInstanceOf(HTMLDivElement);
    expect(card.classList.contains("card")).toBe(true);
    expect(card.textContent).toBe("Hello");
  });

  it("inserts HTML when the html flag is true", () => {
    const card = createCard("<em>hi</em>", { html: true });
    expect(card.innerHTML).toBe("<em>hi</em>");
  });

  it("creates an anchor card when href provided", () => {
    const card = createCard("Link", { href: "#" });
    expect(card).toBeInstanceOf(HTMLAnchorElement);
    expect(card).toHaveAttribute("href", "#");
  });

  it("applies id, class and click handler", () => {
    const handle = vi.fn();
    const card = createCard("content", { id: "c1", className: "extra", onClick: handle });
    expect(card.id).toBe("c1");
    expect(card.classList.contains("card")).toBe(true);
    expect(card.classList.contains("extra")).toBe(true);
    card.click();
    expect(handle).toHaveBeenCalled();
  });

  it("accepts DOM node content", () => {
    const span = document.createElement("span");
    span.textContent = "inside";
    const card = createCard(span);
    expect(card.firstChild).toBe(span);
  });
});

describe("Card class", () => {
  it("exposes the created element", () => {
    const instance = new Card("Hello");
    expect(instance.element).toBeInstanceOf(HTMLDivElement);
    expect(instance.element.classList.contains("card")).toBe(true);
  });
});
