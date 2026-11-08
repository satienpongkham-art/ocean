package com.lifesystem.app.data

import com.lifesystem.engine.model.Sex
import com.lifesystem.engine.nutrition.Nutrition

data class DailyTargets(val kcal: Int, val protein: Int, val budget: Int, val waterMl: Int)

object Targets {
    /** Defaults used until the first weight is logged. */
    const val FALLBACK_KCAL = 2150
    const val FALLBACK_PROTEIN = 140

    fun of(profile: ProfileEntity, latestWeightKg: Double?): DailyTargets {
        if (latestWeightKg == null) return DailyTargets(FALLBACK_KCAL, FALLBACK_PROTEIN, profile.dailyBudget, Nutrition.WATER_ML_DEFAULT)
        val sex = runCatching { Sex.valueOf(profile.sex) }.getOrDefault(Sex.MALE)
        val bmr = Nutrition.bmr(sex, latestWeightKg, profile.heightCm, profile.age)
        return DailyTargets(
            kcal = Nutrition.kcalTarget(Nutrition.tdee(bmr)),
            protein = Nutrition.proteinTarget(latestWeightKg, profile.goalWeightKg),
            budget = profile.dailyBudget,
            waterMl = Nutrition.WATER_ML_DEFAULT,
        )
    }
}
