/**
 * Lightweight DOM helpers for tests to avoid ad-hoc `document.body.innerHTML` and
 * direct DOM manipulation scattered across many tests.
 *
 * Usage:
 *   const { root, container, query, cleanup } = mount('<div><button/></div>');
 *   // ...assertions...
 *   cleanup();
 */
export function mount(htmlOrElement = "") {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-test-root", "true");

  let container;
  if (typeof htmlOrElement === "string") {
    container = document.createElement("div");
    container.innerHTML = htmlOrElement;
    wrapper.appendChild(container);
  } else if (htmlOrElement instanceof Node) {
    container = htmlOrElement;
    wrapper.appendChild(container);
  } else {
    container = document.createElement("div");
    wrapper.appendChild(container);
  }

  document.body.appendChild(wrapper);

  return {
    root: wrapper,
    container,
    query: (sel) => wrapper.querySelector(sel),
    findAll: (sel) => Array.from(wrapper.querySelectorAll(sel)),
    cleanup: () => {
      if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
    }
  };
}

export function clearBody() {
  document.body.innerHTML = "";
}

export function createEl(tag, attrs = {}) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, String(v));
  }
  return el;
}
