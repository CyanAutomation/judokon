/**
 * Debug utilities shared by Playwright debug scripts.
 *
 * @pseudocode
 * - buildBaseUrl: read BASE_URL or compose from PORT, default 5000
 * - installSelectorGuard: wrap querySelector to surface non-string selector errors
 * - attachLoggers: attach console/pageerror/requestfailed handlers
 * - waitButtonsReady: wait for #stat-buttons and optional data readiness
 * - getStatButtons: collect stat button info
 * - tryClickStat: click a given stat button; optional DOM-dispatch fallback
 * - getBattleSnapshot: collect machine, store, UI, and recent log info
 * - takeScreenshot: capture a screenshot to the given path
 */

export function buildBaseUrl() {
  const port = process.env.PORT || 5000;
  return process.env.BASE_URL || `http://localhost:${port}`;
}

export async function installSelectorGuard(page) {
  await page.addInitScript({
    content: `(() => {
      try {
        const wrap = (orig, where) => function(sel) {
          try {
            if (typeof sel !== 'string') {
              try {
                window.__classicBattleQuerySelectorError = {
                  selector: sel,
                  where,
                  stack: (new Error()).stack
                };
              } catch {}
            }
          } catch {}
          return orig.call(this, sel);
        };
        if (Document && Document.prototype && Document.prototype.querySelector) {
          Document.prototype.querySelector = wrap(Document.prototype.querySelector, 'Document.querySelector');
        }
        if (Element && Element.prototype && Element.prototype.querySelector) {
          Element.prototype.querySelector = wrap(Element.prototype.querySelector, 'Element.querySelector');
        }
      } catch {}
    })();`
  });
}

export function attachLoggers(page, opts = {}) {
  const { withLocations = true, collect = false } = opts;
  const logs = collect ? [] : null;
  page.on("console", (m) => {
    const loc = withLocations && typeof m.location === "function" ? m.location() : null;
    const entry = {
      channel: "console",
      type: m.type(),
      text: m.text(),
      location: loc ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : ""
    };
    if (logs) logs.push(entry);

    console.log("PAGE LOG>", entry.type, entry.text, entry.location);
  });
  page.on("pageerror", (err) => {
    const entry = { channel: "pageerror", text: String(err) };
    if (logs) logs.push(entry);

    console.error("PAGE ERROR>", entry.text);
  });
  page.on("requestfailed", (req) => {
    const entry = { channel: "requestfailed", url: req.url(), failure: req.failure()?.errorText };
    if (logs) logs.push(entry);

    console.warn("REQ FAILED>", entry.url, entry.failure || "");
  });
  return logs;
}

export async function waitButtonsReady(page, { requireReadyFlag = false, timeout = 3000 } = {}) {
  await page.waitForSelector("#stat-buttons", { timeout });
  if (requireReadyFlag) {
    try {
      await page.waitForFunction(
        () => document.querySelector("#stat-buttons")?.dataset?.buttonsReady === "true",
        { timeout }
      );
    } catch {
      // proceed anyway; click attempts will detect disabled buttons
    }
  }
}

export async function getStatButtons(page) {
  return page
    .$$eval("#stat-buttons button", (els) =>
      els.map((b) => ({
        text: b.textContent || "",
        stat: b.dataset.stat || "",
        disabled: !!b.disabled,
        classes: b.className || "",
        tabIndex: b.tabIndex
      }))
    )
    .catch(() => []);
}

export async function tryClickStat(page, stat, { force = false, timeout = 1000 } = {}) {
  const selector = `#stat-buttons button[data-stat="${stat}"]`;
  try {
    await page.click(selector, { timeout });
    return { ok: true, method: "playwright" };
  } catch (err) {
    if (!force) return { ok: false, method: "playwright", error: String(err) };
    try {
      // Try a stronger fallback: use the element.click() method which triggers
      // the same activation behavior as user clicks in many frameworks. If that
      // fails, fall back to dispatching a MouseEvent. Return diagnostics from
      // the page to help understand why clicks may be intercepted.
      const res = await page.evaluate((sel) => {
        try {
          const el = document.querySelector(sel);
          if (!el) return { ok: false, reason: "no-element" };
          try {
            el.disabled = false;
          } catch {}
          try {
            el.classList.remove && el.classList.remove("disabled");
          } catch {}
          try {
            if (el.tabIndex === -1) el.tabIndex = 0;
          } catch {}

          const rect = el.getBoundingClientRect();
          const cx = Math.round(rect.left + rect.width / 2);
          const cy = Math.round(rect.top + rect.height / 2);
          const hit = document.elementFromPoint(cx, cy);
          const hitDesc = hit
            ? `${hit.tagName.toLowerCase()}#${hit.id || ""}.${hit.className || ""}`
            : null;
          const computed = window.getComputedStyle(el);
          // Attempt el.click first
          try {
            el.click();
            return {
              ok: true,
              reason: "el.click",
              diagnostics: {
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                center: { x: cx, y: cy },
                hit: hitDesc,
                pointerEvents: computed.pointerEvents
              }
            };
          } catch {
            // fall back to dispatching a MouseEvent
            try {
              el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
              return {
                ok: true,
                reason: "dispatched",
                diagnostics: {
                  rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                  center: { x: cx, y: cy },
                  hit: hitDesc,
                  pointerEvents: computed.pointerEvents
                }
              };
            } catch (e2) {
              return {
                ok: false,
                reason: String(e2),
                diagnostics: {
                  rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                  center: { x: cx, y: cy },
                  hit: hitDesc,
                  pointerEvents: computed.pointerEvents
                }
              };
            }
          }
        } catch (e) {
          return { ok: false, reason: String(e) };
        }
      }, selector);
      return { ok: !!res?.ok, method: "fallback", detail: res };
    } catch (e) {
      return { ok: false, method: "fallback", error: String(e) };
    }
  }
}

