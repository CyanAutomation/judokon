# Round UI Flow

Classic battle rounds emit three UI events. Each handler operates on a shared
battle store that caches commonly used DOM elements.

1. **`roundStarted`** – resets button state, syncs the scoreboard and kicks off
   timers via `applyRoundUI`.
2. **`statSelected`** – adds a `selected` class to the chosen button, optionally
   surfaces a "You Picked" snackbar and disables further stat picks.
3. **`roundResolved`** – displays the outcome, updates the score, schedules the
   next-round countdown and clears any stat highlight.

Caching the player card, opponent card and stat buttons on the store avoids
repeated DOM queries inside timers and event handlers.
