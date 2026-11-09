# System — Round 2 plan (v0.3.0)

Source: `docs/superpowers/HANDOFF.md` (backlog + owner picks). Same rules: no personal data, original design, TDD for
engine/data, Room migration with test, commit+push each green slice.

## Engine rules
- **R2.1 CORE**: `Quest.core` = id ∈ {wake, weigh, pushup, squat, journal, sleep} or type ∈ {PENALTY, GATE, EMERGENCY}.
  Penalty only when a core quest fails. Full-clear bonus still needs every required quest.
- **R2.2 Rest day** (Sunday = boss day): no push-up/squat/sit-up/rope/gates; a `mobility` stretch quest instead.
  Sit-ups alternate with a `plank` timer quest on even days (60 s → 180 s by day 60).
- **R2.3 Money penalty (B+C)**: after a failed core day the board adds `penalty_fund` "โอน ฿ เข้าเงินเก็บ":
  50 ฿ (1–2 core misses) or 100 ฿ (3+); confirmed by a VAULT deposit.
- **R2.4 Emergency quest**: deterministic per day, 40 % chance, 60–120 min window between wake+60 and bed−120,
  one task (push-up/squat burst by sensor, rope seconds, wall sit/stairs timer); core while open; reward drop + 20 G.
- **R2.5 Screen-time boss**: entertainment minutes vs cap (default 120); win ⇔ used ≤ cap; HP shown = used/cap.
- **R2.6 Buff/Debuff**: Rested (OPTIMAL sleep, +10 % EXP), Sugar Crash (yesterday no_soda failed, −10 %),
  Night Owl (screen on 00:00–04:00, −5 % and condition one step lower). Multipliers multiply.
- **R2.7 Trust**: score 0–100 (start 70); consistent day +2, contradiction −10. SELF-quest EXP ×1.2 at ≥ 80, ×0.8 at ≤ 40.
  Contradictions: kitchen_close ticked but a meal logged after 21:00; manual sleep tick but screen on > bed+30.
- **R2.8 Skill tree**: 8 skills unlocked by real records, each +5 % EXP for its stat (or unlocks a quest variant).
- **R2.9 Dumbbell program** (5 kg pair): Mon/Wed/Fri `db_curl`, `db_row`, `db_press` 3 sets, reps 10 → 15 over 6 weeks.
- **R2.10 Shadow run**: today's cumulative progress by now vs the same weekday last week by the same time;
  beating last week's daily total in push-ups/squats/steps = +5 G each at day close.
- **R2.11 Story chapters**: original short chapters unlocked by milestones (core streak, level, boss wins) with rewards.
- **R2.12 Weekly report**: completion %, best day, top missed quests, weight/waist change, rule-based advice.

## App
- DB v3: `setting` (key/value), `progress_log`, `expense`. Migration 2→3 + test.
- Settings screen (times, budget, inventory, goal weight, popup toggles, sounds, screen cap + apps, lock apps, work quests).
- Hard-mode lock: AccessibilityService + lock screen activity; morning lock, training lock (from 18:00), penalty lock,
  focus dungeon; never-lock list; 2 sick days per month. Posture check (looking down 15 min) runs in the same service.
- Focus dungeon (25/50 min, INT side quest), system sounds (ToneGenerator, toggle), weekly report popup (Sunday).
- Flip cover/home widget (RemoteViews): level, core x/y, next event, refreshed on sync.
- Encrypted backup/restore (AES-GCM + PBKDF2, SAF file).
- Finance quick log, calendar insert for gates/training, vision board (share target), work quests from settings.
