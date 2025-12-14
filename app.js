let LEX = null;

let ACTIVE_TAGS = new Set();   // tag filter (multi-select)
let POS_FILTER = "";           // pos filter (single-select)

let MODE = "search";           // "search" or "browse"
let BROWSE_LETTER = "";        // normalized first letter (a-z) or "" = all
let CURRENT_ENTRY = null;

let BY_NORM_HEADWORD = new Map(); // normalized headword -> entry

// display-only: normalize/label POS without changing JSON
const POS_LABELS = {
  n: "Noun",
  v: "Verb",
  adj: "Adjective",
  adv: "Adverb",
  pron: "Pronoun",
  prep: "Preposition",
  conj: "Conjunction",
  part: "Particle",
  num: "Number"
};

function posLabel(pos) {
  const p = (pos || "").trim();
  return POS_LABELS[p] || (p ? p.toUpperCase() : "?");
}

const el = (id) => document.getElementById(id);

function normalizeForSearch(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function firstGloss(e) {
  const g = e?.defs?.[0]?.gloss;
  return typeof g === "string" ? g : "";
}

function getEntryUrlHash(e) {
  // Use headword for URL (nice), but fall back to id.
  const hw = (e?.headword || "").trim();
  if (hw) return "#" + encodeURIComponent(hw);
  if (e?.id) return "#id:" + encodeURIComponent(e.id);
  return "";
}

function entryToSearchBlob(e) {
  const defs = (e.defs || []).map(d => (typeof d.gloss === "string" ? d.gloss : "")).join(" ");
  const notes = (e.defs || []).map(d => (typeof d.notes === "string" ? d.notes : "")).join(" ");
  const tags = (e.tags || []).join(" ");
  return normalizeForSearch([e.headword, e.id, e.pos, e.pron, defs, notes, tags].join(" "));
}

/** Tokenizes by Unicode letters; wraps known headwords with links. */
function linkifyText(text, currentEntry) {
  const s = (text ?? "").toString();
  if (!s) return "";

  // Split into word tokens + everything else
  // word = letters + combining marks + simple hyphen/apostrophe
  const re = /(\p{L}[\p{L}\p{M}'-]*)/gu;
  let out = "";
  let last = 0;

  for (const m of s.matchAll(re)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;

    out += escapeHtml(s.slice(last, start));

    const token = m[0];
    const norm = normalizeForSearch(token);

    const target = BY_NORM_HEADWORD.get(norm);
    const isSame = target && currentEntry && normalizeForSearch(target.headword) === normalizeForSearch(currentEntry.headword);

    if (target && !isSame) {
      const href = getEntryUrlHash(target);
      out += `<a class="xref" href="${href}">${escapeHtml(token)}</a>`;
    } else {
      out += escapeHtml(token);
    }

    last = end;
  }

  out += escapeHtml(s.slice(last));
  return out;
}

function setMode(nextMode, browseLetter = BROWSE_LETTER) {
  MODE = nextMode;
  BROWSE_LETTER = browseLetter;
  el("modeLabel").textContent = MODE === "browse"
    ? (BROWSE_LETTER ? `Browse: ${BROWSE_LETTER.toUpperCase()}` : "Browse: All")
    : "Search";
  renderAZ(LEX?.entries || []);
}

function buildHeadwordIndex(entries) {
  BY_NORM_HEADWORD = new Map();
  for (const e of (entries || [])) {
    const norm = normalizeForSearch(e.headword);
    if (!norm) continue;
    // first one wins if duplicates
    if (!BY_NORM_HEADWORD.has(norm)) BY_NORM_HEADWORD.set(norm, e);
  }
}

function renderAZ(entries) {
  const root = el("az");
  root.innerHTML = "";

  // Gramática Internacional alphabet (display order)
  const ALPHABET = ["a","b","c","ç","d","e","f","g","h","i","j","l","m","n","o","p","q","r","s","t","u","v","x","z"];

  // Determine which letters exist by *raw* first character (so "ç" works)
  const present = new Set();
  for (const e of entries || []) {
    const hw = (e.headword || "").trim();
    if (!hw) continue;

    const first = hw[0].toLowerCase(); // keep diacritics
    // treat accented letters as their base except ç which is its own letter here
    const normFirst = first === "ç" ? "ç" : normalizeForSearch(first)[0]; // normalize others to base
    if (normFirst) present.add(normFirst);
  }

  for (const letter of ALPHABET) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "azbtn";
    btn.textContent = letter.toUpperCase();

    const enabled = present.has(letter);
    if (!enabled) btn.classList.add("disabled");
    if (MODE === "browse" && BROWSE_LETTER === letter) btn.classList.add("active");

    btn.onclick = () => {
      if (!enabled) return;
      setMode("browse", letter);
      doSearch();
    };

    root.appendChild(btn);
  }

  // Update "All" browse button state
  const allBtn = el("browseAll");
  if (MODE === "browse" && !BROWSE_LETTER) allBtn.classList.add("active");
  else allBtn.classList.remove("active");
}


function renderChips(entries) {
  const root = el("chips");
  root.innerHTML = "";

  const freq = new Map();
  for (const e of entries) {
    for (const t of (e.tags || [])) {
      const key = normalizeForSearch(t);
      if (!freq.has(key)) freq.set(key, { label: t, count: 0 });
      freq.get(key).count += 1;
    }
  }

  const top = [...freq.entries()]
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 14);

  for (const [key, obj] of top) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = obj.label;

    const refresh = () => chip.classList.toggle("active", ACTIVE_TAGS.has(key));
    refresh();

    chip.onclick = () => {
      if (ACTIVE_TAGS.has(key)) ACTIVE_TAGS.delete(key);
      else ACTIVE_TAGS.add(key);
      refresh();
      doSearch();
    };

    root.appendChild(chip);
  }
}

