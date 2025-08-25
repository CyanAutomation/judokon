/**
 * Carousel helper barrel file.
 *
 * @pseudocode
 * 1. Re-export carousel submodules (scrolling, navigation, accessibility, layout).
 * 2. Keep consumers decoupled from internal file structure.
 */
export * from "./scroll.js";
export * from "./navigation.js";
export * from "./accessibility.js";
export * from "./responsive.js";
export * from "./cards.js";
export * from "./focus.js";
export * from "./structure.js";
