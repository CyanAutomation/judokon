import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { withMutedConsole } from "../utils/console.js";

describe("Classic Battle UI Event Binding", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
  });

  afterEach(() => {
    // Clear the custom handler property from stat-buttons container
    try {
      const container = document.getElementById("stat-buttons");
      if (container) {
        delete container.__classicBattleStatHandler;
      }
    } catch {}
    
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should call selectStat with the correct stat when a stat button is clicked", async () => {
    const { initStatButtons } = await import("../../src/helpers/classicBattle/uiHelpers.js");

    const container = document.getElementById("stat-buttons");
    const firstButton = container.querySelector("button[data-stat]");
    
    expect(container).toBeDefined();
    expect(firstButton).toBeDefined();
    expect(firstButton.dataset.stat).toBeDefined();

    // Create a mock store for testing
    const mockStore = {};

    // Initialize stat buttons (this registers the event handler)
    const statButtonControls = initStatButtons(mockStore);
    expect(statButtonControls).toBeDefined();

    // Verify the handler was registered by checking the custom property
    expect(container.__classicBattleStatHandler).toBeDefined();

    // Now test that clicking the button triggers the handler
    const stat = firstButton.dataset.stat;
    
    // Mock the card elements that selectStat and getStatValue look for
    // getStatValue looks for: container.querySelector(`li.stat:nth-child(${index}) span`)
    // where index is STATS.indexOf(stat) + 1
    
    // We need to find the index of the stat
    const STATS = ["power", "speed", "technique", "kumikata", "newaza"];
    const statIndex = STATS.indexOf(stat) + 1;
    
    const playerCard = document.createElement("div");
    playerCard.id = "player-card";
    const playerList = document.createElement("ul");
    playerList.innerHTML = `
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
    `;
    // Set the value for the specific stat
    playerList.children[statIndex - 1].querySelector("span").textContent = "5";
    playerCard.appendChild(playerList);
    document.body.appendChild(playerCard);
    
    const opponentCard = document.createElement("div");
    opponentCard.id = "opponent-card";
    const opponentList = document.createElement("ul");
    opponentList.innerHTML = `
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
      <li class="stat"><span>0</span></li>
    `;
    // Set the value for the specific stat
    opponentList.children[statIndex - 1].querySelector("span").textContent = "7";
    opponentCard.appendChild(opponentList);
    document.body.appendChild(opponentCard);
    
    // Dispatch a click event on the button
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    await withMutedConsole(async () => {
      firstButton.dispatchEvent(clickEvent);
      // Give the handler a moment to execute
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Verify that selectStat was called by checking if the button was marked as selected
    expect(firstButton.classList.contains("selected")).toBe(true);
  });
});






