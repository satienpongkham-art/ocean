# System — Round 1 (Daily Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an installable Android APK that runs the daily game loop: onboarding, daily quest board, status, full-screen System popups, sensor rep counting (push-up, squat, jump rope), body/water logging, meal plan + meal-time popup, maintenance, journal, styled in theme A/C.

**Architecture:** Two Gradle modules under `system-app/`: `engine` (pure Kotlin/JVM, all game rules, fully unit-tested, no Android imports) and `app` (Android, Jetpack Compose UI, Room persistence, AlarmManager scheduling, SensorManager). `app` depends on `engine`. GitHub Actions runs engine tests and builds a debug APK artifact on every push.

**Tech Stack:** Kotlin 2.2, Gradle 8.14 (Kotlin DSL + version catalog), Android Gradle Plugin 8.12, Jetpack Compose (BOM), Navigation Compose, Room + KSP, Compose Google Fonts, JUnit 4, Robolectric (DAO tests).

**Spec:** `docs/superpowers/specs/2026-11-08-system-design.md` (this plan implements §19 "รอบ 1"; read §4–§8, §10.2, §11, §15 before starting).

## Global Constraints

- Android only · `minSdk 28` · `compileSdk 36` · `targetSdk 36` · applicationId `com.lifesystem.app` · engine package `com.lifesystem.engine`.
- No personal data in the repo (names, weights, money, job). Defaults only; real values come from onboarding and live only on the device.
- No network calls from the app in Round 1. No camera rep counting.
- UI copy: Thai body text; system headers in English game style exactly as in spec §15.2 (`[ DAILY QUEST ]`, `[ PENALTY QUEST ]`, `[ MEAL TIME ]`, `[ LEVEL UP ]`, `[ LIMIT ]`, `[ ACCESS DENIED ]`, `[ WARNING ]`). Stats are shown only as `STR VIT AGI CHA MND INT`. Player is addressed as "ผู้เล่น". Never "ลองดู" / "ถ้าไหว".
- Colors (spec §15.1): background `#03050A`, cyan `#4FD8FF`, blue `#2E7BFF`, crimson `#FF2E4D`, emergency orange `#FFB547`, hidden purple `#B49CFF`, meal/reward gold `#FFC857`, success mint `#5CFFC1`; stat colors STR `#FF8F6B` VIT `#5CFFC1` AGI `#FFE066` CHA `#FF9AD5` MND `#B49CFF` INT `#6BB6FF`.
- Fonts: Oxanium (numbers/system headers), Chakra Petch (Thai), JetBrains Mono (system code) via Compose Google Fonts provider.
- Flashing effects ≤ 3 flashes per second; all animation disabled when the system "remove animations" setting is on.
- No emoji in UI. Touch targets ≥ 44 dp.
- Every food number is labelled as an estimate (`≈`, "ค่าประมาณ ±20%").
- Commits end with the session attribution lines; work on branch `ccr-fd37657d-kceuzn`.

## Review Focus

1. **Day changes while the app is dead** (phone off overnight, app killed): opening the app must create today's board exactly once, and mark yesterday's unfinished main quests as failed. → Task 5 test `ensureBoard_isIdempotent_andClosesPreviousDay`.
2. **Missing Day 0 measurements** (user skips waist or push-up test): stats show `?`, the level gate ignores missing metrics instead of crashing or passing. → Task 2/3 tests `gate_ignoresMissingMetrics`, `rank_unknownWhenNoMeasurement`.
3. **Device without a sensor / phone not placed correctly** (no proximity sensor, phone lifted, shaking): counters count nothing and report the reason. → Task 7 tests `pushup_liftedPhone_isInvalid`, `jump_shakeTooFast_notCounted`, and `CounterFactory` returning `Unsupported`.
4. **Exact-alarm permission denied or clock/time-zone changed**: popups still fire (inexact fallback) and the app warns; alarms are recomputed on `TIME_SET`/`TIMEZONE_CHANGED`/boot. → Task 10 test `nextTrigger_rollsToTomorrowAfterTime` and `scheduleMode_fallsBackWhenExactDenied`.
5. **Meal planner with no combination inside budget**: returns `null` and the UI shows the over-budget hint instead of crashing. → Task 6 test `bestPlan_returnsNullWhenNothingFitsBudget`.

---

## File Structure

