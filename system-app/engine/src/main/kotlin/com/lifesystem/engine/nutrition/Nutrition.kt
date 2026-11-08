package com.lifesystem.engine.nutrition

import com.lifesystem.engine.model.Sex
import kotlin.math.roundToInt

/** Energy and protein targets (spec §8.1). */
object Nutrition {
    const val WATER_ML_DEFAULT = 2500
    private const val DEFICIT_KCAL = 500.0
    private const val PROTEIN_G_PER_KG = 1.8

    /** Mifflin-St Jeor. */
    fun bmr(sex: Sex, weightKg: Double, heightCm: Double, age: Int): Double {
        val base = 10 * weightKg + 6.25 * heightCm - 5 * age
        return if (sex == Sex.MALE) base + 5 else base - 161
    }

    fun tdee(bmr: Double, activity: Double = 1.375): Double = bmr * activity

    fun kcalTarget(tdee: Double): Int = (tdee - DEFICIT_KCAL).roundToInt()

    /** 1.8 g/kg (within 1.6–2.2), of goal weight when one is set. */
    fun proteinTarget(weightKg: Double, goalWeightKg: Double?): Int =
        (PROTEIN_G_PER_KG * (goalWeightKg ?: weightKg)).roundToInt()
}
