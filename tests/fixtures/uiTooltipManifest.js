/**
 * Manifest of UI tooltip requirements for new controls.
 * Each entry pairs the tooltip identifier with the UI surface or
 * specification document that introduced the control. Tests consume
 * this manifest so contributors update a single source of truth when
 * designs evolve.
 */
export const uiTooltipManifest = [
  {
    tooltipId: "ui.languageToggle",
    component: "Meditation quote language toggle",
    source: "src/pages/meditation.html"
  },
  {
    tooltipId: "ui.next",
    component: 'Classic battle "Next" control',
    source: "design/productRequirementsDocuments/prdBattleClassic.md"
  },
  {
    tooltipId: "ui.quitMatch",
    component: "Classic battle quit flow",
    source: "design/productRequirementsDocuments/prdBattleClassic.md"
  },
  {
    tooltipId: "ui.drawCard",
    component: "Random judoka draw button",
    source: "src/helpers/randomJudokaPage.js"
  },
  {
    tooltipId: "card.flag",
    component: "Judoka card flag badge",
    source: "src/helpers/cardTopBar.js"
  },
  {
    tooltipId: "ui.roundQuick",
    component: "Round length selector (5-point quick match)",
    source: "design/productRequirementsDocuments/prdGameModes.md"
  },
  {
    tooltipId: "ui.roundMedium",
    component: "Round length selector (10-point medium match)",
    source: "design/productRequirementsDocuments/prdGameModes.md"
  },
  {
    tooltipId: "ui.roundLong",
    component: "Round length selector (15-point long match)",
    source: "design/productRequirementsDocuments/prdGameModes.md"
  },
  {
    tooltipId: "ui.toggleLayout",
    component: "Browse judoka layout toggle",
    source: "src/pages/browseJudoka.html"
  }
];
