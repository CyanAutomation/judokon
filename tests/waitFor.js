export async function waitFor(predicate, { timeout = 500, interval = 10 } = {}) {
  const endTime = Date.now() + timeout;
  while (Date.now() < endTime) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("waitFor timeout");
}
