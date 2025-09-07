# Product Requirements Document Reader

The PRD reader lists available specifications in a sidebar and renders
documents into the main content area. Keyboard arrows, swipe gestures and
explicit navigation buttons move between documents while preserving the URL and
browser history.

History updates are managed by `src/helpers/prdReader/history.js` which provides
helpers to push or replace state and to react to `popstate` events.
