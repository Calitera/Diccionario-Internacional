let LEX = null;

const el = (id) => document.getElementById(id);

function norm(s) {
  return (s || "").toString().toLowerCase().trim();
}

function entryToSearchBlob(e) {
  const defs = (e.defs || []).map(d => d.gloss).join(" ");
  const tags = (e.tags || []).join(" ");
  return norm([e.headword, e.id, e.pos, e.pron, defs, tags].join(" "));
}

function renderResults(entries) {
  const root = el("results");
  root.innerHTML = "";
  if (!entries.length) {
    root.innerHTML = `<div class="muted">No matches.</div>`;
    return;
  }

  for (const e of entries.slice(0, 200)) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${e.headword}</strong> <span class="muted">(${e.pos || "?"})</span><br/>
      <span class="muted">${(e.defs?.[0]?.gloss) || ""}</span>
    `;
    div.onclick = () => renderEntry(e);
    root.appendChild(div);
  }
}

function renderEntry(e) {
  const lines = [];
  lines.push(`${e.headword}${e.pron ? "  " + e.pron : ""}`);
  lines.push(e.pos ? `Part of speech: ${e.pos}` : "");
  lines.push("");

  if (e.defs?.length) {
    lines.push("Definitions:");
    e.defs.forEach((d, i) => {
      lines.push(`  ${i + 1}. ${d.gloss}${d.notes ? " — " + d.notes : ""}`);
    });
    lines.push("");
  }

  if (e.examples?.length) {
    lines.push("Examples:");
    e.examples.forEach(ex => {
      lines.push(`  • ${ex.src}`);
      if (ex.gloss) lines.push(`    ${ex.gloss}`);
    });
    lines.push("");
  }

  if (e.tags?.length) {
    lines.push(`Tags: ${e.tags.join(", ")}`);
  }

  el("entry").classList.remove("muted");
  el("entry").textContent = lines.filter(x => x !== "").join("\n");
}

function doSearch() {
  const q = norm(el("q").value);
  const all = LEX.entries || [];
  if (!q) return renderResults(all);

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
  el("subtitle").textContent = `${(LEX.entries?.length || 0)} entries • JSON-backed • GitHub Pages`;

  renderResults(LEX.entries || []);
}

async function myMemoryTranslate(text, from, to) {
  // MyMemory free API. Anonymous is limited; with 'de' email param you get higher limits. :contentReference[oaicite:1]{index=1}
  const email = ""; // optionally put a contact email (visible in client-side code!)
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${from}|${to}`);
  if (email) url.searchParams.set("de", email);

  const res = await fetch(url.toString());
  const data = await res.json();
  return data?.responseData?.translatedText || "(no translation returned)";
}

async function initMT() {
  el("mtBtn").onclick = async () => {
    const text = el("mtText").value.trim();
    if (!text) return;

    el("mtOut").textContent = "Translating…";
    try {
      const from = el("mtFrom").value;
      const to = el("mtTo").value;
      const out = await myMemoryTranslate(text, from, to);
      el("mtOut").textContent = out;
    } catch (err) {
      el("mtOut").textContent = `Error: ${err?.message || err}`;
    }
  };
}

window.addEventListener("DOMContentLoaded", async () => {
  el("q").addEventListener("input", doSearch);
  el("clear").onclick = () => { el("q").value = ""; doSearch(); };

  await loadLexicon();
  await initMT();
});
