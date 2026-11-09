# System — Round 1.5 plan (v0.2.0)

Owner choices (2026-11-09): heavier body quests ramping to 200 · one avatar (the player's own) that evolves ·
shop with G cosmetics **and** real rewards (VAULT, TWIN items) · real sleep from Health Connect with a phone-usage
estimate as fallback · new systems: GATE, weekly BOSS, titles & achievements, class change at level 10 ·
new daily challenges: walk after meals + steps, posture correction, screen off 30 min before bed.
No personal data in this repo (public history). Original art only — the quest window takes the "game system
window" genre feel, not any specific franchise's art.

## Rules (engine, pure Kotlin, TDD)

**R1 Training v2** (cumulative over the day, any number of sets; every 5th day 70 % deload; FATIGUED ×0.7):

| | day 1 | day 14 | day 60+ |
|---|---|---|---|
| push-ups | 50 | 100 | 200 |
| squats | 100 | 150 | 200 |
| sit-ups | 50 | 100 | 200 |
| rope (s) | 180 | 300 | 600 |
| steps | 6000 | 7000 | 8000 (day 28+) |

Linear between anchors, rounded. Penalty quest = +50 % of today's push-ups.

**R2 New daily quests:** `situp` (SENSOR, STR) · `steps` (AUTO, AGI, Health Connect/step sensor) ·
`walk_meal` (SENSOR, VIT, target 2 sessions; a session = 800 steps ≈ 10 min) · `posture` (SELF, CHA,
chin tuck + wall angel 3 sets) · `screen_off` (AUTO, MND, no screen-on in [bed−30, bed]).

**R3 Sit-up counter:** phone flat on chest; torso angle from gravity vs the lying reference (calibrated like the
squat). Down < 20°, rep when ≥ 60° then back < 20°; 40–60° then down = Invalid "ขึ้นไม่สุด"; ≥ 900 ms between reps.

**R4 Night analyzer:** input = screen interactive/non-interactive events. Sleep estimate = longest
non-interactive gap that starts between 20:00 and 04:00 and lasts ≥ 3 h. `screen_off` passes if the screen was
never interactive inside [bed−30, bed]. `sleep` passes if sleep start ≤ bed + 30 min. Health Connect sleep
session, when present, overrides the estimate. Result is applied to *yesterday's* board before today's board is
built (so CONDITION uses real hours).

**R5 GATE:** deterministic per day (seed = epochDay). 0–2 gates/day, opening between wake+2 h and bed−2 h,
not within 30 min of each other, 45 min each. Rank from level: L1–4 E, 5–9 D, 10–19 C, 20–29 B, 30+ A.
Tasks from {push-ups, squats, sit-ups, rope seconds}, 2 tasks, volume by rank (E 20/30/20/60 s … ×1.5 per rank).
Gate quests are `GATE` type with an open window; progress only counts inside it; an unfinished gate whose window
has passed is a failure → penalty tomorrow. Clear reward: 15 G × rank multiplier + one drop
(EXP scroll 50 %, rest ticket 20 %, penalty shield 10 %, cosmetic shard 20 %).

**R6 Weekly BOSS (Sunday):** quests `boss_pushup` (one set, sensor, records PUSHUP_MAX), `boss_plank`
(timer, records PLANK_SEC), `weigh` (waist + weight). Damage = 35 per improved LevelGate metric, HP 100;
defeated ⇔ LevelGate.Pass ⇒ LEVEL UP (exp −= expNeeded, level+1). RedFlag shows a warning and no level up.

**R7 Economy:** G from quests (existing). Cosmetics (outfit/weapon/aura) 300–2000 G, some need a stat rank.
VAULT = append-only ledger of deposits (user logs real savings) and redemptions. Real rewards: user-defined
name + price ฿; redeem when VAULT ≥ price; a reward may be TWIN-linked to a cosmetic (redeeming grants it).
Consumables: EXP scroll (next day EXP ×2), rest ticket (skip one day's required quests, no penalty, no reward),
penalty shield (cancel one pending penalty, max 1/month).

**R8 Titles & achievements:** unlocked from day history (streaks of a quest done, totals of reps, gates cleared,
bosses defeated, full clears). One equipped title gives +5 % G. Collection book = distinct menus eaten.

**R9 Class (level 10):** exam = a rank-C gate; class from the highest stat rank (STR นักรบ · VIT ผู้พิทักษ์ ·
AGI นักล่า · CHA ผู้นำแสง · MND นักพรต · INT นักปราชญ์). Class gives +10 % EXP on its stat's quests and an outfit.

**R10 Avatar stage:** stage from waist drop since day 0 and STR rank: 1 start · 2 (−3 cm or STR D) ·
3 (−6 cm or STR C) · 4 (−10 cm and STR B) · 5 (−14 cm and STR A). Equipped cosmetics draw over it.

## App

- DB v2 with a hand-written Migration(1→2) (tested), `exportSchema = true` from now on.
- DaySync: night analysis + steps → complete/progress yesterday/today → ensureBoard; used by MainActivity,
  QuestViewModel and the wake popup.
- Health Connect (sleep sessions, steps) with permission flow; usage access (PACKAGE_USAGE_STATS) for screen events.
- Quest page: one **QUEST INFO** window per category (body · health · look · mind · wisdom, plus penalty/gate/boss
  windows); each has the avatar in that category's pose/prop + aura colour, GOALS rows `[x/y]`, CAUTION line,
  countdown to midnight. Daily popup uses the same window.
- Tabs: STATUS · QUEST · GATE · SHOP · MENU (meal, body, journal, maintenance, records, achievements).
- STATUS: evolving avatar with equipment, title, class, stats; records graphs (weight, waist, push-up max, sleep).
- Release v0.2.0, README, CI release asset.
