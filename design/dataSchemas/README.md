# Data Schema Validation

This project stores gameplay data in JSON files under `src/data`. Each file has a matching JSON Schema in `src/schemas` describing its structure. These schemas serve as a contract for helper functions and allow automatic validation.

## Running Validation

Run `npm run validate:data` to check all schema and data pairs at once. The command executes `scripts/validateData.js`, which calls the Ajv CLI internally. If needed, you can validate a single pair manually using `npx ajv validate`:

```bash
npx ajv validate -s src/schemas/judoka.schema.json -d src/data/judoka.json
```

Run the command for every pair of schema and data file (e.g. `gameModes`, `weightCategories`). The CLI reports any mismatches so they can be fixed before runtime. A new schema, `navigationItems.schema.json`, validates the structure of `navigationItems.json` which drives navigation order and visibility. Another schema, `aesopsMeta.schema.json`, describes the quote metadata file used on the meditation screen. Tests also verify that each ID in `aesopsMeta.json` exists in `aesopsFables.json`.

## Updating Schemas

When adding new fields to a data file:

1. Update the corresponding schema in `src/schemas` with the new property and type.
2. Include the property in the `required` list if it is mandatory.
3. Revalidate all affected JSON files.
4. Update tests or helper functions to work with the new field.

Keeping schemas in sync ensures data integrity and prevents unexpected errors.

## Using `$id` and Shared Definitions

Every schema file should provide a unique `$id`. This allows other schemas to
reference it by URL rather than by relative path. Shared structures live in
[`src/schemas/commonDefinitions.schema.json`](../../src/schemas/commonDefinitions.schema.json).
Use `$ref` to pull in definitions from this file, e.g.:

```json
{ "$ref": "https://judokon.dev/schemas/commonDefinitions.schema.json#/definitions/Stats" }
```

## Field Constraints

If a property can take only a specific set of values, use `enum` or `pattern`
constraints to express that in the schema. This keeps data consistent and helps
with validation.
### Gokyo Technique Categories

The `category` field accepts `Nage-waza` or `Katame-waza`. The `subCategory` field must match one of the following:

- `Te-waza`
- `Koshi-waza`
- `Ashi-waza`
- `Ma-sutemi-waza`
- `Yoko-sutemi-waza`
- `Osae-komi-waza`
- `Shime-waza`
- `Kansetsu-waza`


## Consistent Key Casing

JSON keys should follow the same casing throughout the project. We recommend
using **camelCase** for all keys so data files match helper functions and tests.

## CountryCode and WeightClass Enums

Shared enums for ISO country codes and IJF weight classes live in
[`src/schemas/commonDefinitions.schema.json`](../../src/schemas/commonDefinitions.schema.json).
Other schema files reference these lists via `$ref` so they do not need to
repeat each value.

```json
{ "$ref": "https://judokon.dev/schemas/commonDefinitions.schema.json#/definitions/CountryCode" }
```

### Updating the enum lists

Edit the arrays under `CountryCode` and `WeightClass` in the shared schema to
add or remove values. You can update them manually or run a local script that
rebuilds the lists from the JSON data files. After changing the enums, run
`npm run validate:data` to ensure all data still passes validation.
