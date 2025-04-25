;(function () {
  const e = document.createElement("link").relList
  if (e && e.supports && e.supports("modulepreload")) return
  for (const r of document.querySelectorAll('link[rel="modulepreload"]')) o(r)
  new MutationObserver((r) => {
    for (const n of r)
      if (n.type === "childList")
        for (const s of n.addedNodes) s.tagName === "LINK" && s.rel === "modulepreload" && o(s)
  }).observe(document, {childList: !0, subtree: !0})
  function a(r) {
    const n = {}
    return (
      r.integrity && (n.integrity = r.integrity),
      r.referrerPolicy && (n.referrerPolicy = r.referrerPolicy),
      r.crossOrigin === "use-credentials"
        ? (n.credentials = "include")
        : r.crossOrigin === "anonymous"
          ? (n.credentials = "omit")
          : (n.credentials = "same-origin"),
      n
    )
  }
  function o(r) {
    if (r.ep) return
    r.ep = !0
    const n = a(r)
    fetch(r.href, n)
  }
})()
const f = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}
function l(t) {
  return String(t).replace(/[&<>"']/g, (e) => f[e] || e)
}
function c(t, e = "Unknown") {
  return typeof t == "string"
    ? t.trim() || e
    : typeof t == "number" || typeof t == "boolean"
      ? t
      : typeof t == "object" || typeof t == "function" || typeof t == "symbol"
        ? e
        : (t ?? e)
}
function y(t, e = "en-GB") {
  if (typeof t != "string" || !t.trim()) return "Invalid Date"
  const a = new Date(t)
  return isNaN(a.getTime()) ? "Invalid Date" : a.toISOString().split("T")[0]
}
const g = [
  {
    country: "Portugal",
    code: "pt",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "France",
    code: "fr",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Japan",
    code: "jp",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Brazil",
    code: "br",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "United States",
    code: "us",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Germany",
    code: "de",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Russia",
    code: "ru",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "South Korea",
    code: "kr",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "United Kingdom",
    code: "gb",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Canada",
    code: "ca",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Italy",
    code: "it",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Spain",
    code: "es",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Netherlands",
    code: "nl",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "China",
    code: "cn",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
  {
    country: "Mongolia",
    code: "mn",
    lastUpdated: "2025-04-23T10:00:00Z",
    updatedBy: "user",
    active: !0,
  },
]
function m(t) {
  if (typeof t != "string" || !t.trim()) return "Unknown"
  const e = g.find((a) => a.code.toLowerCase() === t.toLowerCase() && a.active)
  return e ? e.country : "Unknown"
}
function v(t) {
  return !t || !g.some((e) => e.code.toLowerCase() === t.toLowerCase() && e.active)
    ? (console.warn("Missing or invalid country code. Using placeholder flag."),
      "/countryFlags/placeholder-flag.png")
    : `https://flagcdn.com/w320/${t.toLowerCase()}.png`
}
const d = "/countryFlags/placeholder-flag.png"
function h(t, e) {
  if (!t)
    return (
      console.error("Judoka object is missing!"),
      {title: "No data", flagUrl: d, html: '<div class="card-top-bar">No data available</div>'}
    )
  const a = l(c(t.firstname)),
    o = l(c(t.surname)),
    r = c(t.countryCode),
    n = m(r),
    s = e || d
  return {
    title: `${c(t.firstname)} ${c(t.surname)}`.trim(),
    flagUrl: s,
    html: `
      <div class="card-top-bar">
        <div class="card-name">
          <span class="firstname">${a}</span>
          <span class="surname">${o}</span>
        </div>
        <img class="card-flag" src="${s}" alt="${n} flag" 
          onerror="this.src='${d}'">
      </div>
    `,
  }
}
const p = "/judokaPortraits/judokaPortrait-0.png"
function U(t) {
  return `
    <div class="card-portrait">
      <img src="${t && t.id ? `/judokaPortraits/judokaPortrait-${t.id}.png` : p}" alt="${c(t == null ? void 0 : t.firstname, "Judoka")} ${c(t == null ? void 0 : t.surname, "")}'s portrait" onerror="this.src='${p}'">
    </div>
  `
}
function L(t) {
  if (!(t != null && t.stats)) return '<div class="card-stats">No stats available</div>'
  const {
    power: e = "?",
    speed: a = "?",
    technique: o = "?",
    kumikata: r = "?",
    newaza: n = "?",
  } = t.stats
  return `
    <div class="card-stats">
      <ul>
        <li class="stat"><strong>Power:</strong> <span>${e}</span></li>
        <li class="stat"><strong>Speed:</strong> <span>${a}</span></li>
        <li class="stat"><strong>Technique:</strong> <span>${o}</span></li>
        <li class="stat"><strong>Kumi-kata:</strong> <span>${r}</span></li>
        <li class="stat"><strong>Ne-waza:</strong> <span>${n}</span></li>
      </ul>
    </div>
  `
}
function T(t, e) {
  const a = t == null ? void 0 : t.signatureMoveId,
    o = Array.isArray(e) ? e.find((n) => n.id === a) : null
  return (
    o || console.warn(`No technique found for signatureMoveId: ${a}`),
    `
    <div class="card-signature">
      <span class="signature-move-label"><strong>Signature Move:</strong></span>
      <span class="signature-move-value">${(o == null ? void 0 : o.name) ?? "Unknown"}</span>
    </div>
  `
  )
}
function $(t) {
  return `<div class="card-updated">Last updated: ${l(t)}</div>`
}
function w(t, e) {
  const a = v(t.countryCode),
    o = y(t.lastUpdated)
  return `
    <div class="card-container">
      <div class="judoka-card">
        ${h(t, a).html}
        ${U(t)}
        ${L(t)}
        ${T(t, e)}
        ${$(o)}
      </div>
    </div>
  `
}
document.addEventListener("DOMContentLoaded", () => {
  const t = document.getElementById("startBtn"),
    e = document.getElementById("gameArea"),
    a = document.getElementById("loading")
  if (!t || !e || !a) {
    console.error("Required DOM elements are missing.")
    return
  }
  t.addEventListener("click", async () => {
    console.log("Start button clicked!"),
      t.classList.add("hidden"),
      (e.innerHTML = ""),
      a.classList.remove("hidden")
    try {
      const s = await o("data/judoka.json"),
        i = await o("data/gokyo.json")
      console.log("Judoka data fetched:", s), console.log("Gokyo data fetched:", i)
      const u = r(s)
      console.log("Selected judoka:", u), n(u, i)
    } catch (s) {
      console.error("Error loading card:", s),
        (e.innerHTML = "<p>⚠️ Failed to load card. Please try again later.</p>")
    } finally {
      a.classList.add("hidden"), e.classList.remove("hidden")
    }
  })
  async function o(s) {
    const i = await fetch(s)
    if (!i.ok) throw new Error(`HTTP error! status: ${i.status}`)
    return i.json()
  }
  function r(s) {
    const i = Math.floor(Math.random() * s.length)
    return console.log("Random index:", i), s[i]
  }
  function n(s, i) {
    console.log("Judoka passed to displayJudokaCard:", s), (e.innerHTML = w(s, i))
  }
})
