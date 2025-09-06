const handlers = {};

export function registerBattleHandlers(h) {
  Object.assign(handlers, h);
}

export const handleGlobalKey = (key) => handlers.handleGlobalKey(key);
export const handleWaitingForPlayerActionKey = (key) =>
  handlers.handleWaitingForPlayerActionKey(key);
export const handleRoundOverKey = (key) => handlers.handleRoundOverKey(key);
export const handleCooldownKey = (key) => handlers.handleCooldownKey(key);
export const handleStatListArrowKey = (key) => handlers.handleStatListArrowKey(key);
