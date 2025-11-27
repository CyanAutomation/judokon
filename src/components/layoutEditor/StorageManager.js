/**
 * StorageManager - localStorage draft persistence.
 *
 * @summary Manages saving and restoring layout drafts from localStorage.
 * Stores drafts per layout mode with metadata.
 *
 * @pseudocode
 * 1. Generate storage key from layout mode.
 * 2. Save draft with timestamp and version metadata.
 * 3. Restore draft from localStorage if available and valid.
 * 4. Handle quota exceeded and corrupted data gracefully.
 */

const STORAGE_PREFIX = "judokon_layout_draft_";
const VERSION = 1;

export class StorageManager {
  saveDraft(layout, mode = "default") {
    if (!layout) return;

    try {
      const draft = {
        version: VERSION,
        timestamp: Date.now(),
        mode,
        data: layout
      };

      const key = this.getStorageKey(mode);
      localStorage.setItem(key, JSON.stringify(draft));
    } catch (err) {
      if (err.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded; draft not saved");
      } else {
        console.warn("Failed to save draft:", err.message);
      }
    }
  }

  restoreDraft(mode = "default") {
    try {
      const key = this.getStorageKey(mode);
      const stored = localStorage.getItem(key);

      if (!stored) return null;

      const draft = JSON.parse(stored);

      // Version check
      if (draft.version !== VERSION) {
        console.warn("Draft version mismatch; ignoring");
        return null;
      }

      return draft.data;
    } catch (err) {
      console.warn("Failed to restore draft:", err.message);
      return null;
    }
  }

  clearDraft(mode = "default") {
    try {
      const key = this.getStorageKey(mode);
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("Failed to clear draft:", err.message);
    }
  }

  getStorageKey(mode) {
    return `${STORAGE_PREFIX}${mode}`;
  }
}
