package com.lifesystem.app.ui

import com.lifesystem.app.ui.components.AvatarArt
import com.lifesystem.app.ui.components.Sprite
import com.lifesystem.engine.economy.ShopCatalog
import com.lifesystem.engine.economy.Slot
import com.lifesystem.engine.model.Stat
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AvatarArtTest {
    private fun valid(name: String, s: Sprite) {
        val w = s.grid.first().length
        s.grid.forEach { row ->
            assertEquals("$name width", w, row.length)
            row.forEach { ch -> assertTrue("$name '$ch'", ch == '.' || ch in s.palette) }
        }
    }

    @Test fun everyStageAndOutfit_isAValidSprite() {
        (1..5).forEach { st ->
            valid("stage$st", AvatarArt.body(st))
            AvatarArt.outfits.keys.forEach { valid("stage$st/$it", AvatarArt.body(st, it)) }
        }
        AvatarArt.weapons.forEach { (k, v) -> valid(k, v) }
        AvatarArt.props.forEach { (k, v) -> valid(k, v) }
    }

    @Test fun stagesLookDifferent() {
        (1..4).forEach { assertNotEquals(AvatarArt.body(it).grid, AvatarArt.body(it + 1).grid) }
    }

    @Test fun everyShopCosmeticHasArt() {
        ShopCatalog.cosmetics.forEach { c ->
            when (c.slot) {
                Slot.OUTFIT -> assertTrue(c.id, c.id in AvatarArt.outfits)
                Slot.WEAPON -> assertTrue(c.id, c.id in AvatarArt.weapons)
                Slot.AURA -> assertTrue(c.id, c.id in AvatarArt.auras)
            }
        }
    }

    @Test fun everyStatHasAProp() = Stat.values().forEach { assertTrue(it.name, it.name in AvatarArt.props) }
}
