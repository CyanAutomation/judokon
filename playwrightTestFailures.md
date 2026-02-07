# Playwright Test Failures & Resolutions

**Last Updated**: January 6, 2026  
**Project**: JU-DO-KON! (JavaScript/Node.js)  
**Playwright Version**: @playwright/test v1.56.1  
**Test Framework**: @playwright/test (JavaScript)

This document tracks significant Playwright failures at a high level. Detailed root-cause and remediation history for the opponent snackbar delay incident is maintained in the canonical incident record:

- `docs/incidents/snackbar-opponent-delay-incident.md`

---

## ⚠️ Current Status

**Active Issues:**

- None currently

**Recently Resolved:**

- cooldown.spec.js (2 tests) - Next button finalization timing with autoContinue (January 1, 2026)
- opponent-reveal.spec.js - Selection flag race condition (December 31, 2025)

---

## Resolved Failures (Condensed)

| Failure                                                                               | Status      | Date Resolved | Canonical incident/details                           |
| ------------------------------------------------------------------------------------- | ----------- | ------------- | ---------------------------------------------------- |
| `playwright/battle-classic/opponent-reveal.spec.js` selection flag race condition     | 🟢 Resolved | 2025-12-31    | `docs/incidents/snackbar-opponent-delay-incident.md` |
| `playwright/battle-classic/cooldown.spec.js` deterministic cooldown expectation drift | 🟢 Resolved | 2026-01-01    | `docs/incidents/snackbar-opponent-delay-incident.md` |

---

## Notes

- Keep this file concise; avoid duplicating long root-cause narratives already captured in canonical incident records.
- Add new failures as table rows and link to a canonical incident file when one exists.
