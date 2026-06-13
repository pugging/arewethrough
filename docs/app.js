/* AreWeThrough — group-stage scenario engine + UI. No dependencies.
 *
 * Ranking rules implemented per the 2026 World Cup regulations:
 *  Group: points, goal difference, goals scored; teams still level are split by
 *  head-to-head points/GD/goals among themselves; anything left is flagged as
 *  "fair play / drawing of lots" (we don't track bookings).
 *  Best thirds: points, GD, goals scored across the 12 third-placed teams; top 8 advance.
 */
"use strict";

/* ---------------- engine (pure) ---------------- */

// scores: {matchId: [a,b]} — official results from WC.matches override user input
function effectiveScore(m, user) {
  if (m.s1 !== null && m.s1 !== undefined) return [m.s1, m.s2];
  const u = user[m.id];
  return u || null;
}

function groupMatches(g) { return WC.matches.filter(m => m.g === g); }

function tableFor(codes, matches, user) {
  const st = {};
  codes.forEach(c => st[c] = { code: c, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 });
  for (const m of matches) {
    const sc = effectiveScore(m, user);
    if (!sc) continue;
    const [a, b] = sc, A = st[m.t1], B = st[m.t2];
    if (!A || !B) continue; // match outside this subset (h2h mini-table)
    A.P++; B.P++; A.GF += a; A.GA += b; B.GF += b; B.GA += a;
    if (a > b) { A.W++; B.L++; A.Pts += 3; }
    else if (a < b) { B.W++; A.L++; B.Pts += 3; }
    else { A.D++; B.D++; A.Pts++; B.Pts++; }
  }
  for (const c of codes) st[c].GD = st[c].GF - st[c].GA;
  return st;
}

const desc = (x, y) => y - x;
function cmpTriple(a, b) {
  return desc(a.Pts, b.Pts) || desc(a.GD, b.GD) || desc(a.GF, b.GF);
}

// returns array of rows {code,...stats, lots:boolean} in final order
function rankGroup(g, user) {
  const codes = WC.groups[g];
  const ms = groupMatches(g);
  const st = tableFor(codes, ms, user);
  let rows = codes.map(c => st[c]).sort(cmpTriple);

  // split clusters tied on (Pts, GD, GF) by head-to-head among the tied teams
  const out = [];
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && cmpTriple(rows[i], rows[j]) === 0) j++;
    const cluster = rows.slice(i, j);
    if (cluster.length > 1) {
      const cc = cluster.map(r => r.code);
      const h2h = tableFor(cc, ms.filter(m => cc.includes(m.t1) && cc.includes(m.t2)), user);
      cluster.sort((a, b) => cmpTriple(h2h[a.code], h2h[b.code]) || a.code.localeCompare(b.code));
      // mark teams that h2h could not separate — only meaningful once those teams
      // have finished all their games (otherwise the pitch can still decide)
      const finished = cluster.every(r => r.P === 3);
      for (let k = 0; finished && k < cluster.length; k++) {
        const prev = cluster[k - 1];
        if (prev && cmpTriple(h2h[prev.code], h2h[cluster[k].code]) === 0) {
          cluster[k].lots = true; prev.lots = true;
        }
      }
    }
    out.push(...cluster);
    i = j;
  }
  return out;
}

function rankThirds(user) {
  const thirds = Object.keys(WC.groups).map(g => {
    const r = rankGroup(g, user)[2];
    return Object.assign({ g }, r);
  }).sort((a, b) => cmpTriple(a, b) || a.code.localeCompare(b.code));
  for (let k = 1; k < thirds.length; k++) {
    if (thirds[k - 1].P === 3 && thirds[k].P === 3 && cmpTriple(thirds[k - 1], thirds[k]) === 0) {
      thirds[k].lots = thirds[k - 1].lots = true;
    }
  }
  return thirds; // top 8 advance
}

// status for one team under current scenario
function teamStatus(code, user) {
  const g = WC.teams[code].g;
  const rows = rankGroup(g, user);
  const pos = rows.findIndex(r => r.code === code) + 1;
  const remaining = groupMatches(g).filter(m => !effectiveScore(m, user)).length;
  if (pos <= 2) return { pos, remaining, status: "through", as: pos === 1 ? "group winners" : "runners-up" };
  if (pos === 3) {
    const thirds = rankThirds(user);
    const tp = thirds.findIndex(r => r.code === code) + 1;
    return { pos, remaining, thirdRank: tp, status: tp <= 8 ? "third-in" : "third-out" };
  }
  return { pos, remaining, status: "out" };
}

/* ---------------- URL state ---------------- */

