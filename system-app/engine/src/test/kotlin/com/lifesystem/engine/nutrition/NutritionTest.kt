package com.lifesystem.engine.nutrition

import com.lifesystem.engine.model.MealSlot
import com.lifesystem.engine.model.Sex.FEMALE
import com.lifesystem.engine.model.Sex.MALE
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NutritionTest {
    @Test fun bmr_mifflin() {
        assertEquals(1617.5, Nutrition.bmr(MALE, 70.0, 170.0, 30), 1.0)
        assertEquals(1451.5, Nutrition.bmr(FEMALE, 70.0, 170.0, 30), 1.0)
    }

    @Test fun targets() {
        assertEquals(1724, Nutrition.kcalTarget(Nutrition.tdee(1617.5)))
        assertEquals(108, Nutrition.proteinTarget(70.0, 60.0))
        assertEquals(126, Nutrition.proteinTarget(70.0, null))
        assertEquals(2500, Nutrition.WATER_ML_DEFAULT)
    }

    @Test fun catalog_hasEverySlot() {
        MealSlot.values().forEach { s -> assertTrue("slot $s", MenuCatalog.items.count { it.slot == s } >= 3) }
        assertEquals(MenuCatalog.items.size, MenuCatalog.items.map { it.id }.toSet().size)
    }

    @Test fun catalog_spritesKnown() {
        val known = setOf("kapao", "tomyum", "bfast", "snack")
        MenuCatalog.items.forEach { assertTrue(it.sprite in known) }
    }
}
