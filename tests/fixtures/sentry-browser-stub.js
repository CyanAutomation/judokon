export function captureException() {}
export function configureScope() {}
export function withScope(callback) {
  try {
    if (typeof callback === "function") {
      callback({
        setTag() {},
        setContext() {},
        setExtra() {}
      });
    }
  } catch {}
}
export function addBreadcrumb() {}
export function init() {}

export default {
  captureException,
  configureScope,
  withScope,
  addBreadcrumb,
  init
};
