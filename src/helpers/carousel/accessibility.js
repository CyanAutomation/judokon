const MIN_TOUCH_TARGET_SIZE = 48;

function ensureTouchTargetSize(element) {
  const style = window.getComputedStyle(element);
  const width = parseInt(style.width, 10);
  const height = parseInt(style.height, 10);
  if (width < MIN_TOUCH_TARGET_SIZE || height < MIN_TOUCH_TARGET_SIZE) {
    element.style.minWidth = `${MIN_TOUCH_TARGET_SIZE}px`;
    element.style.minHeight = `${MIN_TOUCH_TARGET_SIZE}px`;
    element.style.padding = "10px";
  }
}

export function applyAccessibilityImprovements(wrapper) {
  const buttons = wrapper.querySelectorAll(".scroll-button");
  buttons.forEach((button) => ensureTouchTargetSize(button));
  const cards = wrapper.querySelectorAll(".judoka-card");
  cards.forEach((card) => {
    card.style.color = "var(--color-text-inverted)";
  });
}

export { ensureTouchTargetSize };
