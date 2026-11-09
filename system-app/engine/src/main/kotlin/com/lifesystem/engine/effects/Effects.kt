package com.lifesystem.engine.effects

import com.lifesystem.engine.model.Condition

/** Round 2 rule R2.6: status effects from real behaviour. */
enum class Effect(val label: String, val desc: String, val expMult: Double, val buff: Boolean) {
    RESTED("Rested", "นอนครบ 7.5 ชม.+ · EXP +10%", 1.10, true),
    SUGAR_CRASH("Sugar Crash", "เมื่อวานมีน้ำอัดลม · EXP −10%", 0.90, false),
    NIGHT_OWL("Night Owl", "ใช้มือถือหลังเที่ยงคืน · EXP −5% และ CONDITION ลด", 0.95, false),
}

object Effects {
    fun active(condition: Condition, sodaYesterday: Boolean, screenAfterMidnight: Boolean): List<Effect> = buildList {
        if (condition == Condition.OPTIMAL) add(Effect.RESTED)
        if (sodaYesterday) add(Effect.SUGAR_CRASH)
        if (screenAfterMidnight) add(Effect.NIGHT_OWL)
    }

    fun multiplier(effects: List<Effect>): Double = effects.fold(1.0) { acc, e -> acc * e.expMult }

    /** Night Owl drops the condition one step. */
    fun adjust(c: Condition, nightOwl: Boolean): Condition = if (!nightOwl) c else when (c) {
        Condition.OPTIMAL -> Condition.NORMAL
        else -> Condition.FATIGUED
    }
}
