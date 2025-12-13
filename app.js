let LEX = null;

let ACTIVE_TAGS = new Set();   // tag filter (multi-select)
let POS_FILTER = "";           // pos filter (single-select)

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

function firstGloss(e) {
  const g = e?.defs?.[0]?.gloss;
  return typeof g === "string" ? g : "";
}

function entryToSearchBlob(e) {
  const defs = (e.defs || []).map(d => (typeof d.gloss === "string" ? d.gloss : "")).join(" ");
  const tags = (e.tags || []).join(" ");
  return normalizeForSearch([e.headword, e.id, e.pos, e.pron, defs, tags].join(" "));
}
function renderChips(entries) {
  const root = el("chips");
  root.innerHTML = "";

  const freq = new Map();
  for (const e of entries) {
    for (const t of (e.tags || [])) {
      const key = normalizeForSearch(t);
      // keep original casing for display by storing first-seen label
      if (!freq.has(key)) freq.set(key, { label: t, count: 0 });
      freq.get(key).count += 1;
    }
  }

  const top = [...freq.entries()]
    .sort((a,b) => b[1].count - a[1].count)
    .slice(0, 14); // slightly more is fine

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

function setActiveChipFromQuery() {
  const q = normalizeForSearch(el("q").value);
  const chips = el("chips").querySelectorAll(".chip");
  chips.forEach(c => c.classList.toggle("active", normalizeForSearch(c.textContent) === q));
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
        <div class="hw">${e.headword}</div>
        <div class="badge">${posLabel(e.pos)}</div>
      </div>
      <div class="gloss">${gloss ? gloss : `<span class="meta">No gloss</span>`}</div>
      <div class="small">${e.pron ? e.pron : ""}</div>
      ${tags.length ? `<div class="pills">${tags.map(t => `<span class="pill">${t}</span>`).join("")}</div>` : ""}
    `;

    div.onclick = () => renderEntry(e);
    root.appendChild(div);
  }
}

function renderEntry(e) {
  el("entryMeta").textContent = e.id ? `ID: ${e.id}` : "";

  const defs = (e.defs || [])
    .map((d, i) => `<li><strong>${d.gloss}</strong>${d.notes ? ` <span class="meta">— ${d.notes}</span>` : ""}</li>`)
    .join("");

  const examples = (e.examples || [])
    .map(ex => `
      <div class="ex">
        <div class="src">${ex.src || ""}</div>
        ${ex.gloss ? `<div class="gl">${ex.gloss}</div>` : ""}
      </div>
    `).join("");

  const tags = (e.tags || [])
    .map(t => `<span class="pill">${t}</span>`)
    .join("");

  el("entry").classList.remove("empty");
  el("entry").innerHTML = `
    <h3>${e.headword} ${e.pron ? `<span class="pron">${e.pron}</span>` : ""}</h3>
    <div class="meta">${e.pos ? `Part of speech: ${posLabel(e.pos)}` : ""}</div>

    <div class="line"></div>

    <div class="label">Meaning (English)</div>
    <ul>${defs || "<li><span class='meta'>No definitions.</span></li>"}</ul>

    ${examples ? `<div class="line"></div><div class="label">Examples</div>${examples}` : ""}

    ${tags ? `<div class="line"></div><div class="label">Tags</div><div class="pills">${tags}</div>` : ""}
  `;
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

function doSearch() {
  const q = normalizeForSearch(el("q").value);
  const all = LEX.entries || [];

  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  const out = all.filter(e => {
    // POS filter
    if (POS_FILTER && (e.pos || "").trim() !== POS_FILTER) return false;

    // Tag filter (ALL selected tags must be present)
    if (ACTIVE_TAGS.size) {
      const entryTags = new Set((e.tags || []).map(t => normalizeForSearch(t)));
      for (const t of ACTIVE_TAGS) {
        if (!entryTags.has(t)) return false;
      }
    }

    // Text search
    if (!tokens.length) return true;
    const blob = entryToSearchBlob(e);
    return tokens.every(t => blob.includes(t));
  });

  renderResults(out);
}

async function loadLexicon() {
  const res = await fetch("./data/lexicon.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lexicon.json (${res.status})`);
  LEX = await res.json();
  
  initPosFilter(LEX.entries || []);

  el("title").textContent = `${LEX.meta?.lang || "Dictionary"}`;
  el("subtitle").textContent = `${(LEX.entries?.length || 0)} entries • ${LEX.meta?.source || ""}`;
  const heritage = 
  `Based on ${LEX.meta?.source || "Grámatica Internacional by Campos Lima (1948)"}; used today as a part of our culture.
  Basato in ${LEX.meta?.source || "Grámatica Internacional de Campos Lima (1948)"}; usato hodie como una parte de la nostra cultura.`;
  el("heritageTop").textContent = heritage;
  el("footerMeta").textContent = `${LEX.meta?.type || ""} • v${LEX.meta?.version || ""}`;
  el("heritageLine").textContent = heritage;

  renderChips(LEX.entries || []);
  renderResults(LEX.entries || []);
}

window.addEventListener("DOMContentLoaded", async () => {
  el("q").addEventListener("input", doSearch);
  el("clear").onclick = () => { el("q").value = ""; doSearch(); };

  try {
    await loadLexicon();
  } catch (err) {
    el("subtitle").textContent = `Error: ${err?.message || err}`;
  }
});
