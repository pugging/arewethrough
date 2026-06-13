# Launch Kit — готовые посты и чеклист дистрибуции

*Правило №1: мы не рекламируем сайт — мы отвечаем людям на вопрос, который они уже задали. Максимум 1 пост на сабреддит за турнир; дальше только полезные ответы в чужих тредах.*

---

## A. Reddit — пост для r/worldcup (запостить 14 июня, в спокойный час между матчами)

**Title:**
`I built a free interactive calculator for the new "8 best thirds" math — type any scores, see exactly who advances`

**Body:**
```
The 12-group format means third place in your group can be enough — but only if your
record beats the thirds of ELEVEN other groups, compared by points → goal difference →
goals scored. I kept trying to do this in my head during the Mexico game and gave up.

So I made a calculator: every remaining fixture is an editable score box, the 12 group
tables + the live best-thirds ranking + your team's verdict update as you type. Played
matches are locked as official results.

The part I'm most happy with: your scenario is encoded in the URL — so when someone in
your group chat says "a draw is enough for us", you can send them the exact scenario
where it isn't.

It's free, no signup, no app, no ads. Built it for the last matchdays (June 24-27)
when this gets genuinely impossible to track. Feedback very welcome — especially if
you catch a tiebreaker edge case I got wrong.

https://pugging.github.io/arewethrough/
```

## B. Reddit — шаблон ответа в матч-тредах / daily discussion (главный канал!)

Когда кто-то спрашивает «what do we need to advance?» / «are we through if X?»:
```
Ran your exact scenario here: [ссылка с введёнными счетами — кнопка Share scenario]
If it ends [2-1] and [the other game] is a draw, you're through as best-third #6.
But if [team] wins by 2+, you drop to #9 on goal difference. (Interactive — change
any score to test other outcomes.)
```
**Важно:** сначала текстом дать ОТВЕТ, ссылка — как пруф. Ответы без ответа = спам.

## C. Reddit — страновые сабы (только в дни ИХ последнего тура, 23–27 июня)

r/ussoccer (25.06), r/MexicoNationalTeam (24.06), r/EnglandFootball (27.06), r/ScottishFootball (24.06), r/CanadaSoccer (24.06) и т.д.
**Title:** `Every [USMNT] qualification scenario for Thursday, interactive — change any score and watch the thirds table react`
**Body:** 2 предложения + ссылка на /teams/<страна>/.

## D. X/Twitter — стартовый пост + шаблон ответов

Пост:
```
FIFA made group-stage math impossible this year: 12 groups, 8 best thirds, compared
across the whole tournament.

So we built the calculator we needed: type scores → see who advances → share the
scenario as a link and end the group-chat argument.

Free, no signup: pugging.github.io/arewethrough
```
Шаблон ответа журналистам, постящим таблицы пермутаций: `Interactive version of this — change any score: [scenario link]`

## E. Чеклист заявок (день 1, всё ~1 час)

| Сервис | Зачем | Время | Статус |
|---|---|---|---|
| Google Search Console | sitemap → индексация командных страниц | 5 мин | ☐ |
| Bing Webmaster (импорт из GSC) | Bing/DuckDuckGo трафик | 2 мин | ☐ |
| Google AdSense | реклама к пику 22–27.06 | 15 мин | ☐ |
| Impact.com → NordVPN/Surfshark | $15–40/подписка | 15 мин | ☐ |
| Fanatics/Kitbag affiliate | 5–10% с футболок | 10 мин | ☐ |
| Ko-fi | донаты с первого дня | 10 мин | ☐ |
| GoatCounter | бесплатная аналитика без куки | 10 мин + раскомментировать скрипт в docs/index.html | ☐ |

## F. Ежедневная команда обновления результатов

```bash
cd arewethrough
python3 tools/update_data.py && node tools/build.js && node tools/test_engine.js \
  && git add -A && git commit -m "results $(date +%m-%d)" && git push
```

## G. Метрики, которые смотрим (и ничего больше)
1. Уникальные визиты/день (GoatCounter)
2. Доля заходов с `#m` в URL = работает ли виральная петля шар-ссылок
3. Клики по партнёрским блокам (когда появятся)
4. Позиции по «what does [team] need to advance» (проверять руками 20–22.06)