```
.github/workflows/system-app.yml            CI: engine tests + debug APK artifact
system-app/
  settings.gradle.kts  build.gradle.kts  gradle.properties
  gradle/libs.versions.toml  gradle/wrapper/*  gradlew
  README.md                                  Thai install guide
  engine/build.gradle.kts
  engine/src/main/kotlin/com/lifesystem/engine/
    model/Model.kt            enums + data classes shared by everything
    progression/Progression.kt   EXP curve, Condition, LevelGate
    stats/StatRanks.kt        STR/VIT/AGI/INT/score→rank tables, overall rank
    training/TrainingProgram.kt  daily volumes, sets, Z2 weekly minutes
    quest/BoardGenerator.kt   daily board + rewards + chain quests
    quest/DayCloser.kt        close previous day, penalty decision
    nutrition/Nutrition.kt    TDEE, targets
    nutrition/MenuCatalog.kt  seed menu (Thai à-la-carte + 7-Eleven)
    nutrition/MealPlanner.kt  best plan, leftover
    maintenance/Maintenance.kt   routines, durability, due list
    sensors/RepCounters.kt    push-up, squat, jump counters (pure)
  engine/src/test/kotlin/com/lifesystem/engine/...   one test file per main file
  app/build.gradle.kts
  app/src/main/AndroidManifest.xml
  app/src/main/java/com/lifesystem/app/
    SystemApp.kt  MainActivity.kt  Nav.kt
    data/  Db.kt  Entities.kt  Daos.kt  Repository.kt
    ui/theme/  Theme.kt  Type.kt
    ui/components/  SystemFrame.kt  HudBar.kt  SystemButton.kt  PixelSprite.kt  Sprites.kt
    ui/onboarding/  OnboardingScreen.kt  OnboardingViewModel.kt
    ui/status/  StatusScreen.kt
    ui/quest/  QuestLogScreen.kt  QuestViewModel.kt
    ui/training/  TrainingScreen.kt  RepService.kt  SensorSource.kt
    ui/meal/  MealPlanScreen.kt
    ui/log/  BodyLogScreen.kt  JournalScreen.kt  MaintenanceScreen.kt
    popup/  PopupActivity.kt  PopupScreens.kt
    schedule/  AlarmScheduler.kt  AlarmReceiver.kt  BootReceiver.kt
  app/src/test/java/com/lifesystem/app/   Robolectric + scheduler tests
```

---

### Task 1: Project scaffold, CI, and a green build

**Files:**
- Create: everything under `system-app/` listed above except feature files (only `SystemApp.kt`, `MainActivity.kt` showing a "SYSTEM ONLINE" text), `engine/src/main/kotlin/com/lifesystem/engine/model/Model.kt` (empty object `EngineInfo { const val VERSION = "0.1.0" }`), `engine/src/test/.../EngineInfoTest.kt`, `.github/workflows/system-app.yml`, `system-app/.gitignore`

**Interfaces:**
- Produces: `./gradlew :engine:test` and `./gradlew :app:assembleDebug` commands used by every later task; APK at `system-app/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 1:** Write `EngineInfoTest.version_isSet()` asserting `EngineInfo.VERSION == "0.1.0"`.
- [ ] **Step 2:** Create the Gradle files. Version catalog pins: `agp = "8.12.0"`, `kotlin = "2.2.0"`, `ksp = "2.2.0-2.0.2"`, `composeBom = "2025.07.00"`, `room = "2.7.2"`, `navigation = "2.9.2"`, `activityCompose = "1.10.1"`, `lifecycle = "2.9.2"`, `robolectric = "4.15.1"`, `junit = "4.13.2"`. If a pinned version fails to resolve, pick the nearest released version and note it in the commit message. `engine` uses `kotlin("jvm")` with `jvmToolchain(17)`; `app` uses `com.android.application`, `org.jetbrains.kotlin.android`, `org.jetbrains.kotlin.plugin.compose`, `com.google.devtools.ksp`. Generate the wrapper with `gradle wrapper --gradle-version 8.14.3`.
- [ ] **Step 3:** Run `cd system-app && ANDROID_HOME=$HOME/android-sdk ./gradlew :engine:test :app:assembleDebug` → BUILD SUCCESSFUL, test passes, APK exists.
- [ ] **Step 4:** CI workflow: on push to any branch with changes under `system-app/**` or the workflow file; `actions/setup-java` (Temurin 17), `android-actions/setup-android`, run the same command, upload `app-debug.apk` as artifact `system-app-debug`.
- [ ] **Step 5:** Commit `chore(system-app): scaffold engine + app modules with CI`.

---

### Task 2: Progression — EXP curve, Condition, Level gate

**Files:**
- Modify: `engine/.../model/Model.kt`
- Create: `engine/.../progression/Progression.kt`, test `progression/ProgressionTest.kt`

**Interfaces:**
- Produces:
  - `enum class Condition { OPTIMAL, NORMAL, FATIGUED }`
  - `data class Metrics(val weightAvg7: Double?, val waistCm: Double?, val pushupMax: Int?, val plankSec: Int?, val ropeSec: Int?, val sleepAvg7h: Double?, val weightAvg7PrevWeek: Double?)`
  - `object Progression { fun expNeeded(level: Int): Int; fun expCap(level: Int): Int; fun conditionFromSleep(hours: Double?): Condition; fun conditionMultiplier(c: Condition): Double; fun expBonus(c: Condition): Double }`
  - `sealed interface GateResult { data class Pass(val improved: List<String>) ; data class NotEnoughExp(val missing: Int); data object NoImprovement; data class RedFlag(val reason: String) }`
  - `object LevelGate { fun evaluate(level: Int, exp: Int, best: Metrics, now: Metrics): GateResult }`

- [ ] **Step 1: Failing tests** (values from spec §4.1–4.3):

```kotlin
@Test fun expNeeded_followsCurve() { assertEquals(500, Progression.expNeeded(1)); assertEquals(650, Progression.expNeeded(2)); assertEquals(1850, Progression.expNeeded(10)) }
@Test fun expCap_is150Percent() { assertEquals(750, Progression.expCap(1)) }
@Test fun condition_fromSleep() { assertEquals(OPTIMAL, conditionFromSleep(7.5)); assertEquals(NORMAL, conditionFromSleep(7.0)); assertEquals(FATIGUED, conditionFromSleep(6.4)); assertEquals(NORMAL, conditionFromSleep(null)) }
@Test fun multipliers() { assertEquals(0.7, conditionMultiplier(FATIGUED), 1e-9); assertEquals(0.10, expBonus(OPTIMAL), 1e-9) }
@Test fun gate_passesOnWaistDrop() { /* best.waist 102.0, now 100.9, exp 500 at L1 */ assertTrue(r is Pass && "waist" in r.improved) }
@Test fun gate_waistDropBelowNoise_noImprovement() { /* 102.0 -> 101.2 */ assertEquals(NoImprovement, r) }
@Test fun gate_thresholds() { /* weight −0.3, pushup +1, plank +5, rope +10 each alone → Pass */ }
@Test fun gate_needsExp() { /* exp 499 at L1 */ assertEquals(NotEnoughExp(1), r) }
@Test fun gate_redFlag_fastWeightLoss() { /* weightAvg7PrevWeek 90.0, weightAvg7 88.6 (1.56%) */ assertTrue(r is RedFlag) }
@Test fun gate_redFlag_sleep() { /* sleepAvg7h 5.9 */ assertTrue(r is RedFlag) }
@Test fun gate_ignoresMissingMetrics() { /* best all null except pushup 10; now pushup 11 */ assertTrue(r is Pass) }
```

- [ ] **Step 2:** Run `./gradlew :engine:test --tests '*ProgressionTest*'` → FAIL (unresolved).
- [ ] **Step 3:** Implement. `expNeeded(L) = 500 + 150*(L-1)`; cap = `expNeeded*1.5`. Thresholds: waist −1.0 cm, weight −0.3 kg, push-up +1, plank +5 s, rope +10 s. Red flags checked before improvements: weekly loss > 1.5 % of `weightAvg7PrevWeek`, `sleepAvg7h < 6.0`. A metric counts only if both `best` and `now` are non-null.
- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat(engine): EXP curve, condition, weekly level gate`.