/** Better ranking: exact headword > prefix headword > contains headword > defs/tags/notes */
function rankResults(entries, query) {
  const q = normalizeForSearch(query);
  if (!q) return entries;

  const tokens = q.split(/\s+/).filter(Boolean);

  function scoreEntry(e) {
    const hw = normalizeForSearch(e.headword);
    const glosses = (e.defs || []).map(d => normalizeForSearch(d.gloss)).join(" ");
    const notes = (e.defs || []).map(d => normalizeForSearch(d.notes)).join(" ");
    const tags = (e.tags || []).map(t => normalizeForSearch(t)).join(" ");
    const blob = [hw, glosses, notes, tags].join(" ");

    // Must match all tokens somewhere (consistent with your previous behavior)
    for (const t of tokens) {
      if (!blob.includes(t)) return -Infinity;
    }

    let s = 0;

    // Headword priority
    if (hw === q) s += 1000;
    else if (hw.startsWith(q)) s += 700;
    else if (hw.includes(q)) s += 350;

    // Token-level headword boosts
    for (const t of tokens) {
      if (hw === t) s += 200;
      else if (hw.startsWith(t)) s += 120;
      else if (hw.includes(t)) s += 60;

      if (glosses.includes(t)) s += 35;
      if (tags.includes(t)) s += 20;
      if (notes.includes(t)) s += 10;
    }

    // Small tie-breakers: shorter headwords first, then alphabetical
    s += Math.max(0, 40 - hw.length);

    return s;
  }

  return [...entries]
    .map(e => ({ e, s: scoreEntry(e) }))
    .filter(x => x.s > -Infinity)
    .sort((a,b) => b.s - a.s || normalizeForSearch(a.e.headword).localeCompare(normalizeForSearch(b.e.headword)))
    .map(x => x.e);
}

