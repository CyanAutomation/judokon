# Classic Battle Helper Tests

This directory contains unit tests for Classic Battle helpers.

Interrupt behavior triggered by browser events (such as `pagehide`, global
`error`, or `unhandledrejection`) is covered exclusively in
`interruptHandlers.test.js`. Other test suites should not duplicate these
scenarios.
