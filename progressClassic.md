QA Report for src/pages/battleClassic.html

Issues found
Opponent card visibility
Mystery card missing – In most rounds the opponent’s card (portrait, stats and weight class) is fully visible before the player selects a stat. The PRD requires a “Mystery Judoka Card” placeholder with only a “?” icon until the player chooses a stat. This leak allows players to choose the strongest stat with full knowledge and undermines suspense.
Steps: Start a match and click “Next” to enter round one; note that the opponent’s card and stats are visible immediately instead of a blank placeholder.
Blank opponent area – Occasionally the right‑hand card container is empty (no card or placeholder). This leaves the interface unbalanced and confuses players about whether a card exists. The PRD specifies a placeholder must be shown every round.
State handling and scoring
Incorrect round progression – Round numbers sometimes increment by more than one (e.g., jumping from round 6 to round 8). This suggests state transitions aren’t synchronized with the battle engine’s events, violating the deterministic state flow described in the PRD.
Steps: Play several rounds using auto‑select; after a timer expires, observe that round indices skip numbers.
Score inconsistencies – The player score can jump unexpectedly. When we let the timer expire once (round 6), the score changed from 2‑0 to 2‑2, indicating two losses occurred within one round. Per the functional requirements, each round should award at most one point.
No outcome messaging – The scoreboard never announces round outcomes (Win/Loss/Draw), the stat chosen (“You picked: Power”) or “Opponent is choosing…” messages. The PRD specifies that score updates, outcome messages and opponent‑choosing prompts should be displayed via the scoreboard and snackbar. Players therefore receive no feedback on why they gained or lost points.
Cards repeat within a match – The same player card (e.g., “Joana Ramos” or “Shōzō Fuji”) appeared multiple rounds in a single match. The requirements specify that each player draws one unique card per round from a 25‑card deck with no duplicates per match, so repeats should not occur.
User interaction
Stat buttons remain active – After selecting a stat, the buttons remain clickable. There is no disabled state to prevent multiple selections or mis‑clicks, contradicting the requirement that buttons lock after a choice.
Steps: Click a stat; the button highlights briefly then returns to the active color, allowing further clicks before the next round.
Keyboard navigation is incomplete – Tabbing through the interface reaches the “Main Menu”, “Replay”, “Quit” and “Next” buttons, but not the stat selection buttons. The PRD’s accessibility criteria require that all stat buttons and quit flows be reachable via keyboard.
No hotkeys for stats – There is no way to select stats using number keys 1–5, despite the statHotkeys feature flag listed in the PRD. This limits accessibility and speed for players with limited motor skills.
Visual and accessibility concerns
Lack of contrast and label attributes – Red buttons on dark backgrounds and small white text on colored cards may not meet the WCAG 4.5:1 contrast guideline required in the UX section. Interactive elements lack visible focus styles and aria-describedby descriptions. The scoreboard does not declare role="status" or aria‑live="polite" for screen readers, making announcements unreliable.
Touch target sizing – Stat buttons appear narrow; on smaller screens they may not meet the 44 px minimum touch target standard. Hover/click feedback is minimal, which could be problematic for younger players.
No sound or animation cues – Round results simply jump to the next round; there are no reveal or flip animations for cards, no highlight on winning stats and no optional audio cues. The PRD calls for hardware‑accelerated animations and optional sound effects to reinforce feedback.
Other functional issues
Missing debug/test features – There is no visible way to enable the enableTestMode or battleStateProgress flags described in the PRD. Without these, testers cannot easily inspect deterministic hooks or state progress.
No end‑of‑match modal – Even after reaching 5 points (first‑to‑five), the game did not display a modal summarizing the match or offer “Play Again” options. The PRD requires an end modal at the win target or after 25 rounds.
💡 Improvement opportunities
Implement the Mystery Card placeholder – Use a simple component that displays the “?” icon until a stat is chosen and animate the reveal within 400 ms. Include aria-label="Mystery opponent card" on the hidden card for accessibility.
Synchronize state machine events – Ensure that roundStarted, statSelected and roundResolved events fire exactly once per round and update the scoreboard accordingly. Maintain a single round index counter and increment it only after resolution.
Display outcome messages via snackbar – After a stat is selected, show “You picked: X – Win/Loss/Draw” in a snackbar and update the scoreboard’s data-outcome attribute. During the opponent’s artificial delay, show “Opponent is choosing…”.
Disable stat buttons after selection – Immediately lock out further selections once a button is clicked and visually indicate the chosen stat with a persistent highlight until the round resolves.
Improve keyboard support – Add proper tab order and focus styles to stat buttons, and implement optional number key hotkeys (1–5) for stats. Ensure that pressing “Space” or “Enter” activates a focused stat button.
Enhance visual feedback – Use CSS transitions to animate card flips and highlight winning stats. Add optional sound cues for round outcomes and scoreboard updates. Provide consistent color coding for player (blue) and opponent (red) and ensure contrast ratios meet WCAG guidelines.
Unique deck draws – Load 25 random cards per player at match start and remove used cards from the deck so each card is unique within a match. Provide a small visual indicator of remaining cards.
Accurate timers and drift handling – Ensure the 30‑second timer pauses when the tab is inactive and resume on return. If the timer drifts by more than 2 s, display “Waiting…” and restart the countdown.
Comprehensive end‑of‑match modal – When either player reaches the win target or after 25 rounds, display a modal with the final score, outcome, and buttons for replay or return to the main menu.
Expose debug/test flags – Provide a URL parameter or toggle to enable enableTestMode, battleStateProgress and skipRoundCooldown flags. This will help testers replicate deterministic sequences.
Accessibility improvements – Add aria-describedby on stat buttons for screen readers to announce stat names and descriptions. Mark the scoreboard container as role="status" with aria-live="polite" so screen readers announce updates automatically.
Responsive layout adjustments – Ensure cards and buttons scale on smaller devices. Increase button sizes to meet the 44 px minimum target and provide adequate spacing.
