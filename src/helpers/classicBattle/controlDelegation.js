import { getDocumentRef } from "../documentHelper.js";

let delegatedRoot = null;
let delegatedContext = null;
let delegatedClickHandler = null;

function resolveActionTarget(event, root) {
  if (!(event?.target instanceof Element)) {
    return null;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget || !root.contains(actionTarget)) {
    return null;
  }

  const action = actionTarget.dataset?.action;
  if (!action) {
    return null;
  }

  return { actionTarget, action };
}

async function routeControlAction(event) {
  if (!delegatedRoot || !delegatedContext) {
    return;
  }

  const resolvedTarget = resolveActionTarget(event, delegatedRoot);
  if (!resolvedTarget) {
    return;
  }

  const { actionTarget, action } = resolvedTarget;
  switch (action) {
    case "next": {
      await delegatedContext.onNext?.(event, actionTarget);
      break;
    }
    case "replay": {
      await delegatedContext.onReplay?.(event, actionTarget);
      break;
    }
    case "quit": {
      await delegatedContext.onQuit?.(event, actionTarget);
      break;
    }
    default:
      break;
  }
}

/**
 * Bind Classic Battle control button delegation on a persistent root container.
 *
 * @param {HTMLElement | null} [root]
 * @param {{
 *   onNext?: (event: MouseEvent, actionTarget: Element) => Promise<void> | void,
 *   onReplay?: (event: MouseEvent, actionTarget: Element) => Promise<void> | void,
 *   onQuit?: (event: MouseEvent, actionTarget: Element) => Promise<void> | void
 * }} [context]
 * @returns {boolean}
 * @pseudocode
 * 1. Resolve the persistent battle root when no explicit root is supplied.
 * 2. Persist the latest action-routing callbacks for delegated handling.
 * 3. Reuse an existing listener when already bound to the same root.
 * 4. Remove stale listeners when switching roots to prevent duplicate routing.
 * 5. Register one delegated click listener that routes by `data-action`.
 */
export function bindControlDelegation(root, context = {}) {
  const doc = getDocumentRef();
  const resolvedRoot =
    root ??
    doc?.getElementById("battle-area") ??
    doc?.querySelector("main.battle-page") ??
    doc?.body ??
    null;

  if (!resolvedRoot) {
    return false;
  }

  delegatedContext = context;

  if (delegatedRoot === resolvedRoot && delegatedClickHandler) {
    return true;
  }

  if (delegatedRoot && delegatedClickHandler) {
    delegatedRoot.removeEventListener("click", delegatedClickHandler);
  }

  delegatedRoot = resolvedRoot;
  delegatedClickHandler = (event) => {
    void routeControlAction(event);
  };
  delegatedRoot.addEventListener("click", delegatedClickHandler);
  return true;
}

/**
 * Reset delegated control routing state for test isolation.
 *
 * @returns {void}
 * @pseudocode
 * 1. Remove the delegated click listener when currently bound.
 * 2. Clear root, context, and listener references.
 */
export function resetControlDelegationForTests() {
  if (delegatedRoot && delegatedClickHandler) {
    delegatedRoot.removeEventListener("click", delegatedClickHandler);
  }
  delegatedRoot = null;
  delegatedContext = null;
  delegatedClickHandler = null;
}
