# ADR 0005: Card Section Registry

## Status

Accepted

## Context

`generateJudokaCardHTML` appended card sections one-by-one, duplicating logic and making future section ordering changes error-prone.

## Decision

Introduced a data-driven registry in `cardSections.js`. Each entry builds a card section, and `generateJudokaCardHTML` iterates over the registry to append sections. The inspector panel was extracted to `src/helpers/inspector/` for clearer ownership.

## Consequences

- Section order and composition can be adjusted by editing the registry.
- Card assembly logic is simplified and easier to extend.
- Inspector utilities are isolated, improving reuse.
