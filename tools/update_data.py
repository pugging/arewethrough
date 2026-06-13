#!/usr/bin/env python3
"""Fetch latest WC2026 group-stage results from Wikipedia and regenerate site/data.js.

Run any time results change:  python3 tools/update_data.py
Then rebuild team pages:      node tools/build.js
"""
import re, json, time, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = {"User-Agent": "AreWeThrough/1.0 (fan tool; github.com/pugging/arewethrough)"}

# code -> (display name, flag emoji, url slug)
TEAMS = {
    "ALG": ("Algeria", "\U0001F1E9\U0001F1FF", "algeria"),
    "ARG": ("Argentina", "\U0001F1E6\U0001F1F7", "argentina"),
    "AUS": ("Australia", "\U0001F1E6\U0001F1FA", "australia"),
    "AUT": ("Austria", "\U0001F1E6\U0001F1F9", "austria"),
    "BEL": ("Belgium", "\U0001F1E7\U0001F1EA", "belgium"),
    "BIH": ("Bosnia and Herzegovina", "\U0001F1E7\U0001F1E6", "bosnia-and-herzegovina"),
    "BRA": ("Brazil", "\U0001F1E7\U0001F1F7", "brazil"),
    "CAN": ("Canada", "\U0001F1E8\U0001F1E6", "canada"),
    "CIV": ("Ivory Coast", "\U0001F1E8\U0001F1EE", "ivory-coast"),
    "COD": ("DR Congo", "\U0001F1E8\U0001F1E9", "dr-congo"),
    "COL": ("Colombia", "\U0001F1E8\U0001F1F4", "colombia"),
    "CPV": ("Cape Verde", "\U0001F1E8\U0001F1FB", "cape-verde"),
    "CRO": ("Croatia", "\U0001F1ED\U0001F1F7", "croatia"),
    "CUW": ("Curaçao", "\U0001F1E8\U0001F1FC", "curacao"),
    "CZE": ("Czechia", "\U0001F1E8\U0001F1FF", "czechia"),
    "ECU": ("Ecuador", "\U0001F1EA\U0001F1E8", "ecuador"),
    "EGY": ("Egypt", "\U0001F1EA\U0001F1EC", "egypt"),
    "ENG": ("England", "\U0001F3F4\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F", "england"),
    "ESP": ("Spain", "\U0001F1EA\U0001F1F8", "spain"),
    "FRA": ("France", "\U0001F1EB\U0001F1F7", "france"),
    "GER": ("Germany", "\U0001F1E9\U0001F1EA", "germany"),
    "GHA": ("Ghana", "\U0001F1EC\U0001F1ED", "ghana"),
    "HAI": ("Haiti", "\U0001F1ED\U0001F1F9", "haiti"),
    "IRN": ("Iran", "\U0001F1EE\U0001F1F7", "iran"),
    "IRQ": ("Iraq", "\U0001F1EE\U0001F1F6", "iraq"),
    "JOR": ("Jordan", "\U0001F1EF\U0001F1F4", "jordan"),
    "JPN": ("Japan", "\U0001F1EF\U0001F1F5", "japan"),
    "KOR": ("South Korea", "\U0001F1F0\U0001F1F7", "south-korea"),
    "KSA": ("Saudi Arabia", "\U0001F1F8\U0001F1E6", "saudi-arabia"),
    "MAR": ("Morocco", "\U0001F1F2\U0001F1E6", "morocco"),
    "MEX": ("Mexico", "\U0001F1F2\U0001F1FD", "mexico"),
    "NED": ("Netherlands", "\U0001F1F3\U0001F1F1", "netherlands"),
    "NOR": ("Norway", "\U0001F1F3\U0001F1F4", "norway"),
    "NZL": ("New Zealand", "\U0001F1F3\U0001F1FF", "new-zealand"),
    "PAN": ("Panama", "\U0001F1F5\U0001F1E6", "panama"),
    "PAR": ("Paraguay", "\U0001F1F5\U0001F1FE", "paraguay"),
    "POR": ("Portugal", "\U0001F1F5\U0001F1F9", "portugal"),
    "QAT": ("Qatar", "\U0001F1F6\U0001F1E6", "qatar"),
    "RSA": ("South Africa", "\U0001F1FF\U0001F1E6", "south-africa"),
    "SCO": ("Scotland", "\U0001F3F4\U000E0067\U000E0062\U000E0073\U000E0063\U000E0074\U000E007F", "scotland"),
    "SEN": ("Senegal", "\U0001F1F8\U0001F1F3", "senegal"),
    "SUI": ("Switzerland", "\U0001F1E8\U0001F1ED", "switzerland"),
    "SWE": ("Sweden", "\U0001F1F8\U0001F1EA", "sweden"),
    "TUN": ("Tunisia", "\U0001F1F9\U0001F1F3", "tunisia"),
    "TUR": ("Türkiye", "\U0001F1F9\U0001F1F7", "turkiye"),
    "URU": ("Uruguay", "\U0001F1FA\U0001F1FE", "uruguay"),
    "USA": ("United States", "\U0001F1FA\U0001F1F8", "united-states"),
    "UZB": ("Uzbekistan", "\U0001F1FA\U0001F1FF", "uzbekistan"),
}