---

### Task 3: Stat ranks

**Files:**
- Create: `engine/.../stats/StatRanks.kt`, test `stats/StatRanksTest.kt`

**Interfaces:**
- Produces: `enum class Rank { E, D, C, B, A, S, UNKNOWN }` (in Model.kt); `object StatRanks { fun str(pushupMax: Int?): Rank; fun vit(waistCm: Double?, heightCm: Double, strRank: Rank): Rank; fun agi(ropeSec: Int?): Rank; fun int(cefr: String?): Rank; fun fromScore(score0to100: Int?): Rank; fun overall(ranks: List<Rank>): Rank; fun whtr(waistCm: Double, heightCm: Double): Double }`

- [ ] **Step 1: Failing tests** (spec §4.3; v1 uses the CSEP male 20–29 table for every profile — decision recorded in KDoc):

```kotlin
@Test fun str_bands() { assertEquals(E, str(16)); assertEquals(D, str(17)); assertEquals(C, str(28)); assertEquals(B, str(29)); assertEquals(A, str(36)); assertEquals(S, str(50)); assertEquals(UNKNOWN, str(null)) }
@Test fun vit_bands() { /* height 184: waist 110.4→0.60 E; 102→0.554 D; 95→0.516 C; 90→0.489 B; 82→0.446 with STR B → A; 82 with STR C → B */ }
@Test fun agi_bands() { assertEquals(E, agi(59)); assertEquals(D, agi(60)); assertEquals(C, agi(120)); assertEquals(B, agi(300)); assertEquals(A, agi(600)); assertEquals(S, agi(900)) }
@Test fun int_cefr() { assertEquals(E, int("A1")); assertEquals(S, int("C2")); assertEquals(UNKNOWN, int(null)) }
@Test fun fromScore() { assertEquals(E, fromScore(19)); assertEquals(D, fromScore(20)); assertEquals(S, fromScore(100)) }
@Test fun overall_isMedian_andSNeedsAllA() { assertEquals(C, overall(listOf(E,D,C,C,B,A))); assertEquals(A, overall(listOf(S,S,S,S,S,A))); assertEquals(S, overall(listOf(S,S,S,S,S,S))); assertEquals(A, overall(listOf(S,S,S,S,S,B))) }
@Test fun rank_unknownWhenNoMeasurement() { assertEquals(UNKNOWN, overall(listOf(UNKNOWN,UNKNOWN,UNKNOWN,UNKNOWN,UNKNOWN,UNKNOWN))) }
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Score bands for `fromScore`: E 0–19, D 20–39, C 40–59, B 60–79, A 80–94, S 95–100. `overall`: ignore UNKNOWN; median of known ranks (lower middle on even count); return S only if every known rank ≥ A and median is S, else cap at A; all unknown → UNKNOWN. VIT bands: E ≥0.60, D 0.55–0.599, C 0.50–0.549, B 0.45–0.499, A <0.45 only when `strRank >= B` else B.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): stat rank tables and overall rank`.

---

### Task 4: Training program

**Files:**
- Create: `engine/.../training/TrainingProgram.kt`, test `training/TrainingProgramTest.kt`

**Interfaces:**
- Produces: `object TrainingProgram { fun pushupTotal(day: Int): Int; fun squatTotal(day: Int): Int; fun ropeSeconds(day: Int): Int; fun scaled(total: Int, c: Condition): Int; fun sets(total: Int, maxPerSet: Int): List<Int>; fun zone2WeeklyMinutes(week: Int): Int; fun readingPages(day: Int): Int; fun englishMinutes(day: Int): Int }`

- [ ] **Step 1: Failing tests:**

