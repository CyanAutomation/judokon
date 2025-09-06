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
