const STORAGE_KEY = "settings.collapsibleSections";
const DEFAULT_OPEN_IDS = ["display", "general"];

let cachedState;

function canUseStorage() {
  try {
    const { localStorage } = window;
    if (!localStorage) return false;
    const probe = "__settings_sections_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readState() {
  if (cachedState) {
    return { ...cachedState };
  }
  if (!canUseStorage()) {
    cachedState = {};
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cachedState = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    cachedState = {};
  }
  return { ...cachedState };
}

function writeState(state) {
  cachedState = { ...state };
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
  } catch {
    // no-op: storage quota or availability issues should not break UI
  }
}

function getSectionElements() {
  return Array.from(document.querySelectorAll("#settings-form details.settings-section"));
}

function getSectionId(details, index) {
  const id = details.dataset.sectionId;
  if (id && id.trim().length > 0) {
    return id;
  }
  return `section-${index}`;
}

function updateSummaryState(details, isOpen) {
  const summary = details.querySelector("summary");
  if (!summary) return;
  summary.setAttribute("aria-expanded", String(isOpen));
  summary.setAttribute("data-collapsible-state", isOpen ? "expanded" : "collapsed");
}

function setSectionOpen(details, isOpen, { persist = true, stateMap } = {}) {
  const sections = getSectionElements();
  const index = sections.indexOf(details);
  const sectionId = getSectionId(details, index);

  details.open = isOpen;
  details.classList.toggle("settings-section--open", isOpen);
  updateSummaryState(details, isOpen);

  const state = stateMap ?? readState();
  if (persist !== false) {
    state[sectionId] = isOpen;
    writeState(state);
  } else if (stateMap) {
    stateMap[sectionId] = isOpen;
  }
}

function applyInitialState(sections) {
  const state = readState();
  let hasChanges = false;

  sections.forEach((details, index) => {
    const sectionId = getSectionId(details, index);
    if (!Object.prototype.hasOwnProperty.call(state, sectionId)) {
      state[sectionId] = DEFAULT_OPEN_IDS.includes(sectionId);
      hasChanges = true;
    }
    setSectionOpen(details, Boolean(state[sectionId]), { persist: false, stateMap: state });
  });

  if (hasChanges) {
    writeState(state);
  }
}

function bindToggleHandlers(sections) {
  sections.forEach((details, index) => {
    if (details.dataset.collapsibleBound === "true") {
      return;
    }
    details.dataset.collapsibleBound = "true";
    details.addEventListener("toggle", () => {
      const sectionId = getSectionId(details, index);
      const state = readState();
      state[sectionId] = details.open;
      writeState(state);
      updateSummaryState(details, details.open);
      details.classList.toggle("settings-section--open", details.open);
    });
    updateSummaryState(details, details.open);
    details.classList.toggle("settings-section--open", details.open);
  });
}

export function setupCollapsibleSections() {
  if (typeof document === "undefined") return;
  const sections = getSectionElements();
  if (sections.length === 0) return;
  applyInitialState(sections);
  bindToggleHandlers(sections);
}

export function expandAllSections() {
  if (typeof document === "undefined") return;
  const sections = getSectionElements();
  if (sections.length === 0) return;
  const state = readState();
  sections.forEach((details, index) => {
    const sectionId = getSectionId(details, index);
    state[sectionId] = true;
    setSectionOpen(details, true, { persist: false, stateMap: state });
  });
  writeState(state);
}

export function ensureSectionOpen(sectionId) {
  if (typeof document === "undefined" || !sectionId) return;
  const sections = getSectionElements();
  const target = sections.find((details, index) => getSectionId(details, index) === sectionId);
  if (!target) return;
  if (!target.open) {
    setSectionOpen(target, true);
  }
}

export const SETTINGS_SECTIONS_STORAGE_KEY = STORAGE_KEY;
