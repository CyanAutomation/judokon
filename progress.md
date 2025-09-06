playwright/battle-next-skip.spec.js:27:3

The test fails because the non-orchestrated startCooldown is called, but I can't find the source. I've confirmed
  handleStatSelection isn't the culprit. The battle-next-readiness.spec.js test passes, but it doesn't use
  autostart=1. The failing test does, and roundSelectModal.js handles it by immediately calling startCallback, which
  creates the controller.