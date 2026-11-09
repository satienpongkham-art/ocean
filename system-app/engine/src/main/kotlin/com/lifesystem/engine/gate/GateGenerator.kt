package com.lifesystem.engine.gate

import com.lifesystem.engine.model.Group
import com.lifesystem.engine.model.Quest
import com.lifesystem.engine.model.QuestType
import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat
import com.lifesystem.engine.model.Verify
import java.util.Random
import kotlin.math.pow
import kotlin.math.roundToInt

data class GateTask(val exercise: String, val target: Int)

data class Gate(val index: Int, val rank: Rank, val openMin: Int, val closeMin: Int, val tasks: List<GateTask>, val gold: Int)

enum class Drop { EXP_SCROLL, REST_TICKET, PENALTY_SHIELD, COSMETIC_SHARD }

/** Round 1.5 rule R5: up to two timed gates a day, deterministic per day. */
object GateGenerator {
    const val DURATION_MIN = 45
    private const val GAP_MIN = 30
    private const val AFTER_WAKE_MIN = 120
    private const val BEFORE_BED_MIN = 120
    private val base = mapOf("pushup" to 20, "squat" to 30, "situp" to 20, "rope" to 60)
    private val unit = mapOf("pushup" to "ครั้ง", "squat" to "ครั้ง", "situp" to "ครั้ง", "rope" to "วินาที")
    private val label = mapOf("pushup" to "วิดพื้น", "squat" to "สควอท", "situp" to "ซิทอัพ", "rope" to "เชือกกระโดด")

    fun rankFor(level: Int): Rank = when {
        level >= 30 -> Rank.A
        level >= 20 -> Rank.B
        level >= 10 -> Rank.C
        level >= 5 -> Rank.D
        else -> Rank.E
    }

    private fun multiplier(rank: Rank): Double = 1.5.pow(rank.ordinal.coerceAtMost(Rank.A.ordinal))

    fun volume(exercise: String, rank: Rank): Int = (base.getValue(exercise) * multiplier(rank)).roundToInt()

    fun generate(epochDay: Long, level: Int, wakeMin: Int, sleepMin: Int): List<Gate> {
        val r = Random(mix(epochDay * 7919 + 17))
        val count = r.nextInt(100).let { if (it < 25) 0 else if (it < 70) 1 else 2 }
        val bed = if (sleepMin <= wakeMin) sleepMin + 1440 else sleepMin
        val first = wakeMin + AFTER_WAKE_MIN
        val last = minOf(bed - BEFORE_BED_MIN, 1439) - DURATION_MIN
        if (count == 0 || last < first) return emptyList()

        val opens = mutableListOf(first + r.nextInt(last - first + 1))
        if (count == 2) {
            repeat(10) {
                val o = first + r.nextInt(last - first + 1)
                if (opens.size == 1 && kotlin.math.abs(o - opens[0]) >= DURATION_MIN + GAP_MIN) opens += o
            }
        }
        val rank = rankFor(level)
        return opens.sorted().mapIndexed { i, open ->
            val tasks = base.keys.shuffled(r).take(2).map { GateTask(it, volume(it, rank)) }
            Gate(i + 1, rank, open, open + DURATION_MIN, tasks, (15 * multiplier(rank)).roundToInt())
        }
    }

    /** Quest rows for a gate; gold is split across its tasks. */
    fun quests(g: Gate): List<Quest> = g.tasks.mapIndexed { i, t ->
        val gold = g.gold / g.tasks.size + if (i < g.gold % g.tasks.size) 1 else 0
        Quest(
            "gate${g.index}_${t.exercise}", "GATE ${g.rank.name} · ${label.getValue(t.exercise)}",
            if (t.exercise == "rope") Stat.AGI else Stat.STR, QuestType.GATE, Group.TRAINING, Verify.SENSOR,
            t.target, unit.getValue(t.exercise), (15 * multiplier(g.rank)).roundToInt(), gold, g.openMin, g.closeMin,
        )
    }

    /** SplitMix64 finalizer: neighbouring days must not give correlated first random values. */
    private fun mix(x: Long): Long {
        var z = x + -0x61c8864680b583ebL
        z = (z xor (z ushr 30)) * -0x40a7b892e31b1a47L
        z = (z xor (z ushr 27)) * -0x6b2fb644ecceee15L
        return z xor (z ushr 31)
    }

    fun drop(epochDay: Long, gateIndex: Int): Drop {
        val x = Random(mix(epochDay * 104729 + gateIndex * 31 + 7)).nextDouble()
        return when {
            x < 0.5 -> Drop.EXP_SCROLL
            x < 0.7 -> Drop.REST_TICKET
            x < 0.8 -> Drop.PENALTY_SHIELD
            else -> Drop.COSMETIC_SHARD
        }
    }
}
