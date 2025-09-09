# Round Selection Flow

The Classic Battle page begins by asking players how many points are
required to win a match. The round-selection modal displays predefined
options and persists the choice for future sessions.

1. When the page loads, `initRoundSelectModal` checks for an
   `?autostart=1` query or a previously saved selection. If found, the
   match starts immediately.
2. Otherwise, a modal presents round options. Choosing an option stores
   the selection, logs telemetry, and begins the match.
3. If the modal fails to load, the page logs the error and shows a
   fallback **Start Match** button so the game can continue with default
   settings.
