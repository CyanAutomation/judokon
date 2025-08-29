import { onDomReady } from "../domReady.js";
import { waitForOpponentCard } from "../opponentCardWait.js";
import ClassicBattleController from "./controller.js";
import ClassicBattleView from "./view.js";
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted → showSelectionPrompt)
import "./roundUI.js";
import { onDomReady } from "../domReady.js";
import { waitForOpponentCard } from "../opponentCardWait.js";
import ClassicBattleController from "./controller.js";
import ClassicBattleView from "./view.js";
import "./promises.js";
// Ensure round UI event listeners are registered (roundStarted → showSelectionPrompt)
import "./roundUI.js";
import { createClassicBattleDebugAPI } from "./setupTestHelpers.js";
