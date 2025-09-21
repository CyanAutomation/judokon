import { describe, it, expect } from "vitest";
import { createCard } from "./Card.js";

describe("createCard", () => {
  it("creates a basic card element", () => {
    const card = createCard();

    expect(card.element.tagName).toBe("DIV");
    expect(card.element.className).toBe("card");
  });

  it("applies custom class name", () => {
    const card = createCard(null, { className: "special-card" });

    expect(card.element.className).toBe("card special-card");
  });

  it("handles string content", () => {
    const card = createCard("<p>Card content</p>");

    expect(card.element.innerHTML).toBe("<p>Card content</p>");
  });

  it("handles HTMLElement content", () => {
    const content = document.createElement("div");
    content.textContent = "Dynamic content";
    const card = createCard(content);

    expect(card.element.querySelector("div").textContent).toBe("Dynamic content");
  });

  it("handles DocumentFragment content", () => {
    const fragment = document.createDocumentFragment();
    const p1 = document.createElement("p");
    p1.textContent = "First paragraph";
    const p2 = document.createElement("p");
    p2.textContent = "Second paragraph";
    fragment.appendChild(p1);
    fragment.appendChild(p2);

    const card = createCard(fragment);

    expect(card.element.querySelectorAll("p")).toHaveLength(2);
    expect(card.element.textContent).toContain("First paragraph");
    expect(card.element.textContent).toContain("Second paragraph");
  });

  it("makes card clickable when specified", () => {
    const card = createCard("Clickable content", { clickable: true });

    expect(card.element.getAttribute("tabindex")).toBe("0");
    expect(card.element.getAttribute("role")).toBe("button");
  });

  it("tracks click events when clickable", () => {
    const card = createCard("Clickable", { clickable: true });

    expect(card.onClick).not.toHaveBeenCalled();

    card.element.click();
    expect(card.onClick).toHaveBeenCalledTimes(1);
  });

  it("does not track clicks when not clickable", () => {
    const card = createCard("Not clickable");

    // onClick spy should still exist but not be called
    expect(card.onClick).not.toHaveBeenCalled();

    card.element.click();
    // Should not throw and spy should still not be called
    expect(card.onClick).not.toHaveBeenCalled();
  });

  it("allows content updates", () => {
    const card = createCard("Original content");

    expect(card.element.textContent).toBe("Original content");

    card.updateContent("Updated content");
    expect(card.element.textContent).toBe("Updated content");
  });

  it("allows content updates with HTML elements", () => {
    const card = createCard("Original");

    const newContent = document.createElement("span");
    newContent.textContent = "New content";
    card.updateContent(newContent);

    expect(card.element.querySelector("span").textContent).toBe("New content");
  });

  it("allows class name updates", () => {
    const card = createCard();

    expect(card.element.className).toBe("card");

    card.setClassName("highlighted");
    expect(card.element.className).toBe("card highlighted");

    card.setClassName(""); // Empty string
    expect(card.element.className).toBe("card");
  });
});