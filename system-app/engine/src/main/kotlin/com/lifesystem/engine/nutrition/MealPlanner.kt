package com.lifesystem.engine.nutrition

import com.lifesystem.engine.model.MealSlot
import com.lifesystem.engine.model.MenuItem
import kotlin.math.abs

data class DayPlan(val picks: Map<MealSlot, MenuItem>) {
    val kcal: Int get() = picks.values.sumOf { it.kcal }
    val protein: Int get() = picks.values.sumOf { it.protein }
    val price: Int get() = picks.values.sumOf { it.price }
}

/** "ให้ System จัดเมนูทั้งวัน" (spec §8.3). */
object MealPlanner {
    /** 3·protein − 0.4·|(target − 150) − kcal| − 0.2·price */
    fun score(plan: DayPlan, kcalTarget: Int): Double =
        3.0 * plan.protein - 0.4 * abs((kcalTarget - 150) - plan.kcal) - 0.2 * plan.price

    /** Best one-per-slot plan within [dailyBudget]; null when no combination fits. */
    fun best(items: List<MenuItem>, kcalTarget: Int, dailyBudget: Int): DayPlan? {
        val bySlot = MealSlot.values().map { slot -> items.filter { it.slot == slot } }
        if (bySlot.any { it.isEmpty() }) return null
        var best: DayPlan? = null
        var bestScore = Double.NEGATIVE_INFINITY
        fun visit(i: Int, chosen: List<MenuItem>) {
            if (i == bySlot.size) {
                val plan = DayPlan(chosen.associateBy { it.slot })
                if (plan.price > dailyBudget) return
                val s = score(plan, kcalTarget)
                if (s > bestScore || (s == bestScore && plan.price < (best?.price ?: Int.MAX_VALUE))) {
                    best = plan; bestScore = s
                }
                return
            }
            bySlot[i].forEach { visit(i + 1, chosen + it) }
        }
        visit(0, emptyList())
        return best
    }
}
