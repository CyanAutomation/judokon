# Item 5 Phase 0: Design & Constraints for Event Listener Testing Utilities

## Design Note: Event Listener Wiring Verification

### Problem Statement

Tests need to verify that event listeners are properly attached and invoked without relying on fragile implementation details like direct `addEventListener` spying.

### Constraints & Design Decisions

#### ✅ Acceptable Patterns

1. **Behavior-focused assertions**: Test that clicking a button triggers expected effects, not that `addEventListener` was called
2. **Spy injection via factories**: Component factories (Modal, Button, etc.) can expose observable hooks for testing
3. **Wrapper utilities**: Opt-in utilities that wrap `addEventListener` for specific test scenarios
4. **Event emitter testing**: Custom event targets with testable `addEventListener` methods

#### ❌ Fragile Anti-Patterns to Avoid

1. **Direct `addEventListener` spying**: `vi.spyOn(element, "addEventListener")` - tests implementation, not behavior
2. **Global monkey-patching**: Modifying `EventTarget.prototype.addEventListener` affects all code
3. **DOM inspection**: Checking internal listener arrays or properties

#### Proposed API Surface

```javascript
// For component factories (extends existing pattern)
const { element, onClick } = createButton({ text: "Click me" });
await onClick(); // Simulate click and verify effects

// For custom event listener testing (new utility)
const { withListenerSpy, expectListenerAttached } = await import("../helpers/listenerUtils.js");

// Spy on specific event types
await withListenerSpy(target, "click", (calls) => {
  // calls contains invocation records
  fireClickEvent();
  expect(calls).toHaveLength(1);
});

// Assert listener presence (best-effort)
expectListenerAttached(button, "click"); // May use wrapper if installed
```

#### Implementation Strategy

1. **Phase 1**: Create `tests/helpers/listenerUtils.js` with core utilities
2. **Phase 2**: Migrate flaky tests to use behavior-focused assertions
3. **Integration**: Work with component factories for comprehensive event testing

#### Risk Mitigation

- All utilities are opt-in; existing tests unaffected
- Focus on observable behavior over implementation details
- Clear migration path from fragile patterns to robust ones

### Acceptance Criteria

- Design note documents viable patterns and constraints
- Clear API proposal for Phase 1 implementation
- Path forward avoids fragile testing anti-patterns
