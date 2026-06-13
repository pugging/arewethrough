# Are We Through? ⚽

**Live: https://pugging.github.io/arewethrough/**

World Cup 2026 group-stage scenario calculator. Type scores for the remaining
games and instantly see who advances — including the live ranking of the 8 best
third-placed teams across all 12 groups (the math nobody can do in their head).
Every scenario is encoded in the URL, so you can share your exact prediction and
settle the argument in the group chat.

Free, no signup, no dependencies: vanilla JS, static hosting.

## Structure

- `docs/` — the website (GitHub Pages root): simulator, 48 per-team SEO pages, rules, pitch deck
- `tools/update_data.py` — fetches latest results from Wikipedia → regenerates `docs/data.js`
- `tools/build.js` — regenerates the 48 team pages + sitemap from data
- `tools/test_engine.js` — 15 unit tests for the ranking engine (FIFA tiebreakers, best-thirds)
- `boardroom/` — business artifacts: Business Model Canvas, Porter's Five Forces, value chain, BPMN, sprint plan, launch kit

## Daily ops during the tournament

```bash
python3 tools/update_data.py && node tools/build.js && node tools/test_engine.js \
  && git add -A && git commit -m "results" && git push
```

## Rules implemented

Group ranking: points → goal difference → goals scored → head-to-head (points, GD,
goals) among tied teams → flagged ⚖ for fair play / drawing of lots (we don't track
bookings). Best thirds: points → GD → goals scored across the 12 third-placed teams;
top 8 advance.

Unofficial fan project, not affiliated with FIFA. Match data from Wikipedia (CC BY-SA).
Built overnight by two founders and a robot. 🤖