```kotlin
@Test fun pushup_day1_is10_day30_is100() { assertEquals(10, pushupTotal(1)); assertEquals(100, pushupTotal(30)) }
@Test fun pushup_deloadEvery5thDay() { assertTrue(pushupTotal(5) < pushupTotal(4)); assertTrue(pushupTotal(6) > pushupTotal(4)) }
@Test fun pushup_afterDay30_holds100() { assertEquals(100, pushupTotal(45)) }
@Test fun squat_isDoublePushupCapped150() { assertEquals(20, squatTotal(1)); assertEquals(150, squatTotal(30)) }
@Test fun rope() { assertEquals(90, ropeSeconds(1)); assertEquals(600, ropeSeconds(200)) }
@Test fun scaled_fatigued_rounded() { assertEquals(7, scaled(10, FATIGUED)); assertEquals(10, scaled(10, NORMAL)) }
@Test fun sets_split() { assertEquals(listOf(5,5), sets(10, 6)); assertEquals(listOf(20,20,20,20,20), sets(100, 20)) }
@Test fun zone2() { assertEquals(listOf(60,80,100,120,140,150,150), (1..7).map { zone2WeeklyMinutes(it) }) }
@Test fun learning() { assertEquals(5, readingPages(1)); assertEquals(20, readingPages(60)); assertEquals(15, englishMinutes(1)); assertEquals(30, englishMinutes(60)) }
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Push-up: `base = round(10 + 90*(day-1)/29.0)` for day ≤ 30, 100 after; days where `day % 5 == 0 && day < 30` use `round(base*0.7)`. Squat `min(2*pushup, 150)`. Rope `min(90 + 10*(day-1), 600)`. `scaled` uses `Math.round(total * multiplier)`. `sets` splits into the fewest sets ≤ max, as even as possible, larger first. Reading `min(5 + (day-1)/2, 20)`; English `min(15 + (day-1)/2, 30)`.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): training and learning progression`.

---

### Task 5: Daily quest board and day closing

**Files:**
- Modify: `engine/.../model/Model.kt`
- Create: `engine/.../quest/BoardGenerator.kt`, `engine/.../quest/DayCloser.kt`, tests `quest/BoardGeneratorTest.kt`, `quest/DayCloserTest.kt`

**Interfaces:**
- Consumes: `TrainingProgram`, `Progression.conditionMultiplier`, `Condition`, `MaintenanceRoutine` + `Maintenance.due` (Task 8 — if Task 8 is not done yet, accept `maintenanceDue: List<String>` of routine ids; that is the parameter type here).
- Produces (Model.kt):
  - `enum class QuestType { DAILY_MAIN, DAILY_SIDE, PENALTY, MAINTENANCE, CHAIN }`
  - `enum class Verify { SENSOR, AUTO, NUMBER, PHOTO, SELF }`
  - `enum class Group { MORNING, DAY, TRAINING, NIGHT }`
  - `enum class Stat { STR, VIT, AGI, CHA, MND, INT, GOLD }`
  - `data class Quest(val id: String, val title: String, val stat: Stat, val type: QuestType, val group: Group, val verify: Verify, val target: Int, val unit: String, val exp: Int, val gold: Int)`
  - `data class Inventory(val hasSunscreen: Boolean, val hasTapeMeasure: Boolean, val hasArmband: Boolean)`
  - `object BoardGenerator { fun generate(dayNumber: Int, condition: Condition, inventory: Inventory, maintenanceDue: List<String>, penaltyPending: Boolean): List<Quest>; const val FULL_CLEAR_GOLD = 10 }`
  - `data class DayResult(val mainDone: Int, val mainTotal: Int, val failed: List<String>, val penaltyTomorrow: Boolean, val goldEarned: Int, val expEarned: Int)`
  - `object DayCloser { fun close(quests: List<Quest>, progress: Map<String, Int>): DayResult }`

- [ ] **Step 1: Failing tests:**

```kotlin
@Test fun day1_containsSpecMainQuests() { val ids = generate(1, NORMAL, inv(sunscreen = true), emptyList(), false).filter { it.type == DAILY_MAIN }.map { it.id }
  assertTrue(ids.containsAll(listOf("wake","weigh","skincare","no_soda","read","english","pushup","squat","journal","sleep"))) }
@Test fun day1_pushupTarget10_squat20() { /* targets from TrainingProgram */ }
@Test fun fatigued_scalesTraining() { /* pushup target 7 at day1 FATIGUED */ }
@Test fun noSunscreen_addsChainBuyQuest() { /* id "buy_sunscreen" type CHAIN replaces "skincare" sunscreen step; title contains "SPF 30" */ }
@Test fun maintenanceDue_addsMaintenanceQuests() { /* due ["nails_hand"] → quest id "mt_nails_hand" type MAINTENANCE */ }
@Test fun penaltyPending_addsPenaltyQuest() { /* id "penalty" type PENALTY verify SENSOR target = pushupTotal(day)/2 extra */ }
@Test fun rewards() { /* each DAILY_MAIN gold 4, exp in 20..40; DAILY_SIDE gold 0..2, exp 10..20 */ }
@Test fun sameInputs_sameBoard() { assertEquals(generate(3,...), generate(3,...)) }
@Test fun close_allMainDone_givesFullClearBonus() { /* gold = 4*mainTotal + 10, penaltyTomorrow false */ }
@Test fun close_missingMain_setsPenalty() { /* one main short → penaltyTomorrow true, failed contains its id */ }
@Test fun close_partialProgressCountsAsNotDone() { /* pushup 9/10 → failed */ }
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Side quests: `water` (2500 ml, VIT), `rope` (TRAINING, AGI, `ropeSeconds`), `kitchen_close` (NIGHT, VIT, SELF), `budget` (DAY, GOLD, NUMBER). Titles in Thai (e.g. "วิดพื้น", "ทากันแดด", "ไม่มีน้ำอัดลมหวาน"). Penalty quest adds `pushupTotal(day)/2` extra push-ups + 20 squats, PENALTY type, crimson in UI. Deterministic: no randomness in Round 1.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): daily quest board and day closing`.

