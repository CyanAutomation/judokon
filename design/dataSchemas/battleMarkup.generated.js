// Generated mapping from battleMarkup.json
export default {
  version: "1.0.0",
  generatedAt: "2025-09-20T00:00:00Z",
  entries: [
    {
      logicalName: "roundMessage",
      selector: "#round-message",
      dataTestId: "battle:round-message",
      role: "status",
      description: "Message shown for round prompts and results.",
      owner: "frontend-team",
      stability: "stable",
      aliases: []
    },
    {
      logicalName: "snackbarContainer",
      selector: "#snackbar-container",
      dataTestId: "ui:snackbar",
      role: "status",
      description: "Global transient messages (hints, countdown).",
      owner: "frontend-team",
      stability: "stable",
      aliases: []
    },
    {
      logicalName: "battleStateBadge",
      selector: "#battle-state-badge",
      dataTestId: "battle:state-badge",
      role: "status",
      description: "Compact badge showing the current battle state (e.g., selecting, resolving).",
      owner: "frontend-team",
      stability: "stable",
      aliases: []
    },
    {
      logicalName: "playerCard",
      selector: ".player-card[data-player]",
      dataTestId: "battle:player-card",
      role: "group",
      description:
        "Root element for a player's card. Has attribute data-player with values 0 or 1.",
      owner: "frontend-team",
      stability: "stable",
      aliases: []
    },
    {
      logicalName: "statButton",
      selector: ".stat-button[data-stat][data-player]",
      dataTestId: "battle:stat-button",
      role: "button",
      description:
        "Interactive stat button. Attributes: data-stat (strength|speed|tech) and data-player.",
      owner: "frontend-team",
      stability: "stable",
      aliases: ["button.stat-action"]
    },
    {
      logicalName: "selectStatButton",
      selector: "button[data-action=select-stat]",
      dataTestId: "battle:select-stat",
      role: "button",
      description: "Primary control used to confirm a selected stat (if present in UI variants).",
      owner: "frontend-team",
      stability: "experimental",
      aliases: []
    },
    {
      logicalName: "autoSelectIndicator",
      selector: ".auto-select-indicator",
      dataTestId: "battle:auto-select",
      role: "status",
      description: "Visual indicator shown when the system auto-selects a stat.",
      owner: "frontend-team",
      stability: "stable",
      aliases: []
    },
    {
      logicalName: "modalRoot",
      selector: "#modal-root",
      dataTestId: "ui:modal-root",
      role: "dialog",
      description: "Root for modals used during battle (confirmations, results).",
      owner: "frontend-team",
      stability: "stable",
      aliases: []
    }
  ]
};