function renderResults(entries) {
  const root = el("results");
  root.innerHTML = "";

  el("count").textContent = `${entries.length} match${entries.length === 1 ? "" : "es"}`;

  if (!entries.length) {
    root.innerHTML = `<div class="meta">No matches.</div>`;
    return;
  }

  for (const e of entries.slice(0, 250)) {
    const div = document.createElement("div");
    div.className = "card";

    const gloss = firstGloss(e);
    const tags = (e.tags || []).slice(0, 6);

    div.innerHTML = `
      <div class="top">
        <div class="hw">${escapeHtml(e.headword)}</div>
        <div class="badge">${escapeHtml(posLabel(e.pos))}</div>
      </div>
      <div class="gloss">${gloss ? escapeHtml(gloss) : `<span class="meta">No gloss</span>`}</div>
      <div class="small">${e.pron ? escapeHtml(e.pron) : ""}</div>
      ${tags.length ? `<div class="pills">${tags.map(t => `<span class="pill">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
    `;

    div.onclick = () => openEntry(e, true);
    root.appendChild(div);
  }
}

function buildCitation(e) {
  const academy = "Academia Caliterana de lo Internacional";
  const lang = LEX?.meta?.lang || "Lo Internacional";
  const source = LEX?.meta?.source || "a historical source";
  const baseUrl = window.location.href.split("#")[0];
  const url = baseUrl + getEntryUrlHash(e);
  return `${academy}. ${lang} Dictionary — entry “${e.headword}”. Based on ${source}. ${url}`;
}

async function copyText(text) {
  const t = (text ?? "").toString();
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}

function wireCopyButtons(e) {
  const btnHw = el("copyHw");
  const btnPron = el("copyPron");
  const btnCit = el("copyCit");
  const toast = el("toast");

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1200);
  };

  btnHw.onclick = async () => {
    const ok = await copyText(e.headword);
    showToast(ok ? "Copied headword" : "Copy failed");
  };

  btnPron.onclick = async () => {
    const ok = await copyText(e.pron || "");
    showToast(ok ? "Copied pronunciation" : "Copy failed");
  };

  btnCit.onclick = async () => {
    const ok = await copyText(buildCitation(e));
    showToast(ok ? "Copied citation" : "Copy failed");
  };

  btnPron.disabled = !(e.pron && e.pron.trim());
  btnPron.classList.toggle("disabled", btnPron.disabled);
}

function renderEntry(e) {
  CURRENT_ENTRY = e;
  el("entryMeta").textContent = e.id ? `ID: ${e.id}` : "";

  const defs = (e.defs || [])
    .map(d => {
      const g = linkifyText(d.gloss, e);
      const n = d.notes ? ` <span class="meta">— ${linkifyText(d.notes, e)}</span>` : "";
      return `<li><strong>${g}</strong>${n}</li>`;
    })
    .join("");

  const examples = (e.examples || [])
    .map(ex => `
      <div class="ex">
        <div class="src">${linkifyText(ex.src || "", e)}</div>
        ${ex.gloss ? `<div class="gl">${linkifyText(ex.gloss, e)}</div>` : ""}
      </div>
    `).join("");

  const tags = (e.tags || [])
    .map(t => `<span class="pill">${escapeHtml(t)}</span>`)
    .join("");

  const href = getEntryUrlHash(e);

  el("entry").classList.remove("empty");
  el("entry").innerHTML = `
    <div class="entry-head">
      <div class="entry-title">
        <h3>${escapeHtml(e.headword)} ${e.pron ? `<span class="pron">${escapeHtml(e.pron)}</span>` : ""}</h3>
        <div class="meta">${e.pos ? `Part of speech: ${escapeHtml(posLabel(e.pos))}` : ""}</div>
        <div class="meta entry-link">${href ? `Link: <a class="permalink" href="${href}">${escapeHtml(decodeURIComponent(href))}</a>` : ""}</div>
      </div>

      <div class="entry-actions">
        <button id="copyHw" class="btn tiny" type="button">Copy headword</button>
        <button id="copyPron" class="btn tiny" type="button">Copy pron</button>
        <button id="copyCit" class="btn tiny secondary" type="button">Copy citation</button>
      </div>
    </div>

    <div id="toast" class="toast" aria-live="polite"></div>

    <div class="line"></div>

    <div class="label">Meaning (English)</div>
    <ul>${defs || "<li><span class='meta'>No definitions.</span></li>"}</ul>

    ${examples ? `<div class="line"></div><div class="label">Examples</div>${examples}` : ""}

    ${tags ? `<div class="line"></div><div class="label">Tags</div><div class="pills">${tags}</div>` : ""}
  `;

  wireCopyButtons(e);
}

function openEntry(e, pushHash) {
  renderEntry(e);
  if (pushHash) {
    const h = getEntryUrlHash(e);
    if (h) {
      // Setting hash pushes history entry (back/forward works)
      if (window.location.hash !== h) window.location.hash = h;
    }
  }
}

