package com.lifesystem.app.data

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.lifesystem.engine.boss.Boss
import com.lifesystem.engine.economy.BuyCheck
import com.lifesystem.engine.economy.Slot
import com.lifesystem.engine.gate.GateGenerator
import com.lifesystem.engine.model.QuestType
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.LocalDate
import java.time.ZoneId

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class GameRepositoryTest {
    private lateinit var db: SystemDb
    private val day0 = 20_000L
    private var now = 0L
    private lateinit var repo: Repository

    private fun ms(day: Long, minute: Int) = LocalDate.ofEpochDay(day).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli() + minute * 60_000L

    @Before fun setUp() = runTest {
        db = Room.inMemoryDatabaseBuilder(ApplicationProvider.getApplicationContext(), SystemDb::class.java).allowMainThreadQueries().build()
        now = ms(day0, 600)
        repo = Repository(db) { now }
        repo.saveProfile(ProfileEntity(name = "p", age = 30, sex = "MALE", heightCm = 170.0, day0EpochDay = day0))
    }

    @After fun tearDown() = db.close()

    private fun gateDay(from: Long = day0 + 1): Long = (from..from + 60).first { GateGenerator.generate(it, 1, 420, 1380).isNotEmpty() }

    @Test fun gateQuests_onBoard_andProgressOnlyInsideWindow() = runTest {
        val d = gateDay()
        val board = repo.ensureBoard(d)
        val gate = board.first { it.type == QuestType.GATE.name }
        now = ms(d, gate.openMin!! - 5)
        repo.addProgress(d, gate.questId, 3)
        assertEquals(0, db.dao().quest(d, gate.questId)!!.progress)
        now = ms(d, gate.openMin!! + 5)
        repo.addProgress(d, gate.questId, 3)
        assertEquals(3, db.dao().quest(d, gate.questId)!!.progress)
    }

    @Test fun clearedGate_dropsItem_unfinishedGate_penalty() = runTest {
        val d = gateDay()
        val board = repo.ensureBoard(d)
        val gates = board.filter { it.type == QuestType.GATE.name }
        val first = gates.filter { it.questId.startsWith("gate1_") }
        first.forEach { repo.complete(d, it.questId) }
        board.filter { it.type != QuestType.GATE.name }.forEach { repo.complete(d, it.questId) }
        repo.ensureBoard(d + 1)
        val closed = db.dao().day(d)!!
        assertEquals(1, closed.gatesCleared)
        val drop = GateGenerator.drop(d, 1).name
        assertTrue(db.dao().owned().any { it.id == drop && it.qty >= 1 })
        assertEquals(gates.any { it.questId.startsWith("gate2_") }, closed.penaltyTomorrow)
    }

    @Test fun restTicket_noPenaltyNoReward() = runTest {
        val d = day0 + 1
        repo.ensureBoard(d)
        repo.addConsumable("REST_TICKET", 1)
        assertTrue(repo.useRestTicket(d))
        assertFalse(repo.useRestTicket(d))
        repo.ensureBoard(d + 1)
        val closed = db.dao().day(d)!!
        assertFalse(closed.penaltyTomorrow); assertEquals(0, closed.goldEarned)
        assertNull(db.dao().ownedItem("REST_TICKET"))
    }

    @Test fun expScroll_doublesExp() = runTest {
        val d = day0 + 1
        val board = repo.ensureBoard(d)
        repo.addConsumable("EXP_SCROLL", 1)
        assertTrue(repo.useExpScroll(d))
        val q = board.first { it.questId == "no_soda" }
        repo.complete(d, q.questId)
        repo.ensureBoard(d + 1)
        assertEquals(q.exp * 2, repo.wallet().exp)
    }

    @Test fun shop_buyAndEquip() = runTest {
        repo.upsertWalletGold(400)
        assertEquals(BuyCheck.Ok, repo.buyCosmetic("outfit_hoodie"))
        assertEquals(100, repo.wallet().gold)
        assertEquals(BuyCheck.Owned, repo.buyCosmetic("outfit_hoodie"))
        assertTrue(repo.buyCosmetic("aura_cyan") is BuyCheck.NotEnough)
        repo.equip(Slot.OUTFIT, "outfit_hoodie")
        assertEquals("outfit_hoodie", repo.profile()!!.outfit)
        repo.equip(Slot.AURA, "aura_cyan") // not owned → ignored
        assertNull(repo.profile()!!.aura)
    }

    @Test fun vault_rewardRedeem_grantsTwin() = runTest {
        repo.deposit(1000, "เก็บ")
        val id = repo.addReward("โมเดลดาบ", 1500, twinCosmetic = "weapon_sword")
        assertFalse(repo.redeemReward(id))
        repo.deposit(600, "เก็บ")
        assertTrue(repo.redeemReward(id))
        assertEquals(100, db.dao().vaultBalance())
        assertNotNull(db.dao().reward(id)!!.redeemedMs)
        assertTrue(db.dao().owned().any { it.id == "weapon_sword" })
        assertFalse(repo.redeemReward(id))
    }

    @Test fun penaltyShield_oncePerMonth() = runTest {
        val d = day0 + 1
        repo.ensureBoard(d) // nothing done → penalty tomorrow
        val next = repo.ensureBoard(d + 1)
        assertTrue(next.any { it.type == QuestType.PENALTY.name })
        repo.addConsumable("PENALTY_SHIELD", 2)
        assertTrue(repo.usePenaltyShield(d + 1))
        assertTrue(db.dao().questsFor(d + 1).none { it.type == QuestType.PENALTY.name })
        assertEquals(1, db.dao().ownedItem("PENALTY_SHIELD")!!.qty)
        assertFalse(repo.usePenaltyShield(d + 2))
    }

    @Test fun achievements_unlockAfterClose() = runTest {
        (1..10).forEach { repo.logMeal(MealLogEntity(epochDay = day0, slot = "LUNCH", menuId = "m$it", kcal = 1, protein = 1, price = 1)) }
        repo.ensureBoard(day0)
        repo.ensureBoard(day0 + 1)
        assertTrue(db.dao().achievements().any { it.id == "gourmet" })
    }

    @Test fun bossFight_levelsUpOnImprovement() = runTest {
        val sunday = (day0..day0 + 7).first { Boss.isBossDay(it) }
        now = ms(sunday - 7, 480)
        repo.logMeasurement(MeasureType.PUSHUP_MAX, 10.0)
        repo.logMeasurement(MeasureType.WAIST, 96.0)
        now = ms(sunday, 480)
        repo.logMeasurement(MeasureType.PUSHUP_MAX, 12.0)
        repo.logMeasurement(MeasureType.WAIST, 94.5)
        repo.upsertWalletExp(600)
        val o = repo.fightBoss(sunday)
        assertTrue(o.defeated); assertEquals(70, o.damage)
        assertEquals(2, repo.wallet().level); assertEquals(100, repo.wallet().exp)
        assertTrue(db.dao().boss(sunday)!!.defeated)
        assertEquals(2, repo.fightBoss(sunday).let { repo.wallet().level })
    }

    @Test fun bossDay_boardHasBossQuests() = runTest {
        val sunday = (day0 + 1..day0 + 8).first { Boss.isBossDay(it) }
        assertTrue(repo.ensureBoard(sunday).any { it.questId == "boss_pushup" })
    }
}
