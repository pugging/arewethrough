#!/usr/bin/env node
/* Generates docs/teams/<slug>/index.html for all 48 teams, the teams directory
 * page, and sitemap.xml. Run after update_data.py:  node tools/build.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const SITE = "https://pugging.github.io/arewethrough";
const ROOT = path.join(__dirname, "..", "docs");

eval(fs.readFileSync(path.join(ROOT, "data.js"), "utf8").replace("const WC =", "globalThis.WC ="));

const fmt = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric" });
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const FOOTER = (prefix) => `<footer>
  <div class="wrap cols">
    <span>AreWeThrough? — unofficial fan tool, not affiliated with FIFA</span>
    <span><a href="${prefix}how-it-works.html">How the rules work</a> · <a href="${prefix}teams/">All 48 teams</a> · <a href="${prefix}privacy.html">Privacy</a></span>
    <span>Match data: <a href="https://en.wikipedia.org/wiki/2026_FIFA_World_Cup" rel="external">Wikipedia</a> (<a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license external">CC BY-SA 4.0</a>) · updated <span id="updated">—</span></span>
  </div>
</footer>`;

const HYDRATE = `<script>
  document.getElementById("logomark").innerHTML = icon("goal");
  document.getElementById("shareicn").innerHTML = icon("share-2");
  document.querySelectorAll("[data-icn]").forEach(el => { el.innerHTML = icon(el.dataset.icn); });
</script>`;

function topbar(prefix) {
  return `<div class="topbar">
  <div class="wrap">
    <a class="logo" href="${prefix}"><span class="mark" id="logomark"></span>AreWeThrough<span class="q">?</span></a>
    <span class="grow"></span>
    <select class="teamsel" aria-label="Pick your team"><option value="">Pick your team…</option></select>
    <button class="btn primary" id="share"><span id="shareicn"></span>Share scenario</button>
  </div>
</div>`;
}

function teamPage(code) {
  const t = WC.teams[code];
  const opponents = WC.groups[t.g].filter(c => c !== code).map(c => WC.teams[c]);
  const oppNames = opponents.map(o => o.name);
  const oppList = oppNames.slice(0, -1).join(", ") + " and " + oppNames[oppNames.length - 1];
  const fixtures = WC.matches.filter(m => m.t1 === code || m.t2 === code);
  const fxLines = fixtures.map(m => {
    const opp = m.t1 === code ? WC.teams[m.t2] : WC.teams[m.t1];
    const homeAway = m.t1 === code ? `${t.name} vs ${opp.name}` : `${opp.name} vs ${t.name}`;
    const score = m.s1 !== null ? ` — finished ${m.s1}–${m.s2}` : "";
    return `${homeAway} on ${fmt(m.date)} (${m.venue})${score}`;
  });
  const title = `What do ${t.name} need to qualify? — World Cup 2026 Group ${t.g} scenarios`;
  const desc = `${t.name} are in Group ${t.g} with ${oppList}. Enter scores for the remaining games and instantly see if ${t.name} reach the Round of 32 — including the best-thirds ranking. Free, shareable scenario links.`;
  const url = `${SITE}/teams/${t.slug}/`;

  const faq = JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
      { "@type": "Question", "name": `What group are ${t.name} in at the 2026 World Cup?`, "acceptedAnswer": { "@type": "Answer", "text": `${t.name} are in Group ${t.g} together with ${oppList}.` } },
      { "@type": "Question", "name": `Who do ${t.name} play in the group stage?`, "acceptedAnswer": { "@type": "Answer", "text": fxLines.join(". ") + "." } },
      { "@type": "Question", "name": `Can ${t.name} qualify for the Round of 32 as a third-placed team?`, "acceptedAnswer": { "@type": "Answer", "text": `Yes. Besides the top two of Group ${t.g}, the 8 best third-placed teams across all 12 groups advance, ranked by points, goal difference and goals scored. Use the live calculator to test any scenario.` } }
    ]
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(`Are ${t.name} through? — WC2026 scenario calculator`)}">
<meta property="og:description" content="${esc(`Type scores for Group ${t.g}'s remaining games and see if ${t.name} advance. Share your scenario as a link.`)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../../style.css">
<script type="application/ld+json">${faq}</script>
</head>
<body data-team="${code}">
${topbar("../../")}
<header class="hero wrap">
  <h1>${t.flag} What do ${t.name} need<span class="q">?</span></h1>
  <p class="sub">${t.name} are in <b>Group ${t.g}</b> with ${oppList}. Type scores for the remaining games — the tables, the best-thirds ranking and the verdict update instantly.</p>
  <div id="verdict" class="verdict" style="display:none"></div>
  <div class="controls">
    <button class="btn" id="fill-draws"><span data-icn="equal"></span>All draws</button>
    <button class="btn" id="fill-random"><span data-icn="dices"></span>Random</button>
    <button class="btn" id="clear"><span data-icn="eraser"></span>Reset</button>
    <span class="hint">Played matches are locked as official results — the rest is yours to predict.</span>
  </div>
  <p class="meta">Group ${t.g} matchdays: ${fixtures.map(m => fmt(m.date)).join(" · ")} · results auto-update</p>
</header>
<main class="wrap">
  <div id="groups" class="groups" aria-live="polite"></div>
  <section class="thirds" id="thirds">
    <h2><span data-icn="trophy"></span>Best third-placed teams</h2>
    <p class="note">Top 8 advance to the Round of 32 — ranked by points, then goal difference, then goals scored.</p>
    <ol id="thirdlist"></ol>
  </section>
  <section class="content">
    <h2>${t.name}'s group fixtures</h2>
    <p>${fxLines.join(".<br>")}.</p>
    <p>Third place might be enough: the 8 best third-placed teams across all 12 groups also advance. That ranking — points, then goal difference, then goals scored — is computed live above. <a href="../../how-it-works.html">Full rules explained here.</a></p>
  </section>
</main>
${FOOTER("../../")}
<div id="toast" role="status"></div>
<script src="../../data.js"></script>
<script src="../../icons.js"></script>
<script src="../../app.js"></script>
${HYDRATE}
</body>
</html>
`;
}

function teamsIndex() {
  const byGroup = Object.keys(WC.groups).map(g => {
    const items = WC.groups[g].map(c => {
      const t = WC.teams[c];
      return `<li><a href="${t.slug}/">${t.flag} ${t.name}</a></li>`;
    }).join("\n      ");
    return `<div class="gcard"><h3><span>Group ${g}</span></h3><ul style="list-style:none;padding:0;margin:0;font-size:15px;line-height:2.1">\n      ${items}\n    </ul></div>`;
  }).join("\n  ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>All 48 teams — World Cup 2026 qualification scenarios by team</title>
<meta name="description" content="Pick your team: dedicated World Cup 2026 group-stage scenario pages for all 48 squads. What does your team need to reach the Round of 32?">
<link rel="canonical" href="${SITE}/teams/">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="../style.css">
</head>
<body>
<div class="topbar"><div class="wrap"><a class="logo" href="../"><span class="mark" id="logomark"></span>AreWeThrough<span class="q">?</span></a></div></div>
<header class="hero wrap"><h1>Pick your team</h1>
<p class="sub">Every squad has its own scenario page. Bookmark yours for the last round of group games (June 24–27) — that's when the math gets desperate.</p></header>
<main class="wrap"><div class="groups">
  ${byGroup}
</div></main>
${FOOTER("../")}
<script src="../icons.js"></script>
<script>document.getElementById("logomark").innerHTML = icon("goal");</script>
</body>
</html>
`;
}

function sitemap(urls) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
}

// --- write everything
const urls = [`${SITE}/`, `${SITE}/teams/`, `${SITE}/how-it-works.html`];
for (const code of Object.keys(WC.teams)) {
  const t = WC.teams[code];
  const dir = path.join(ROOT, "teams", t.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), teamPage(code));
  urls.push(`${SITE}/teams/${t.slug}/`);
}
fs.writeFileSync(path.join(ROOT, "teams", "index.html"), teamsIndex());
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap(urls));
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`OK: ${Object.keys(WC.teams).length} team pages, teams index, sitemap (${urls.length} urls), robots.txt`);