---

### Task 6: Nutrition and meal planner

**Files:**
- Create: `engine/.../nutrition/Nutrition.kt`, `MenuCatalog.kt`, `MealPlanner.kt`, tests `nutrition/NutritionTest.kt`, `nutrition/MealPlannerTest.kt`

**Interfaces:**
- Produces:
  - `enum class Sex { MALE, FEMALE }`; `enum class MealSlot { BREAKFAST, LUNCH, DINNER, SNACK }`
  - `data class MenuItem(val id: String, val slot: MealSlot, val name: String, val order: String, val kcal: Int, val protein: Int, val price: Int, val sprite: String)` — sprite ∈ `kapao`, `tomyum`, `bfast`, `snack`
  - `object Nutrition { fun bmr(sex: Sex, weightKg: Double, heightCm: Double, age: Int): Double; fun tdee(bmr: Double, activity: Double = 1.375): Double; fun kcalTarget(tdee: Double): Int; fun proteinTarget(weightKg: Double, goalWeightKg: Double?): Int; const val WATER_ML_DEFAULT = 2500 }`
  - `object MenuCatalog { val items: List<MenuItem> }` (≥ 3 breakfast, ≥ 4 lunch, ≥ 4 dinner, ≥ 3 snack; values from the mockup MEAL PLAN board)
  - `data class DayPlan(val picks: Map<MealSlot, MenuItem>) { val kcal: Int; val protein: Int; val price: Int }`
  - `object MealPlanner { fun best(items: List<MenuItem>, kcalTarget: Int, dailyBudget: Int): DayPlan?; fun score(plan: DayPlan, kcalTarget: Int): Double }`

- [ ] **Step 1: Failing tests:**

```kotlin
@Test fun bmr_mifflin() { assertEquals(1930.0, bmr(MALE, 90.0, 184.0, 25), 1.0) }
@Test fun targets() { assertEquals(2154, kcalTarget(tdee(1930.0))) /* 1930*1.375-500 rounded */ ; assertEquals(144, proteinTarget(90.0, 80.0)) /* 1.8 g/kg of goal weight */ }
@Test fun catalog_hasEverySlot() { MealSlot.values().forEach { s -> assertTrue(MenuCatalog.items.count { it.slot == s } >= 3) } }
@Test fun bestPlan_respectsBudget_andPrefersProtein() { val p = best(MenuCatalog.items, 2150, 285)!!; assertTrue(p.price <= 285); assertEquals(4, p.picks.size) }
@Test fun bestPlan_returnsNullWhenNothingFitsBudget() { assertNull(best(MenuCatalog.items, 2150, 100)) }
@Test fun score_formula() { /* plan kcal 2000 protein 140 price 270, target 2150 → 3*140 - 0.4*|2000-2000| - 0.2*270 = 366.0 */ }
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Mifflin-St Jeor: male `10w + 6.25h − 5a + 5`, female `… − 161`. `kcalTarget = round(tdee − 500)`. Protein `round(1.8 × (goalWeight ?: weight))`. `score = 3·protein − 0.4·|(kcalTarget − 150) − kcal| − 0.2·price`; `best` enumerates all one-per-slot combinations with `price ≤ budget`, highest score wins, ties → lower price.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): nutrition targets, menu catalog, meal planner`.

---

### Task 7: Rep counters (push-up, squat, jump)

**Files:**
- Create: `engine/.../sensors/RepCounters.kt`, test `sensors/RepCountersTest.kt`

**Interfaces:**
- Produces:
  - `sealed interface RepEvent { data class Rep(val count: Int) : RepEvent; data class Invalid(val reason: String) : RepEvent }`
  - `class PushupCounter { fun onProximity(tMs: Long, near: Boolean): RepEvent?; fun onAccel(tMs: Long, x: Float, y: Float, z: Float): RepEvent?; val count: Int }`
  - `class SquatCounter(downDeg: Float = 70f) { fun onThighAngle(tMs: Long, deg: Float): RepEvent?; val count: Int }` (angle from vertical, 0 = standing)
  - `class JumpCounter { fun onAccel(tMs: Long, x: Float, y: Float, z: Float): RepEvent?; val count: Int }`
  - `enum class Exercise { PUSHUP, SQUAT, ROPE }` and `object CounterFactory { fun availability(exercise: Exercise, hasProximity: Boolean, hasAccel: Boolean): Availability }` with `enum class Availability { OK, UNSUPPORTED }`

- [ ] **Step 1: Failing tests** with synthetic traces (helper builds sample lists):

