let LEX = null;

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

  // pick top tags by frequency (limit to keep it clean)
  const freq = new Map();
  for (const e of entries) {
    for (const t of (e.tags || [])) {
      const k = normalizeForSearch(t);
      freq.set(k, (freq.get(k) || 0) + 1);
    }
  }

  const top = [...freq.entries()]
    .sort((a,b) => b[1]-a[1])
    .slice(0, 12)
    .map(([tag]) => tag);

  if (!top.length) return;

  for (const tag of top) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = tag;

    chip.onclick = () => {
      const q = el("q");
      const current = normalizeForSearch(q.value);
      // toggle: if query is exactly the tag, clear; else set tag
      if (current === tag) q.value = "";
      else q.value = tag;
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
        <div class="badge">${e.pos || "?"}</div>
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
    <div class="meta">${e.pos ? `Part of speech: ${e.pos}` : ""}</div>

    <div class="line"></div>

    <div class="label">Meaning (English)</div>
    <ul>${defs || "<li><span class='meta'>No definitions.</span></li>"}</ul>

    ${examples ? `<div class="line"></div><div class="label">Examples</div>${examples}` : ""}

    ${tags ? `<div class="line"></div><div class="label">Tags</div><div class="pills">${tags}</div>` : ""}
  `;
}

function doSearch() {
  const q = normalizeForSearch(el("q").value);
  const all = LEX.entries || [];

  setActiveChipFromQuery();

  if (!q) {
    renderResults(all);
    return;
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const out = all.filter(e => {
    const blob = entryToSearchBlob(e);
    return tokens.every(t => blob.includes(t));
  });

  renderResults(out);
}

async function loadLexicon() {
  const res = await fetch("./data/lexicon.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load lexicon.json (${res.status})`);
  LEX = await res.json();

  el("title").textContent = `${LEX.meta?.lang || "Dictionary"}`;
  el("subtitle").textContent = `${(LEX.entries?.length || 0)} entries • ${LEX.meta?.source || ""}`;
  el("footerMeta").textContent = `${LEX.meta?.type || ""} • v${LEX.meta?.version || ""}`;

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
