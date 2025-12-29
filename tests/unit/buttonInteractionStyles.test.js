import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";

function readCss(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const buttonsCss = readCss("src/styles/buttons.css");
const navbarCss = readCss("src/styles/navbar.css");
const buttonsRoot = postcss.parse(buttonsCss);
const navbarRoot = postcss.parse(navbarCss);

function ruleMatchesAtRule(rule, options) {
  if (!options?.atRuleName) {
    return true;
  }

  const parent = rule.parent;
  if (!parent || parent.type !== "atrule") {
    return false;
  }

  if (parent.name !== options.atRuleName) {
    return false;
  }

  if (options.atRuleParams && parent.params !== options.atRuleParams) {
    return false;
  }

  return true;
}

function getRuleForSelector(root, selector, options = {}) {
  let target;
  root.walkRules((rule) => {
    if (!ruleMatchesAtRule(rule, options)) {
      return;
    }

    const selectors = rule.selector.split(",").map((part) => part.trim());
    if (selectors.includes(selector)) {
      target = rule;
      return false; // Stop walking after first match
    }
  });
  return target;
}

function getDeclarations(root, selector, options = {}) {
  const rule = getRuleForSelector(root, selector, options);
  if (!rule) {
    return null;
  }

  return rule.nodes.reduce((acc, node) => {
    if (node.type === "decl") {
      acc[node.prop] = node.value.trim();
    }
    return acc;
  }, {});
}

function hasSelector(root, selector, options = {}) {
  return Boolean(getRuleForSelector(root, selector, options));
}

function hasSelectorFragment(root, selectorFragment, options = {}) {
  let found = false;
  root.walkRules((rule) => {
    if (!ruleMatchesAtRule(rule, options)) {
      return;
    }

    const selectors = rule.selector.split(",").map((part) => part.trim());
    if (selectors.some((part) => part.includes(selectorFragment))) {
      found = true;
    }
  });
  return found;
}

describe("button interaction styles", () => {
  it("defines ripple pseudo-elements for primary button surfaces", () => {
    expect(hasSelector(buttonsRoot, "button:not(.judoka-card)::after")).toBe(true);
    expect(hasSelector(buttonsRoot, ".primary-button::after")).toBe(true);
  });

  it("includes active and focus-visible ripple states", () => {
    expect(hasSelector(buttonsRoot, "button:not(.judoka-card):active::after")).toBe(true);
    expect(hasSelector(buttonsRoot, "button:not(.judoka-card):focus-visible::after")).toBe(true);
    expect(hasSelector(buttonsRoot, "button:not(.judoka-card):active:focus-visible::after")).toBe(
      true
    );
  });

  it("respects reduced motion preferences", () => {
    const mediaOptions = {
      atRuleName: "media",
      atRuleParams: "(prefers-reduced-motion: reduce)"
    };

    expect(getDeclarations(buttonsRoot, "button:not(.judoka-card)", mediaOptions)?.transition).toBe(
      "none"
    );
    expect(getDeclarations(buttonsRoot, ".primary-button", mediaOptions)?.transition).toBe("none");
    expect(
      getDeclarations(buttonsRoot, "button:not(.judoka-card)::after", mediaOptions)?.transition
    ).toBe("none");
    expect(getDeclarations(buttonsRoot, ".primary-button::after", mediaOptions)?.transition).toBe(
      "none"
    );
    expect(
      getDeclarations(buttonsRoot, "button:not(.judoka-card):active", mediaOptions)?.transform
    ).toBe("none");
    expect(getDeclarations(buttonsRoot, ".primary-button:active", mediaOptions)?.transform).toBe(
      "none"
    );

    expect(
      getDeclarations(buttonsRoot, ".reduce-motion button:not(.judoka-card)")?.transition
    ).toBe("none");
    expect(getDeclarations(buttonsRoot, ".reduce-motion .primary-button")?.transition).toBe("none");
    expect(
      getDeclarations(buttonsRoot, ".reduce-motion button:not(.judoka-card)::after")?.transition
    ).toBe("none");
    expect(getDeclarations(buttonsRoot, ".reduce-motion .primary-button::after")?.transition).toBe(
      "none"
    );
    expect(
      getDeclarations(buttonsRoot, ".reduce-motion button:not(.judoka-card):active")?.transform
    ).toBe("none");
    expect(getDeclarations(buttonsRoot, ".reduce-motion .primary-button:active")?.transform).toBe(
      "none"
    );
  });
});

describe("navbar ripple overrides", () => {
  it("mirrors reduced motion safeguards", () => {
    const mediaOptions = {
      atRuleName: "media",
      atRuleParams: "(prefers-reduced-motion: reduce)"
    };

    expect(getDeclarations(navbarRoot, ".top-navbar button", mediaOptions)?.transition).toBe(
      "none"
    );
    expect(
      getDeclarations(navbarRoot, ".top-navbar .primary-button", mediaOptions)?.transition
    ).toBe("none");
    expect(getDeclarations(navbarRoot, ".filter-bar button", mediaOptions)?.transition).toBe(
      "none"
    );
    expect(getDeclarations(navbarRoot, ".top-navbar button::after", mediaOptions)?.transition).toBe(
      "none"
    );
    expect(
      getDeclarations(navbarRoot, ".top-navbar .primary-button::after", mediaOptions)?.transition
    ).toBe("none");
    expect(getDeclarations(navbarRoot, ".filter-bar button::after", mediaOptions)?.transition).toBe(
      "none"
    );
    expect(getDeclarations(navbarRoot, ".top-navbar button:active", mediaOptions)?.transform).toBe(
      "none"
    );
    expect(
      getDeclarations(navbarRoot, ".top-navbar .primary-button:active", mediaOptions)?.transform
    ).toBe("none");
    expect(getDeclarations(navbarRoot, ".filter-bar button:active", mediaOptions)?.transform).toBe(
      "none"
    );

    expect(hasSelectorFragment(navbarRoot, ".ripple")).toBe(false);

    expect(getDeclarations(navbarRoot, ".reduce-motion .top-navbar button")?.transition).toBe(
      "none"
    );
    expect(
      getDeclarations(navbarRoot, ".reduce-motion .top-navbar .primary-button")?.transition
    ).toBe("none");
    expect(getDeclarations(navbarRoot, ".reduce-motion .filter-bar button")?.transition).toBe(
      "none"
    );
    expect(
      getDeclarations(navbarRoot, ".reduce-motion .top-navbar button::after")?.transition
    ).toBe("none");
    expect(
      getDeclarations(navbarRoot, ".reduce-motion .top-navbar .primary-button::after")?.transition
    ).toBe("none");
    expect(
      getDeclarations(navbarRoot, ".reduce-motion .filter-bar button::after")?.transition
    ).toBe("none");
    expect(getDeclarations(navbarRoot, ".reduce-motion .top-navbar button:active")?.transform).toBe(
      "none"
    );
    expect(
      getDeclarations(navbarRoot, ".reduce-motion .top-navbar .primary-button:active")?.transform
    ).toBe("none");
    expect(getDeclarations(navbarRoot, ".reduce-motion .filter-bar button:active")?.transform).toBe(
      "none"
    );
  });
});
