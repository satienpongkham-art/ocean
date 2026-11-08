package com.lifesystem.app.ui

import com.lifesystem.app.ui.components.Sprites
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SpritesTest {
    @Test fun allRowsSameWidth_andCharsInPalette() {
        Sprites.all.forEach { (name, sprite) ->
            val w = sprite.grid.first().length
            sprite.grid.forEach { row ->
                assertEquals("$name row width", w, row.length)
                row.forEach { ch -> assertTrue("$name char '$ch'", ch == '.' || ch in sprite.palette) }
            }
        }
    }

    @Test fun foodSpritesForEveryCatalogSprite() {
        listOf("kapao", "tomyum", "bfast", "snack").forEach { assertTrue(it in Sprites.food) }
    }
}
