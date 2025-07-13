export function enableCardFlip(cardElement) {
  if (!cardElement) return;
  const toggle = () => {
    cardElement.classList.toggle("show-card-back");
  };
  cardElement.addEventListener("click", toggle);
  cardElement.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
}
