/**
 * Lightweight event emitter used for internal messaging.
 *
 * @pseudocode
 * 1. Maintain a map of event type to handler sets.
 * 2. `on` adds handlers to a type set.
 * 3. `off` removes handlers.
 * 4. `emit` invokes handlers with provided detail.
 */
export class SimpleEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }

  off(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }

  emit(type, detail) {
    const handlers = Array.from(this.listeners.get(type) || []);
    for (const h of handlers) {
      try {
        h(detail);
      } catch (err) {
        console.error("Error in event handler for type '" + type + "':", err);
      }
    }
  }
}
