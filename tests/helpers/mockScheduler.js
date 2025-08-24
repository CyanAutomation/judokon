export function createMockScheduler() {
  let now = 0;
  const tasks = [];
  function setTimeoutFn(cb, ms) {
    const id = Symbol();
    tasks.push({ id, time: now + ms, cb });
    tasks.sort((a, b) => a.time - b.time);
    return id;
  }
  function clearTimeoutFn(id) {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx !== -1) tasks.splice(idx, 1);
  }
  function tick(ms) {
    now += ms;
    tasks.sort((a, b) => a.time - b.time);
    while (tasks.length && tasks[0].time <= now) {
      const task = tasks.shift();
      try {
        task.cb();
      } catch {}
    }
  }
  return {
    setTimeout: setTimeoutFn,
    clearTimeout: clearTimeoutFn,
    tick
  };
}
