// walkyNav.js — TV-style spatial navigation for the Spotify desktop client
// Walky project — prototype v0.3.2 (waits for Spotify's history to be ready)
//
// Keys:
//   Arrows     -> move focus to the nearest element in that direction
//   Enter      -> activate (click; double-click on a tracklist row = play)
//   Backspace  -> previous page (outside text fields) — on Walky: KEY_BACK ("BrowserBack")
//   Escape     -> left to Spotify (closes menus / dialogs)
//   F9         -> toggle walkyNav (to compare with native behavior)
//
// Debug in the DevTools console (Ctrl+Shift+I): window.walkyNav

(function walkyNav() {
  // At startup, Spicetify.Platform exists before its navigation history:
  // wait for both (otherwise the startup check crashes on its first line).
  if (!window.Spicetify || !Spicetify.Platform || !Spicetify.Platform.History || !document.body) {
    setTimeout(walkyNav, 300);
    return;
  }

  // ---------------------------------------------------------------- config
  const FOCUSABLE = [
    "button",
    "a[href]",
    "input",
    "textarea",
    '[role="button"]',
    '[role="link"]',
    '[role="row"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemradio"]',
    '[role="menuitemcheckbox"]',
    '[role="option"]',
    '[role="treeitem"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  // Containers treated as ONE item: their inner buttons are ignored
  // (one tracklist row = 1 item, Enter = play).
  const ITEM_CONTAINERS = '[role="row"]';

  // Weight of the perpendicular offset in the score (higher = prefers staying aligned)
  const ALIGN_WEIGHT = 3;

  let enabled = true;
  let current = null;
  let lastRect = null;

  // Walktify handles its own navigation: walkyNav steps aside on its page
  function inWalktify() {
    const h = Spicetify.Platform && Spicetify.Platform.History;
    const path = (h && h.location && h.location.pathname) || "";
    return path.startsWith("/walktify");
  }

  // ---------------------------------------------------------------- focus ring
  // Separate div rather than a CSS class on the element: React rewrites Spotify's
  // className on every re-render and would make the ring disappear.
  const ring = document.createElement("div");
  ring.id = "walky-focus-ring";
  Object.assign(ring.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    border: "3px solid #1ed760",
    borderRadius: "6px",
    boxShadow: "0 0 0 2px rgba(0,0,0,.6)",
    transition: "all 80ms ease-out",
    display: "none",
  });
  document.body.appendChild(ring);

  function drawRing() {
    if (!enabled || inWalktify() || !current || !current.isConnected) {
      ring.style.display = "none";
      return;
    }
    const r = current.getBoundingClientRect();
    lastRect = r;
    Object.assign(ring.style, {
      display: "block",
      left: `${r.left - 3}px`,
      top: `${r.top - 3}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
  }
  // No permanent rAF loop (battery usage): redraw on events.
  window.addEventListener("scroll", drawRing, true);
  window.addEventListener("resize", drawRing);

  // Safety net for layout changes: a 500 ms timer,
  // active ONLY on native pages (useless in Walktify, which has its own navigation).
  // Avoids waking the CPU twice a second for nothing.
  let ringTimer = null;
  function syncRingTimer() {
    const needed = enabled && !inWalktify();
    if (needed && !ringTimer) ringTimer = setInterval(drawRing, 500);
    if (!needed && ringTimer) {
      clearInterval(ringTimer);
      ringTimer = null;
    }
  }
  const hist = Spicetify.Platform.History;
  if (hist && typeof hist.listen === "function") hist.listen(() => setTimeout(syncRingTimer, 60));
  syncRingTimer();

  // ---------------------------------------------------------------- candidate elements
  function isUsable(el) {
    if (el.disabled || el.closest('[aria-hidden="true"]')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") return false;
    // Actually visible (not covered by a menu / modal)?
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) return false;
    return true;
  }

  function getFocusables() {
    return [...document.querySelectorAll(FOCUSABLE)].filter((el) => {
      const container = el.closest(ITEM_CONTAINERS);
      if (container && container !== el) return false; // inner button of a row
      return isUsable(el);
    });
  }

  // ---------------------------------------------------------------- spatial navigation
  // distance between two intervals [a1,a2] and [b1,b2] (0 if they overlap)
  function gap(a1, a2, b1, b2) {
    return Math.max(0, b1 - a2, a1 - b2);
  }

  function findNext(dir, from) {
    const r = from.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const vertical = dir === "up" || dir === "down";
    let best = null;
    let bestScore = Infinity;

    for (const el of getFocusables()) {
      if (el === from || from.contains(el) || el.contains(from)) continue;
      const c = el.getBoundingClientRect();
      const ccx = c.left + c.width / 2;
      const ccy = c.top + c.height / 2;
      let primary;

      if (dir === "down") {
        if (ccy <= cy) continue;
        primary = c.top - r.bottom;
      } else if (dir === "up") {
        if (ccy >= cy) continue;
        primary = r.top - c.bottom;
      } else if (dir === "right") {
        if (ccx <= cx) continue;
        primary = c.left - r.right;
      } else {
        if (ccx >= cx) continue;
        primary = r.left - c.right;
      }
      const secondary = vertical
        ? gap(r.left, r.right, c.left, c.right)
        : gap(r.top, r.bottom, c.top, c.bottom);

      // Too much overlap on the main axis = not "in the direction"
      const size = vertical ? Math.min(r.height, c.height) : Math.min(r.width, c.width);
      if (primary < -size / 2) continue;

      const score = Math.max(primary, 0) + secondary * ALIGN_WEIGHT;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function scrollContainerOf(el) {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight + 1) return p;
    }
    return null;
  }

  function setCurrent(el) {
    current = el;
    try {
      el.focus({ preventScroll: true });
    } catch (_) { }
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    drawRing();
  }

  // If the current element is gone (page change, re-render), pick
  // the visible element closest to the old position.
  // Returns true if focus was just (re)placed: this keypress doesn't move.
  function ensureCurrent() {
    if (current && current.isConnected && isUsable(current)) return false;
    const list = getFocusables();
    if (!list.length) return true;
    const ref = lastRect || { left: 0, top: 0, width: 0, height: 0 };
    const rx = ref.left + ref.width / 2;
    const ry = ref.top + ref.height / 2;
    let best = list[0];
    let bestD = Infinity;
    for (const el of list) {
      const c = el.getBoundingClientRect();
      const d = Math.hypot(c.left + c.width / 2 - rx, c.top + c.height / 2 - ry);
      if (d < bestD) {
        bestD = d;
        best = el;
      }
    }
    setCurrent(best);
    return true;
  }

  function move(dir, allowScrollRetry = true) {
    if (ensureCurrent()) return;
    const next = findNext(dir, current);
    if (next) {
      setCurrent(next);
      return;
    }
    // Nothing visible in that direction: Spotify lists are virtualized,
    // the next rows aren't in the DOM yet -> scroll then retry.
    if (allowScrollRetry && (dir === "down" || dir === "up")) {
      const sc = scrollContainerOf(current);
      if (sc) {
        sc.scrollBy({ top: (dir === "down" ? 1 : -1) * sc.clientHeight * 0.6 });
        setTimeout(() => move(dir, false), 120);
      }
    }
  }

  // ---------------------------------------------------------------- actions
  function activate(el) {
    if (el.matches("input, textarea")) {
      el.focus();
      return;
    }
    if (el.getAttribute("role") === "row") {
      // In a tracklist, single click selects, double click plays
      el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window }));
      return;
    }
    el.click();
  }

  function goBack() {
    const h = Spicetify.Platform && Spicetify.Platform.History;
    if (h && typeof h.goBack === "function") h.goBack();
    else history.back();
  }

  // ---------------------------------------------------------------- keyboard
  const DIRS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };

  function isTyping() {
    const ae = document.activeElement;
    return !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable);
  }

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  // Capture phase: run before Spotify's handlers
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "F9") {
        stop(e);
        enabled = !enabled;
        drawRing();
        syncRingTimer();
        Spicetify.showNotification && Spicetify.showNotification(`walkyNav ${enabled ? "ON" : "OFF"}`);
        return;
      }
      if (!enabled || inWalktify() || e.ctrlKey || e.altKey || e.metaKey) return; // native shortcuts untouched
      const typing = isTyping();

      if (DIRS[e.key]) {
        // In a text field, left/right move the text cursor
        if (typing && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
        stop(e);
        move(DIRS[e.key]);
        return;
      }
      if (e.key === "Enter" && !typing) {
        stop(e);
        if (!ensureCurrent() && current) activate(current);
        return;
      }
      if (e.key === "BrowserBack" || (e.key === "Backspace" && !typing)) {
        stop(e);
        goBack();
      }
    },
    true
  );

  // ---------------------------------------------------------------- debug
  window.walkyNav = {
    get current() {
      return current;
    },
    focusables: getFocusables,
    move,
    activate: () => current && activate(current),
    back: goBack,
  };

  // ---------------------------------------------------------------- start on Walktify
  // Spotify sometimes reopens its last page or home at launch. Two checks:
  //  1. at startup, keep trying until Walktify is actually shown (the
  //     /walktify page AND the mounted UI, flagged by the "wk-on" class), 20 s max;
  //  2. afterwards, any landing on the native home ("/") redirects to Walktify.
  // To disable (development): window.walktifyLock = false in the console.
  const WALKTIFY = "/walktify";
  const hist2 = () => Spicetify.Platform && Spicetify.Platform.History;
  const currentPath = () => {
    const h = hist2();
    return (h && h.location && h.location.pathname) || "";
  };
  const mounted = () => document.body.classList.contains("wk-on");
  const bootStart = Date.now();
  let booting = true;
  let okChecks = 0;
  let notMountedSince = null;

  function goWalktify(reason) {
    console.log(`[walkyNav] ouverture de Walktify (${reason}, page actuelle : "${currentPath() || "?"}")`);
    const h = hist2();
    if (!h) return;
    if (typeof h.replace === "function") h.replace(WALKTIFY);
    else h.push(WALKTIFY);
  }

  function checkWalktify(reason) {
    if (window.walktifyLock === false) return;
    const path = currentPath();
    const onWalktify = path.startsWith(WALKTIFY);

    if (booting) {
      if (!onWalktify) {
        okChecks = 0;
        goWalktify(reason);
      } else if (!mounted()) {
        // Right URL but UI missing (page loaded too early): reload the route
        notMountedSince = notMountedSince || Date.now();
        if (Date.now() - notMountedSince > 3000) {
          console.warn("[walkyNav] Walktify pas affiché malgré la bonne adresse : nouvelle tentative");
          notMountedSince = null;
          hist2() && hist2().push("/");
          setTimeout(() => goWalktify("nouvelle tentative"), 300);
        }
      } else if (++okChecks >= 4) {
        booting = false; // shown and stable for 2 s: startup confirmed
        console.log(`[walkyNav] Walktify affiché (démarrage validé en ${Date.now() - bootStart} ms)`);
      }
      if (Date.now() - bootStart > 20000 && booting) {
        booting = false;
        console.warn("[walkyNav] démarrage : Walktify non confirmé après 20 s");
      }
      return;
    }
    // After startup: only the native home is redirected (Settings stay reachable)
    if (path === "/" || path === "") goWalktify(reason);
  }

  // Any error is logged without stopping the watcher
  const safeCheck = (reason) => {
    try {
      checkWalktify(reason);
    } catch (e) {
      console.warn(`[walkyNav] vérification (${reason}) impossible :`, e);
    }
  };
  safeCheck("démarrage");
  const bootTimer = setInterval(() => {
    safeCheck("vérification");
    if (!booting) clearInterval(bootTimer);
  }, 500);
  const h0 = hist2();
  if (h0 && typeof h0.listen === "function") h0.listen(() => setTimeout(() => safeCheck("navigation"), 50));

  console.log("[walkyNav] chargé");
})();