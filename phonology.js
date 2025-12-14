let RULES = [];
let GROUP_FILTER = "";

const el = (id) => document.getElementById(id);

function normalizeForSearch(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function classifyRule(r) {
  const g = (r.grapheme || "").trim();
  const ctx = (r.context || "").toLowerCase();

  const isDigraph = g.length > 1; // CH, RR, QU, QÜ, etc.
  const isVowel = /vowel/.test(ctx) && g.length === 1; // A/E/I/O/U marked as vowel in context

  if (GROUP_FILTER === "digraph") return isDigraph;
  if (GROUP_FILTER === "single") return !isDigraph;
  if (GROUP_FILTER === "vowel") return isVowel;
  return true;
}

function render(rows) {
  const body = el("rows");
  body.innerHTML = "";

  el("count").textContent = `${rows.length} rule${rows.length === 1 ? "" : "s"}`;

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="3" class="meta">No matches.</td></tr>`;
    return;
  }

  for (const r of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="g">${r.grapheme || ""}</span></td>
      <td>${r.context || ""}</td>
      <td><span class="ipa">${r.ipa || ""}</span></td>
    `;
    body.appendChild(tr);
  }
}

function doSearch() {
  const q = normalizeForSearch(el("q").value);
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  const out = RULES.filter(r => {
    if (!classifyRule(r)) return false;

    if (!tokens.length) return true;

    const blob = normalizeForSearch(
      [r.grapheme, r.context, r.ipa].join(" ")
    );
    return tokens.every(t => blob.includes(t));
  });

  render(out);
}

async function loadRules() {
  const res = await fetch("./data/phonology.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load phonology.json (${res.status})`);
  RULES = await res.json();

  // Nice default order: A..Z-ish but keeping digraphs near their base letter
  RULES.sort((a,b) => {
    const ga = (a.grapheme || "").toUpperCase();
    const gb = (b.grapheme || "").toUpperCase();
    if (ga === gb) return (a.context || "").localeCompare(b.context || "");
    return ga.localeCompare(gb, "en");
  });

  render(RULES);
}

window.addEventListener("DOMContentLoaded", async () => {
  el("q").addEventListener("input", doSearch);
  el("clear").onclick = () => { el("q").value = ""; doSearch(); };

  el("groupFilter").onchange = () => {
    GROUP_FILTER = el("groupFilter").value;
    doSearch();
  };

  try {
    await loadRules();
  } catch (err) {
    el("count").textContent = `Error: ${err?.message || err}`;
  }
});