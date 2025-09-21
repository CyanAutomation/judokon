/**
 * Custom ESLint rule to enforce canonical fake timers usage in tests.
 * Detects direct usage of vi.useFakeTimers() and suggests useCanonicalTimers() instead.
 */

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce use of canonical fake timers helper in tests",
      category: "Best Practices",
      recommended: true
    },
    fixable: null, // Could be made fixable in the future
    schema: [], // No options for now
    messages: {
      useCanonicalTimers:
        "Use 'useCanonicalTimers()' from '../setup/fakeTimers.js' instead of 'vi.useFakeTimers()' for consistent timer mocking in tests."
    }
  },

  create(context) {
    // Only apply to test files
    const filename = context.getFilename();
    if (!filename.includes(".test.js") && !filename.includes(".spec.js")) {
      return {};
    }

    return {
      CallExpression(node) {
        // Check for vi.useFakeTimers() calls
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "vi" &&
          node.callee.property.name === "useFakeTimers"
        ) {
          context.report({
            node,
            messageId: "useCanonicalTimers"
          });
        }
      }
    };
  }
};