```kotlin
@Test fun pushup_nearFarCycles_count() { /* 5 cycles near(400ms) far(900ms), phone still → count 5 */ }
@Test fun pushup_tooFastBounce_notCounted() { /* cycle interval 300 ms → not counted */ }
@Test fun pushup_liftedPhone_isInvalid() { /* accel magnitude deviates > 2.5 m/s² from g during cycle → Invalid("ยกมือถือ") and no count */ }
@Test fun squat_fullDepth_counts() { /* 0→80→0 deg, 2 s each rep ×3 → 3 */ }
@Test fun squat_halfDepth_invalid() { /* 0→50→0 → Invalid("ลงไม่สุด"), count 0 */ }
@Test fun jump_rhythm_counts() { /* peaks 15 m/s² at 2 Hz for 10 s → 20 ± 1 */ }
@Test fun jump_shakeTooFast_notCounted() { /* peaks at 8 Hz → 0 */ }
@Test fun availability() { assertEquals(UNSUPPORTED, availability(PUSHUP, hasProximity = false, hasAccel = true)) }
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Push-up: count on near→far when previous rep ≥ 600 ms ago and ≤ 6000 ms since the near edge; track max |‖a‖ − 9.81| during the cycle, > 2.5 → Invalid. Squat: state machine STANDING (< 25°) → DOWN (≥ downDeg) → STANDING counts; reaching 40°–downDeg and returning → Invalid; min rep interval 800 ms. Jump: low-pass ‖a‖, peak when > adaptive threshold (running mean + 0.6·running std, floor 12 m/s²), refractory 250 ms; accept only if instantaneous rate 1–4 Hz.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): sensor rep counters with anti-cheat`.

---

### Task 8: Maintenance routines

**Files:**
- Create: `engine/.../maintenance/Maintenance.kt`, test `maintenance/MaintenanceTest.kt`

**Interfaces:**
- Produces: `data class MaintenanceRoutine(val id: String, val title: String, val intervalDays: Int)`; `object Maintenance { val defaults: List<MaintenanceRoutine>; fun durability(lastDoneEpochDay: Long?, todayEpochDay: Long, intervalDays: Int): Double; fun due(routines: List<MaintenanceRoutine>, lastDone: Map<String, Long>, todayEpochDay: Long): List<String>; const val DUE_AT = 0.15 }`

- [ ] **Step 1: Failing tests:** defaults include `nails_hand` 10, `nails_foot` 28, `haircut` 28, `pillowcase` 7, `bedsheet` 14, `laundry_room` 7, `toothbrush` 105, `dental` 180, `nose_brow` 21, `shave` 2 (spec §10.2, using the upper bound of each range except shave/toothbrush); `durability(null, …) == 0.0`; `durability(d, d+5, 10) == 0.5`; clamps at 0; `due` returns ids with durability ≤ 0.15.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement (pure arithmetic; daily routines like brushing are board quests, not maintenance).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(engine): maintenance routines and durability`.

---

### Task 9: Data layer (Room) and repository

**Files:**
- Create: `app/.../data/Entities.kt`, `Daos.kt`, `Db.kt`, `Repository.kt`, test `app/src/test/.../data/RepositoryTest.kt` (Robolectric, in-memory DB)

**Interfaces:**
- Consumes: engine `Quest`, `DayResult`, `BoardGenerator`, `DayCloser`, `Maintenance`, `Progression`.
- Produces:
  - Entities: `ProfileEntity(id=1, name, age, sex, heightCm, wakeMin, sleepMin, mealTimes:String, weeklyBudget, day0EpochDay, inventoryJson)`, `QuestEntity(epochDay, questId, json, progress, done)` PK(epochDay, questId), `DayEntity(epochDay PK, condition, closed, goldEarned, expEarned, penaltyTomorrow)`, `MeasurementEntity(id auto, type, value, tMs)`, `MealLogEntity(id auto, epochDay, slot, menuId, kcal, protein, price)`, `MaintenanceEntity(routineId PK, lastDoneEpochDay)`, `JournalEntity(epochDay PK, text, emotion)`, `WalletEntity(id=1, exp, level, gold)`
  - `class Repository(db: SystemDb, clock: () -> Long) { suspend fun ensureBoard(todayEpochDay: Long): List<QuestEntity>; suspend fun addProgress(epochDay: Long, questId: String, amount: Int); fun board(epochDay: Long): Flow<List<QuestEntity>>; suspend fun logMeasurement(type: String, value: Double); suspend fun wallet(): WalletEntity; … }`

- [ ] **Step 1: Failing tests:**

```kotlin
@Test fun ensureBoard_createsOnce() { /* call twice → same rows, size equals BoardGenerator output */ }
@Test fun ensureBoard_isIdempotent_andClosesPreviousDay() { /* day 1 board, pushup progress 4/10, ensureBoard(day 2) → day 1 closed with penaltyTomorrow=true, day 2 contains "penalty" */ }
@Test fun addProgress_capsAtTarget_andMarksDone() { /* +15 on target 10 → progress 10, done */ }
@Test fun closingAwardsExpAndGold() { /* all main done day 1 → wallet gold = 4*mainTotal+10 */ }
```

- [ ] **Step 2:** Run `./gradlew :app:testDebugUnitTest --tests '*RepositoryTest*'` → FAIL.
- [ ] **Step 3:** Implement. `ensureBoard` closes every unclosed earlier day (in order) with `DayCloser`, applies rewards to `WalletEntity`, then generates today using day number `today − day0 + 1`, condition from the latest sleep measurement, and `Maintenance.due`. Quest list stored as JSON (kotlinx.serialization or Moshi — pick kotlinx.serialization and add the plugin).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(app): Room data layer and repository`.

