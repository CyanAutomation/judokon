/**
 * Private test fixtures for hover-zoom accessibility tests.
 * These are test-only helpers and should not be used in production code.
 */

// Disable animations for deterministic hover tests
export function disableAnimations() {
  const style = document.createElement('style');
  style.textContent = `
    * {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `;
  document.head.appendChild(style);
}

// Add a dynamic card for zoom testing
export function addDynamicCard() {
  const card = document.createElement('div');
  card.setAttribute('data-testid', 'dynamic-card');
  card.textContent = 'Dynamic Card for Zoom Test';
  document.body.appendChild(card);
}
