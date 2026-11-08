package com.lifesystem.engine.nutrition

import com.lifesystem.engine.model.MealSlot
import com.lifesystem.engine.model.Sex.FEMALE
import com.lifesystem.engine.model.Sex.MALE
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class NutritionTest {
    @Test fun bmr_mifflin() {
        assertEquals(1930.0, Nutrition.bmr(MALE, 90.0, 184.0, 25), 1.0)
        assertEquals(1764.0, Nutrition.bmr(FEMALE, 90.0, 184.0, 25), 1.0)
    }

    @Test fun targets() {
        assertEquals(2154, Nutrition.kcalTarget(Nutrition.tdee(1930.0)))
        assertEquals(144, Nutrition.proteinTarget(90.0, 80.0))
        assertEquals(162, Nutrition.proteinTarget(90.0, null))
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