function initPosFilter(entries) {
  const sel = el("posFilter");
  const allPos = [...new Set((entries || []).map(e => (e.pos || "").trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b));

  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "All";
  sel.appendChild(optAll);

  for (const p of allPos) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = posLabel(p);
    sel.appendChild(opt);
  }

  sel.value = "";
  sel.onchange = () => {
    POS_FILTER = sel.value;
    doSearch();
  };
}

function matchesFilters(e) {
  // POS filter
  if (POS_FILTER && (e.pos || "").trim() !== POS_FILTER) return false;

  // Tag filter (ALL selected tags must be present)
  if (ACTIVE_TAGS.size) {
    const entryTags = new Set((e.tags || []).map(t => normalizeForSearch(t)));
    for (const t of ACTIVE_TAGS) {
      if (!entryTags.has(t)) return false;
    }
  }

  return true;
}

function doSearch() {
  const q = el("q").value;
  const all = LEX.entries || [];

  // Browse mode: ignore query; filter by starting letter
  if (MODE === "browse") {
    let out = all.filter(matchesFilters);

  if (BROWSE_LETTER) {
    out = out.filter(e => {
      const hw = (e.headword || "").trim();
      if (!hw) return false;

      const first = hw[0].toLowerCase();
      const key = first === "ç" ? "ç" : normalizeForSearch(first)[0];
      return key === BROWSE_LETTER;
    });
  }

    out.sort((a,b) => normalizeForSearch(a.headword).localeCompare(normalizeForSearch(b.headword)));
    renderResults(out);
    return;
  }

  // Search mode
  const qn = normalizeForSearch(q);
  let out = all.filter(matchesFilters);

  if (!qn) {
    // Default list: alphabetical feels better than insertion order
    out.sort((a,b) => normalizeForSearch(a.headword).localeCompare(normalizeForSearch(b.headword)));
    renderResults(out);
    return;
  }

  out = rankResults(out, q);
  renderResults(out);
}

function tryOpenFromHash() {
  const hash = window.location.hash || "";
  if (!hash || hash === "#") return;

  const raw = hash.slice(1);

  // Support #id:<id>
  if (raw.startsWith("id:")) {
    const id = decodeURIComponent(raw.slice(3));
    const found = (LEX.entries || []).find(e => (e.id || "").toString() === id);
    if (found) openEntry(found, false);
    return;
  }

  // Default: headword
  const hw = decodeURIComponent(raw);
  const found = BY_NORM_HEADWORD.get(normalizeForSearch(hw));
  if (found) openEntry(found, false);
}

async function loadLexicon() {
  const res = await fetch("./data/lexicon.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lexicon.json (${res.status})`);
  LEX = await res.json();

  initPosFilter(LEX.entries || []);
  buildHeadwordIndex(LEX.entries || []);

  el("title").textContent = `${LEX.meta?.lang || "Dictionary"}`;
  el("subtitle").textContent = `${(LEX.entries?.length || 0)} entries • ${LEX.meta?.source || ""}`;

  const heritage =
`Based on ${LEX.meta?.source || "Grámatica Internacional by Campos Lima (1948)"}; used today as a part of our culture.
Basato in ${LEX.meta?.source || "Grámatica Internacional de Campos Lima (1948)"}; usato hodie como una parte de la nostra cultura.`;

  el("heritageTop").textContent = heritage;
  el("footerMeta").textContent = `${LEX.meta?.type || ""} • v${LEX.meta?.version || ""}`;
  el("heritageLine").textContent = heritage;

  renderChips(LEX.entries || []);
  setMode("search", "");
  renderAZ(LEX.entries || []);

  // Default results
  doSearch();

  // If URL has a hash, open it
  tryOpenFromHash();
}

window.addEventListener("DOMContentLoaded", async () => {
  el("q").addEventListener("input", () => {
    // typing switches to search mode
    if (MODE !== "search") setMode("search", "");
    doSearch();
  });

  el("clear").onclick = () => {
    el("q").value = "";
    setMode("search", "");
    doSearch();
  };

  el("browseAll").onclick = () => {
    setMode("browse", "");
    doSearch();
  };

  window.addEventListener("hashchange", () => {
    // Back/forward: open the entry from hash
    tryOpenFromHash();
  });

  try {
    await loadLexicon();
  } catch (err) {
    el("subtitle").textContent = `Error: ${err?.message || err}`;
  }
});