---

### Task 10: Scheduler and full-screen System popups

**Files:**
- Create: `app/.../schedule/AlarmScheduler.kt`, `AlarmReceiver.kt`, `BootReceiver.kt`, `app/.../popup/PopupActivity.kt`, `PopupScreens.kt`, test `app/src/test/.../schedule/AlarmSchedulerTest.kt`
- Modify: `AndroidManifest.xml` (permissions §17.4 subset: `POST_NOTIFICATIONS`, `USE_FULL_SCREEN_INTENT`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE`; receivers for `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED`; `PopupActivity` with `showWhenLocked`, `turnScreenOn`, `excludeFromRecents`)

**Interfaces:**
- Consumes: `ProfileEntity` (wake time, meal times, sleep time), Task 11 components.
- Produces:
  - `enum class PopupKind { DAILY_QUEST, PENALTY, MEAL, SLEEP_REMINDER }`
  - `object AlarmMath { fun nextTrigger(nowMs: Long, minuteOfDay: Int, zone: ZoneId): Long }`
  - `class AlarmScheduler(ctx) { fun scheduleAll(profile: ProfileEntity); fun mode(): ScheduleMode }` with `enum class ScheduleMode { EXACT, INEXACT_FALLBACK }`
  - Intent extra `"popup_kind"` (+ `"meal_slot"` for MEAL)

- [ ] **Step 1: Failing tests:**

```kotlin
@Test fun nextTrigger_laterToday() { /* now 06:00 Asia/Bangkok, 07:00 → today 07:00 */ }
@Test fun nextTrigger_rollsToTomorrowAfterTime() { /* now 07:00:01 → tomorrow 07:00 */ }
@Test fun scheduleMode_fallsBackWhenExactDenied() { /* Robolectric: canScheduleExactAlarms=false → INEXACT_FALLBACK and setWindow used */ }
@Test fun scheduleAll_setsWakeMealsAndSleepReminder() { /* 1 + mealTimes.size + 1 alarms registered */ }
```

- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Daily quest at wake time (penalty kind if yesterday set `penaltyTomorrow`), meals at configured times, sleep reminder 30 min before sleep time. `AlarmReceiver` posts a high-importance notification (channel `system_popup`) with `setFullScreenIntent` to `PopupActivity`, then reschedules the same alarm for tomorrow. `PopupActivity` renders: DAILY_QUEST (style A, list of main quests, accept button, no decline — "ไม่มีตัวเลือกนี้ในโหมดโหด"), PENALTY (style C, flashing ≤ 1 Hz), MEAL (gold, sprite, name, `≈kcal`, protein, price, "พูดกับร้านว่า", buttons กินตามนี้ / สลับเมนู / กินอย่างอื่น), SLEEP_REMINDER. Boot/time receivers call `scheduleAll`.
- [ ] **Step 4:** Run tests → PASS; `./gradlew :app:assembleDebug` → SUCCESS.
- [ ] **Step 5:** Commit `feat(app): alarm scheduling and full-screen System popups`.

---

### Task 11: Design system (theme A/C and HUD components)

**Files:**
- Create: `app/.../ui/theme/Theme.kt`, `Type.kt`, `ui/components/SystemFrame.kt`, `HudBar.kt`, `SystemButton.kt`, `PixelSprite.kt`, `Sprites.kt`, `res/values/font_certs.xml`

**Interfaces:**
- Produces:
  - `object SysColors` (all Global Constraints colors), `@Composable fun SystemTheme(content: @Composable () -> Unit)`, `val Oxanium, ChakraPetch, JetBrainsMono: FontFamily`
  - `@Composable fun SystemFrame(accent: Color = SysColors.Cyan, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit)` — panel with corner brackets + inner line
  - `@Composable fun SystemHeader(text: String = "SYSTEM", accent: Color)` — diamonds + glowing Oxanium title
  - `@Composable fun HudBar(fraction: Float, color: Color, segments: Int = 10, trail: Float? = null, height: Dp = 12.dp)` — slanted clipped bar, segment gaps, moving shine, glowing tip
  - `@Composable fun SystemButton(text: String, accent: Color, onClick: () -> Unit, primary: Boolean = true)`
  - `@Composable fun PixelSprite(grid: List<String>, palette: Map<Char, Color>, pixel: Dp)` and `object Sprites { val avatarStage1; val kapao; val tomyum; val bfast; val snack }` (grids copied from the mockup boards / spec §15)
  - `@Composable fun rememberReducedMotion(): Boolean` (reads `Settings.Global.ANIMATOR_DURATION_SCALE == 0f`)

- [ ] **Step 1:** Compose preview-free sanity test: `SpritesTest.allRowsSameWidth()` (JVM) asserting each sprite grid's rows have equal length and every char is in its palette.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the theme and components. Flashing (crimson) uses a 1.2 s period. Shine/scan animations stop when reduced motion is on.
- [ ] **Step 4:** Run test → PASS; assemble → SUCCESS.
- [ ] **Step 5:** Commit `feat(app): System design system (theme A/C, HUD bars, frames, pixel sprites)`.

---

### Task 12: Onboarding, Status, Quest Log

**Files:**
- Create: `app/.../Nav.kt`, `ui/onboarding/*`, `ui/status/StatusScreen.kt`, `ui/quest/QuestLogScreen.kt`, `ui/quest/QuestViewModel.kt`
- Modify: `MainActivity.kt`

**Interfaces:**
- Consumes: `Repository`, `StatRanks`, `Progression`, components from Task 11.
- Produces: routes `onboarding`, `status`, `quests`, `training/{questId}`, `meal`, `body`, `journal`, `maintenance`; `QuestViewModel.board: StateFlow<List<QuestUi>>` and `fun tick(questId)` (only for `Verify.SELF` / `NUMBER`).

- [ ] **Step 1:** Robolectric test `QuestViewModelTest.tick_onlyAllowedForSelfVerify()` — ticking a `SENSOR` quest leaves progress unchanged; ticking `SELF` marks done.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Onboarding steps per spec §3 items 1–4, 5 (inventory checkboxes), 8 (permission screen for notifications, full-screen intent, exact alarm, battery "ไม่จำกัด" deep link), 9 (test popup in 10 s); Day 0 measurements optional (skippable). Status shows avatar sprite, LV, hexagon rank, EXP `HudBar`, CONDITION chip, 6 stats (`?` when UNKNOWN), body numbers. Quest Log groups MORNING/DAY/TRAINING/NIGHT, MAIN/SIDE tags, stat colors, maintenance strip, `???` hidden placeholder, sensor quests open Training.
- [ ] **Step 4:** Run tests → PASS; assemble → SUCCESS.
- [ ] **Step 5:** Commit `feat(app): onboarding, status and quest log screens`.

---

### Task 13: Training screen with sensor counting

**Files:**
- Create: `app/.../ui/training/TrainingScreen.kt`, `RepService.kt`, `SensorSource.kt`
- Modify: `AndroidManifest.xml` (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_HEALTH`, service declaration `foregroundServiceType="health"`)

**Interfaces:**
- Consumes: `PushupCounter`, `SquatCounter`, `JumpCounter`, `CounterFactory`, `Repository.addProgress`.
- Produces: `SensorSource` interface `fun start(exercise: Exercise, onEvent: (RepEvent) -> Unit)`; `fun stop()`; real implementation over `SensorManager` (proximity, accelerometer, gravity/rotation vector for thigh angle).

- [ ] **Step 1:** JVM test `ThighAngleTest.angleFromGravity()` for the helper `thighAngleDeg(gx, gy, gz): Float` (phone upright in pocket → ~0°, horizontal → ~90°).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Screen: placement instruction per exercise ("วางมือถือหงายบนพื้นใต้หน้าอก" / "ใส่กระเป๋ากางเกงหน้า" / "ใส่กระเป๋ากางเกง"), ring counter, set indicator, rest timer 60 s, sensor status chips, `[ INVALID ]` message, "เจ็บ" button (stops, logs, halves remaining target for today). Unsupported sensor → message and no counting. Each `Rep` calls `addProgress(+1)`; sound + short vibration per rep.
- [ ] **Step 4:** Run test → PASS; assemble → SUCCESS.
- [ ] **Step 5:** Commit `feat(app): training screen with sensor rep counting`.

---

### Task 14: Meal plan, body log, journal, maintenance screens

**Files:**
- Create: `app/.../ui/meal/MealPlanScreen.kt`, `ui/log/BodyLogScreen.kt`, `JournalScreen.kt`, `MaintenanceScreen.kt`

**Interfaces:**
- Consumes: `MealPlanner`, `MenuCatalog`, `Nutrition`, `Repository` (meal logs, measurements, journal, maintenance), `Maintenance`.
- Produces: completion hooks — logging weight/waist completes quest `weigh`; water reaching 2500 completes `water`; journal with ≥ 3 lines completes `journal`; marking a routine done resets its durability and completes `mt_<id>`.

- [ ] **Step 1:** JVM test `JournalRulesTest.threeNonEmptyLinesRequired()` for helper `journalComplete(text: String): Boolean`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Meal plan: three rings (KCAL/PROTEIN/BUDGET), timeline DONE/NOW/NEXT with sprites, reroll per meal, "ให้ System จัดเมนูทั้งวัน" (`MealPlanner.best`, null → hint "เกินงบวันนี้"), "≈" and "ค่าประมาณ ±20%" labels. Meal popup actions from Task 10 write `MealLogEntity`. Body log: weight, waist, water +250 ml buttons, 7-day average line. Journal: 3 prompts + emotion chips. Maintenance: list with durability bars.
- [ ] **Step 4:** Run tests → PASS; assemble → SUCCESS.
- [ ] **Step 5:** Commit `feat(app): meal plan, body log, journal and maintenance screens`.

---

### Task 15: Release v0.1.0

**Files:**
- Create: `system-app/README.md` (Thai: download APK from Actions artifact, allow unknown apps, first-run permissions incl. Samsung battery "ไม่จำกัด" + "แอปที่ไม่เข้าสู่สลีป", device test checklist from spec §18)
- Modify: `app/build.gradle.kts` (`versionName "0.1.0"`, `versionCode 1`)

- [ ] **Step 1:** Run the full suite `./gradlew :engine:test :app:testDebugUnitTest :app:assembleDebug` → all PASS.
- [ ] **Step 2:** Push; confirm the GitHub Actions run is green and the `system-app-debug` artifact exists.
- [ ] **Step 3:** Commit `chore(system-app): v0.1.0 release notes and install guide`.
