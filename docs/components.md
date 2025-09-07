# Components

## Carousel

`CarouselController` manages page-based carousels with keyboard, swipe, and resize support.

### Constructor

`new CarouselController(container, wrapper, { threshold = 50 })`

- `container`: element holding pages.
- `wrapper`: element receiving controls and markers.
- `threshold`: minimum swipe distance in pixels.

### Methods

- `next()` / `prev()` - navigate pages.
- `setPage(index)` - jump to a specific page.
- `update()` - refresh button states and markers.
- `destroy()` - remove listeners and DOM nodes.

## Scoreboard

`Scoreboard` manages round messages, timers, round counters, and match score.

### DOM creation

```js
import { createScoreboard, Scoreboard } from "../src/components/Scoreboard.js";

const container = createScoreboard();
document.body.appendChild(container);
```

### Usage

```js
const sb = new Scoreboard({
  messageEl: container.querySelector("#round-message"),
  timerEl: container.querySelector("#next-round-timer"),
  roundCounterEl: container.querySelector("#round-counter"),
  scoreEl: container.querySelector("#score-display")
});

sb.showMessage("Ready!");
sb.updateScore(1, 0);
```