function readHash() {
  const user = {}; let team = null;
  const h = location.hash.replace(/^#/, "");
  for (const part of h.split("&")) {
    let mm;
    if ((mm = part.match(/^m(\d+)=(\d{1,2})-(\d{1,2})$/))) user[+mm[1]] = [+mm[2], +mm[3]];
    else if ((mm = part.match(/^team=([A-Z]{3})$/)) && WC.teams[mm[1]]) team = mm[1];
  }
  return { user, team };
}

function writeHash(user, team) {
  const parts = Object.entries(user).map(([id, s]) => `m${id}=${s[0]}-${s[1]}`);
  if (team) parts.push(`team=${team}`);
  history.replaceState(null, "", parts.length ? "#" + parts.join("&") : location.pathname + location.search);
}

/* ---------------- UI ---------------- */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
let USER = {}, TEAM = null;
const OPEN = new Set(); // groups with the fixtures accordion expanded

function flagName(code, bold) {
  const t = WC.teams[code];
  return `${t.flag} ${bold ? "<b>" + t.name + "</b>" : t.name}`;
}

function renderGroups() {
  const root = $("#groups");
  root.innerHTML = "";
  let order = Object.keys(WC.groups);
  if (TEAM) { // show the focused team's group first
    const fg = WC.teams[TEAM].g;
    order = [fg, ...order.filter(g => g !== fg)];
  }
  for (const g of order) {
    const rows = rankGroup(g, USER);
    const ms = groupMatches(g);
    const remaining = ms.filter(m => !effectiveScore(m, USER)).length;
    const card = document.createElement("div");
    card.className = "gcard";
    let html = `<h3><span>Group ${g}</span><span class="gdone">${6 - remaining} of 6 scored</span></h3>
      <table class="standings">
      <tr><th></th><th>Team</th><th>P</th><th class="wdl">W</th><th class="wdl">D</th><th class="wdl">L</th><th>GD</th><th>Pts</th></tr>`;
    rows.forEach((r, idx) => {
      const cls = [`p${idx + 1}`]; if (r.code === TEAM) cls.push("focus");
      html += `<tr class="${cls.join(" ")}">
        <td class="pos">${idx + 1}</td>
        <td class="team">${flagName(r.code)}${r.lots ? ` <span class="lots" title="Tied on every metric — fair play points / drawing of lots would decide">${icon("scale")}</span>` : ""}</td>
        <td>${r.P}</td><td class="wdl">${r.W}</td><td class="wdl">${r.D}</td><td class="wdl">${r.L}</td><td>${r.GD > 0 ? "+" + r.GD : r.GD}</td><td class="pts">${r.Pts}</td></tr>`;
    });
    html += `</table>
      <details data-g="${g}"${OPEN.has(g) ? " open" : ""}>
      <summary>${icon("chevron-down")} ${remaining ? `Predict scores · ${remaining} match${remaining > 1 ? "es" : ""} left` : "All results in"}</summary>
      <div class="fixtures">`;
    for (const m of ms) {
      const d = m.date.slice(5).replace("-", "/");
      const official = m.s1 !== null && m.s1 !== undefined;
      const t1 = WC.teams[m.t1], t2 = WC.teams[m.t2];
      html += `<div class="fx"><span class="d">${d}</span>
        <span class="t right">${t1.flag} ${m.t1}</span>`;
      if (official) {
        html += `<span class="score"><b>${m.s1}–${m.s2}</b></span>`;
      } else {
        const u = USER[m.id];
        html += `<input type="number" min="0" max="35" inputmode="numeric" placeholder="–" data-m="${m.id}" data-side="0" value="${u && u[0] !== null ? u[0] : ""}" class="${u ? "set" : ""}" aria-label="${t1.name} goals">
          <span class="score">:</span>
          <input type="number" min="0" max="35" inputmode="numeric" placeholder="–" data-m="${m.id}" data-side="1" value="${u && u[1] !== null ? u[1] : ""}" class="${u ? "set" : ""}" aria-label="${t2.name} goals">`;
      }
      html += `<span class="t">${t2.flag} ${m.t2}</span></div>`;
    }
    html += `</div></details>`;
    card.innerHTML = html;
    root.appendChild(card);
  }
}

function renderThirds() {
  const thirds = rankThirds(USER);
  const ol = $("#thirdlist");
  ol.innerHTML = "";
  thirds.forEach((r, i) => {
    if (i === 8) {
      const cut = document.createElement("li");
      cut.className = "cutline";
      cut.textContent = "qualification line";
      ol.appendChild(cut);
    }
    const li = document.createElement("li");
    li.className = i < 8 ? "in" : "";
    li.innerHTML = `<span class="rank">${i + 1}</span>
      <span class="nm">${flagName(r.code, r.code === TEAM)} <span class="gtag">· Group ${r.g}</span>${r.lots ? ` <span class="lots" title="Tied — fair play / lots would decide">${icon("scale")}</span>` : ""}</span>
      <span class="st">${r.Pts} pts · ${r.GD > 0 ? "+" + r.GD : r.GD} gd · ${r.GF} gf</span>`;
    ol.appendChild(li);
  });
}

function verdictParts(code) {
  const t = WC.teams[code];
  const groupScored = groupMatches(t.g).some(m => effectiveScore(m, USER));
  if (!groupScored) {
    return { cls: "", status: `Group ${t.g} · not started`, text: `Type scores for ${t.name}'s games below to see every way the group can break.` };
  }
  const s = teamStatus(code, USER);
  const unpredicted = WC.matches.filter(m => !effectiveScore(m, USER)).length;
  const caveat = unpredicted
    ? `Based on results + your predictions so far. ${unpredicted} group matches still open.`
    : `All 72 group matches set in this scenario.`;
  if (s.status === "through") return { cls: "thru", status: `Through · ${s.as}, Group ${t.g}`, text: caveat };
  if (s.status === "third-in") return { cls: "third", status: `Through · best third #${s.thirdRank} of 8`, text: `3rd in Group ${t.g}, inside the qualification line. ${caveat}` };
  if (s.status === "third-out") return { cls: "out", status: `Out · third #${s.thirdRank}, top 8 advance`, text: `3rd in Group ${t.g} but below the qualification line. ${caveat}` };
  return { cls: "out", status: `Out · ${s.pos}th in Group ${t.g}`, text: caveat };
}

function renderVerdict() {
  const v = $("#verdict");
  if (!TEAM) { v.style.display = "none"; return; }
  const t = WC.teams[TEAM];
  const p = verdictParts(TEAM);
  v.style.display = "block";
  v.className = "verdict " + p.cls;
  v.innerHTML = `<div class="v-status">${p.status}</div>
    <div class="v-team">${t.flag} ${t.name}</div>
    <small>${p.text}</small>`;
}

function renderAll() {
  renderGroups();
  renderThirds();
  renderVerdict();
  writeHash(USER, TEAM);
}

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2400);
}

