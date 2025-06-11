# Data Schema Validation

This project stores gameplay data in JSON files under `src/data`. Each file has a matching JSON Schema in `src/schemas` describing its structure. These schemas serve as a contract for helper functions and allow automatic validation.

## Running Validation

Use the [Ajv](https://ajv.js.org/) CLI (installed globally or via `npx`) to validate data files:

```bash
npx ajv validate -s src/schemas/judoka.schema.json -d src/data/judoka.json
```

Run the command for every pair of schema and data file (e.g. `gameModes`, `weightCategories`). The CLI reports any mismatches so they can be fixed before runtime.

## Updating Schemas

When adding new fields to a data file:

1. Update the corresponding schema in `src/schemas` with the new property and type.
2. Include the property in the `required` list if it is mandatory.
3. Revalidate all affected JSON files.
4. Update tests or helper functions to work with the new field.

Keeping schemas in sync ensures data integrity and prevents unexpected errors.
