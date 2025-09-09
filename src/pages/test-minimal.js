console.log("Minimal script loaded");

function initBadgeSync() {
  try {
    const overrideEnabled = typeof window !== "undefined" && 
      window.__FF_OVERRIDES && 
      window.__FF_OVERRIDES.battleStateBadge;
    
    console.log("initBadgeSync called", { overrideEnabled });
    
    const badge = document.getElementById("battle-state-badge");
    if (badge && overrideEnabled) {
      badge.hidden = false;
      badge.removeAttribute("hidden");
      badge.textContent = "Lobby";
      console.log("badge enabled", badge.hidden);
    }
  } catch (err) {
    console.log("sync badge init failed", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBadgeSync);
} else {
  initBadgeSync();
}