/* fill helpers */
function fillRemaining(mode) {
  for (const m of WC.matches) {
    if (effectiveScore(m, USER)) continue;
    if (mode === "draws") USER[m.id] = [1, 1];
    else if (mode === "random") {
      const goals = () => { const r = Math.random(); return r < .30 ? 0 : r < .65 ? 1 : r < .87 ? 2 : r < .96 ? 3 : 4; };
      USER[m.id] = [goals(), goals()];
    }
  }
  renderAll();
}

function setTeam(code, scroll) {
  TEAM = code || null;
  $$("select.teamsel").forEach(s => { s.value = TEAM || ""; });
  if (TEAM) OPEN.add(WC.teams[TEAM].g);
  renderAll();
  if (TEAM && scroll) {
    const v = $("#verdict");
    if (v) v.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function init() {
  const fromHash = readHash();
  USER = fromHash.user;
  TEAM = document.body.dataset.team || fromHash.team || null;
  if (TEAM) OPEN.add(WC.teams[TEAM].g);

  // team pickers (topbar + optional hero one), kept in sync
  const codes = Object.keys(WC.teams).sort((a, b) => WC.teams[a].name.localeCompare(WC.teams[b].name));
  $$("select.teamsel").forEach(sel => {
    for (const c of codes) {
      const o = document.createElement("option");
      o.value = c; o.textContent = `${WC.teams[c].flag} ${WC.teams[c].name}`;
      sel.appendChild(o);
    }
    if (TEAM) sel.value = TEAM;
    sel.addEventListener("change", () => setTeam(sel.value, sel.classList.contains("hero-pick")));
  });

  // score inputs (delegated)
  $("#groups").addEventListener("input", e => {
    const inp = e.target;
    if (!inp.dataset.m) return;
    const id = +inp.dataset.m, side = +inp.dataset.side;
    const val = inp.value === "" ? null : Math.max(0, Math.min(35, parseInt(inp.value, 10) || 0));
    const cur = USER[id] || [null, null];
    cur[side] = val;
    if (cur[0] === null && cur[1] === null) delete USER[id];
    else if (cur[0] !== null && cur[1] !== null) USER[id] = cur;
    else { USER[id] = cur; return; } // wait for both sides before recomputing
    const focused = document.activeElement;
    const restore = focused && focused.dataset ? [focused.dataset.m, focused.dataset.side] : null;
    renderAll();
    if (restore) {
      const again = document.querySelector(`input[data-m="${restore[0]}"][data-side="${restore[1]}"]`);
      if (again) { again.focus(); }
    }
  });

  // remember which accordions the user opened/closed
  $("#groups").addEventListener("toggle", e => {
    const d = e.target;
    if (!d.dataset || !d.dataset.g) return;
    if (d.open) OPEN.add(d.dataset.g); else OPEN.delete(d.dataset.g);
  }, true);

  $("#fill-draws").addEventListener("click", () => { fillRemaining("draws"); toast("Remaining matches set to 1–1"); });
  $("#fill-random").addEventListener("click", () => { fillRemaining("random"); toast("Remaining matches filled randomly"); });
  $("#clear").addEventListener("click", () => { USER = {}; renderAll(); toast("Your predictions cleared"); });

  $("#share").addEventListener("click", async () => {
    const url = location.href;
    const t = TEAM ? WC.teams[TEAM] : null;
    const text = t ? `My scenario: are ${t.name} through? Check the math:` : "World Cup 2026 group scenario — check the math:";
    try {
      if (navigator.share) { await navigator.share({ title: "Are We Through?", text, url }); return; }
      await navigator.clipboard.writeText(url);
      toast("Scenario link copied — go win the argument");
    } catch (e) { /* user cancelled share */ }
  });

  const upd = $("#updated");
  if (upd) upd.textContent = WC.updated;
  renderAll();
}

if (typeof document !== "undefined") {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
}
