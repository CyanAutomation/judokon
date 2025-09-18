# UI Tooltip Manifest

The Vitest coverage in [`tests/data/tooltipsEntries.test.js`](../../tests/data/tooltipsEntries.test.js) imports [`uiTooltipManifest`](../../tests/fixtures/uiTooltipManifest.js) to verify that every required control ships with localized tooltip copy. This document records the canonical source for each tooltip identifier so that designers and engineers update a single manifest when features move or rename their controls.

| Tooltip key         | UI surface                                    | Spec source                                                                                                                |
| ------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ui.languageToggle` | Meditation quote language toggle              | [`src/pages/meditation.html`](../../src/pages/meditation.html)                                                             |
| `ui.next`           | Classic Battle “Next” control                 | [`design/productRequirementsDocuments/prdBattleClassic.md`](../../design/productRequirementsDocuments/prdBattleClassic.md) |
| `ui.quitMatch`      | Classic Battle quit confirmation flow         | [`design/productRequirementsDocuments/prdBattleClassic.md`](../../design/productRequirementsDocuments/prdBattleClassic.md) |
| `ui.drawCard`       | Random Judoka draw button                     | [`src/helpers/randomJudokaPage.js`](../../src/helpers/randomJudokaPage.js)                                                 |
| `card.flag`         | Judoka card flag badge                        | [`src/helpers/cardTopBar.js`](../../src/helpers/cardTopBar.js)                                                             |
| `ui.roundQuick`     | Round length selector (5-point quick match)   | [`design/productRequirementsDocuments/prdGameModes.md`](../../design/productRequirementsDocuments/prdGameModes.md)         |
| `ui.roundMedium`    | Round length selector (10-point medium match) | [`design/productRequirementsDocuments/prdGameModes.md`](../../design/productRequirementsDocuments/prdGameModes.md)         |
| `ui.roundLong`      | Round length selector (15-point long match)   | [`design/productRequirementsDocuments/prdGameModes.md`](../../design/productRequirementsDocuments/prdGameModes.md)         |
| `ui.toggleLayout`   | Browse Judoka layout toggle                   | [`src/pages/browseJudoka.html`](../../src/pages/browseJudoka.html)                                                         |

When adding or renaming tooltips for UI controls:

1. Update the originating feature (HTML, helper, or PRD).
2. Amend [`tests/fixtures/uiTooltipManifest.js`](../../tests/fixtures/uiTooltipManifest.js) with the new identifier and spec pointer.
3. Run `vitest` to ensure [`tests/data/tooltipsEntries.test.js`](../../tests/data/tooltipsEntries.test.js) reflects the updated manifest.

Keeping the manifest and this table synchronized ensures tooltip coverage follows the product spec without scattering hard-coded expectations throughout the suite.
