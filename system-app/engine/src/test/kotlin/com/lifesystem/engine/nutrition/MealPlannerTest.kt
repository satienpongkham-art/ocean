package com.lifesystem.engine.nutrition

import com.lifesystem.engine.model.MealSlot
import com.lifesystem.engine.model.MenuItem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MealPlannerTest {
    @Test fun bestPlan_respectsBudget_andCoversEverySlot() {
        val p = MealPlanner.best(MenuCatalog.items, 2150, 285)!!
        assertTrue(p.price <= 285)
        assertEquals(MealSlot.values().toSet(), p.picks.keys)
    }

    @Test fun bestPlan_prefersProteinAtSamePrice() {
        val items = listOf(
            MenuItem("b", MealSlot.BREAKFAST, "b", "", 400, 30, 50, "bfast"),
            MenuItem("l1", MealSlot.LUNCH, "low", "", 600, 20, 60, "kapao"),
            MenuItem("l2", MealSlot.LUNCH, "high", "", 600, 40, 60, "kapao"),
            MenuItem("d", MealSlot.DINNER, "d", "", 500, 30, 60, "tomyum"),
            MenuItem("s", MealSlot.SNACK, "s", "", 200, 10, 40, "snack"),
        )
        assertEquals("l2", MealPlanner.best(items, 2150, 285)!!.picks[MealSlot.LUNCH]!!.id)
    }

    @Test fun bestPlan_returnsNullWhenNothingFitsBudget() = assertNull(MealPlanner.best(MenuCatalog.items, 2150, 100))

    @Test fun score_formula() {
        val plan = DayPlan(mapOf(
            MealSlot.BREAKFAST to MenuItem("b", MealSlot.BREAKFAST, "", "", 500, 40, 70, "bfast"),
            MealSlot.LUNCH to MenuItem("l", MealSlot.LUNCH, "", "", 600, 40, 70, "kapao"),
            MealSlot.DINNER to MenuItem("d", MealSlot.DINNER, "", "", 600, 40, 70, "tomyum"),
            MealSlot.SNACK to MenuItem("s", MealSlot.SNACK, "", "", 300, 20, 60, "snack"),
        ))
        assertEquals(2000, plan.kcal); assertEquals(140, plan.protein); assertEquals(270, plan.price)
        assertEquals(366.0, MealPlanner.score(plan, 2150), 1e-9)
    }
}
