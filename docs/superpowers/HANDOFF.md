# System app — handoff (2026-11-09)

Read this first when continuing the work in a new session.

## State
- Branch `ccr-fd37657d-kceuzn` · app v0.2.0 (versionCode 2) · CI green · APK published to release `system-latest`
  (`releases/download/system-latest/System.apk`). Repo is **private** now.
- Engine (pure Kotlin, `system-app/engine`) + Android app (`system-app/app`). 169 tests (engine + Robolectric).
- Plans: `plans/2026-11-08-system-round1.md`, `plans/2026-11-09-system-round1_5.md`. Spec: `specs/2026-11-08-system-design.md`.

## Rules for every change
- No personal data in the repo (names, body numbers, job, money, photos). Personal profile lives in the owner's private doc only.
- Original art/design only (no copying any franchise's art or names).
- TDD for engine/data rules; run `./gradlew :engine:test :app:testDebugUnitTest :app:assembleDebug` before each commit.
- DB changes need a hand-written Room migration + a test like `MigrationTest` (schema exported to `app/schemas`). Users have data on v2.
- Commit trailer: `Co-Authored-By` + `Claude-Session` lines (see git log). No PR unless asked. No model names in commits/code.
- Screens can be rendered for review with `ScreenshotTest` (Robolectric native graphics → `app/build/screens/*.png`).

## Local build setup (fresh container)
1. Android SDK at `/root/android-sdk` (`local.properties` → `sdk.dir`), packages `platforms;android-36`, `build-tools;36.0.0`, `platform-tools`
   via cmdline-tools from dl.google.com (host allowed in the environment).
2. If Maven Central returns 429 for `org.robolectric:android-all-instrumented`, fetch the jar from
   `https://maven-central.storage-download.googleapis.com/maven2/` into `~/.m2/repository/...`.
3. JDK 21 locally is fine (jvmTarget 17 via compilerOptions).

## Backlog — Round 2 (owner asked to finish all; order = priority)
1. Fixes from the owner's real-device testing (ask for their list first).
2. **CORE vs DAILY**: only 6–8 core quests cause a penalty (wake, push-up, squat, journal, sleep, weigh, + penalty quests);
   the rest give a full-clear bonus. Engine: `Quest.core`, DayCloser uses core for penalty.
3. **Rest day**: Sunday = no training volume (boss measurements only). Alternate sit-ups with plank/dead bug (lower back load).
4. **Settings screen**: wake/sleep/meal times, weekly budget, inventory, goal weight, which popups are enabled; re-arm alarms on save.
5. **Hard-mode app lock**: AccessibilityService (or usage polling + overlay) blocks chosen apps until morning/training quests are done;
   never lock phone/SMS/maps/bank/work apps; 2 sick days per month; no paid unlock.
6. **Money penalty (B+C)**: failing a core day adds a "transfer 50–100 ฿ to savings" quest; confirming logs a VAULT deposit.
7. **Flip cover-screen widget** (Glance app widget, small square): level, core quests x/y, next gate/boss, countdown.
8. **Backup/export**: encrypted file export/import (user-chosen password) via SAF; restore on new phone.
9. Work quests (user-configured activity quests: post content, post to N groups, reply messages) — no sales tracking.
10. Finance: 2-tap expense log, daily budget = weekly ÷ 7, 24-h rule wishlist, no-spend day.
11. Calendar: add training/gate windows to the phone calendar (CalendarContract insert intent).
12. Vision Board: receive shared images/links (share intent), shown on STATUS.
13. Known minors: late sleepers vs midnight close; jump counter counts walking; onboarding state on rotation;
    MORNING group label fixed 07:00; phones without proximity sensor can't do the push-up quest.

## New ideas proposed to the owner (pending their pick)
See the chat summary: emergency quests, screen-time boss, posture detector, weekly report card, focus dungeon (deep work),
dumbbell program, skill tree, season pass (90 days), sound/voice, monthly rank exams.
