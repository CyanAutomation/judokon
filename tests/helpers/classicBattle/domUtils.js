export function createSnackbarContainer() {
  const container = document.createElement("div");
  container.id = "snackbar-container";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  document.body.appendChild(container);
  return container;
}

export function createRoundMessage(id = "round-message") {
  const el = document.createElement("p");
  el.id = id;
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", "status");
  document.body.appendChild(el);
  return el;
}

export function createTimerNodes() {
  const nextButton = document.createElement("button");
  nextButton.id = "next-button";
  const nextRoundTimer = document.createElement("p");
  nextRoundTimer.id = "next-round-timer";
  nextRoundTimer.setAttribute("aria-live", "polite");
  nextRoundTimer.setAttribute("aria-atomic", "true");
  nextRoundTimer.setAttribute("role", "status");
  document.body.append(nextButton, nextRoundTimer);
  return { nextButton, nextRoundTimer };
}