/*
 * Diagnostic helper: given a selector and (optional) coordinates, return
 * hit-test and style information to help understand why clicks may be
 * intercepted or not reaching the target.
 */
export async function getClickDiagnostics(page, selector) {
  return page
    .evaluate((sel) => {
      try {
        const el = document.querySelector(sel);
        if (!el) return { ok: false, reason: "no-element" };
        const rect = el.getBoundingClientRect();
        const cx = Math.round(rect.left + rect.width / 2);
        const cy = Math.round(rect.top + rect.height / 2);
        const hit = document.elementFromPoint(cx, cy);
        const hitDesc = hit
          ? `${hit.tagName.toLowerCase()}#${hit.id || ""}.${hit.className || ""}`
          : null;
        const computed = window.getComputedStyle(el);
        return {
          ok: true,
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          center: { x: cx, y: cy },
          hit: hitDesc,
          pointerEvents: computed.pointerEvents,
          visibility: computed.visibility,
          display: computed.display,
          opacity: computed.opacity
        };
      } catch (e) {
        return { ok: false, reason: String(e) };
      }
    }, selector)
    .catch((e) => ({ ok: false, reason: String(e) }));
}

export async function getBattleSnapshot(page) {
  return page.evaluate(() => {
    try {
      const byId = (id) => document.getElementById(id);
      const text = (id) => (byId(id) ? byId(id).textContent || "" : "");
      const machineTimerEl = byId("machine-timer");
      const progressItems = Array.from(
        document.querySelectorAll("#battle-state-progress > li")
      ).map((li) => li.textContent || "");
      const statButtons = Array.from(document.querySelectorAll("#stat-buttons button")).map(
        (b) => ({
          text: b.textContent || "",
          stat: b.dataset.stat || "",
          disabled: !!b.disabled,
          classes: b.className || ""
        })
      );
      const logArr = Array.isArray(window.__classicBattleStateLog)
        ? window.__classicBattleStateLog.slice(-20)
        : [];
      const active = document.activeElement;
      const activeDesc = active
        ? `${active.tagName.toLowerCase()}#${active.id || ""}.${active.className || ""}`
        : "";
      return {
        state: window.__classicBattleState || null,
        prev: window.__classicBattlePrevState || null,
        lastEvent: window.__classicBattleLastEvent || null,
        lastInterruptReason: window.__classicBattleLastInterruptReason || null,
        lastQuerySelectorError: window.__classicBattleQuerySelectorError || null,
        guardFiredAt: window.__guardFiredAt || null,
        guardOutcomeEvent: window.__guardOutcomeEvent || null,
        roundDebug: window.__roundDebug || null,
        machineTimer: machineTimerEl
          ? { remaining: machineTimerEl.dataset.remaining, paused: machineTimerEl.dataset.paused }
          : null,
        machineStateEl: text("machine-state"),
        roundResult: text("round-result"),
        roundCounter: text("round-counter"),
        roundMessage: text("round-message"),
        scoreboard: text("score-display"),
        progressCount: progressItems.length,
        progressItems,
        statButtons,
        store: window.battleStore
          ? {
              selectionMade: !!window.battleStore.selectionMade,
              playerChoice: window.battleStore.playerChoice || null
            }
          : null,
        machineLog: logArr,
        activeElement: activeDesc
      };
    } catch (e) {
      return { error: String(e) };
    }
  });
}

export async function takeScreenshot(page, path) {
  try {
    await page.screenshot({ path, fullPage: true });

    console.log("screenshot saved:", path);
  } catch (e) {
    console.warn("screenshot failed:", String(e));
  }
}
