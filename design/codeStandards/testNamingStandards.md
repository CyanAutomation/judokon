# Test Naming Standards

Consistent naming makes the test suite easier to navigate. Follow these rules when adding or modifying tests:

- **File Names**: Use `featureOrComponent.test.js` so the file name directly reflects the area under test. Example: `matchControls.test.js` for button handlers in Classic Battle.
- **Describe Blocks**: Start the top-level `describe` string with the module or feature name, followed by the specific behavior being tested.
- **Test Messages**: Keep `it` descriptions short and explicit about the expected outcome.

Aligning file names with the `describe` block helps future contributors quickly locate relevant tests.
