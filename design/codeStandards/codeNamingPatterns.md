# Function Naming Patterns

Modules should group helpers by concern. Consistent prefixes make intent clear across the codebase.

## createX

Use `create` for factory functions that return DOM nodes. Modal factories and similar utilities that return `{ element, open, close }` also follow this pattern.

## setupY

Use `setup` for functions that attach event listeners or initialize page behavior.

## isZ

Use `is` for predicate helpers that return a boolean.