def fetch_group(letter):
    url = f"https://en.wikipedia.org/w/index.php?title=2026_FIFA_World_Cup_Group_{letter}&action=raw"
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8")


def parse_matches(text):
    blocks = re.split(r"\{\{#invoke:football box\|main", text)[1:]
    out = []
    for b in blocks:
        dm = re.search(r"\|date=\{\{Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})", b)
        date = "%04d-%02d-%02d" % tuple(map(int, dm.groups())) if dm else None
        teams = re.findall(r"\{\{#invoke:flag\|fb(?:-rt)?\|([A-Z]{3})", b)
        sm = re.search(r"\|score=\{\{score link\|[^|]*\|\s*(\d+)\s*[–—-]\s*(\d+)", b)
        if not sm:
            sm = re.search(r"\|score=\s*(\d+)\s*[–—-]\s*(\d+)", b)
        s1, s2 = (int(sm.group(1)), int(sm.group(2))) if sm else (None, None)
        st = re.search(r"\|stadium=\[\[([^\]|]+)", b)
        out.append({"date": date, "t1": teams[0], "t2": teams[1],
                    "s1": s1, "s2": s2, "venue": st.group(1) if st else ""})
    return out


def main():
    matches, groups = [], {}
    for letter in "ABCDEFGHIJKL":
        ms = sorted(parse_matches(fetch_group(letter)), key=lambda m: (m["date"], m["t1"]))
        assert len(ms) == 6, f"group {letter}: expected 6 matches, got {len(ms)}"
        codes = sorted({m["t1"] for m in ms} | {m["t2"] for m in ms})
        assert len(codes) == 4, f"group {letter}: expected 4 teams, got {codes}"
        groups[letter] = codes
        for m in ms:
            m["g"] = letter
            matches.append(m)
        time.sleep(0.3)

    assert len(matches) == 72
    all_codes = {m[k] for m in matches for k in ("t1", "t2")}
    missing = all_codes - set(TEAMS)
    assert not missing, f"unknown team codes: {missing}"

    matches.sort(key=lambda m: (m["date"], m["g"]))
    for i, m in enumerate(matches):
        m["id"] = i

    teams_js = {c: {"name": n, "flag": f, "slug": s, "g": next(g for g, cs in groups.items() if c in cs)}
                for c, (n, f, s) in TEAMS.items()}

    data = {"updated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
            "groups": groups, "teams": teams_js, "matches": matches}
    out = ROOT / "docs" / "data.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("// Generated by tools/update_data.py — do not edit by hand\n"
                   "const WC = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    played = sum(1 for m in matches if m["s1"] is not None)
    print(f"OK: 72 matches, {played} played, data.js written ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
