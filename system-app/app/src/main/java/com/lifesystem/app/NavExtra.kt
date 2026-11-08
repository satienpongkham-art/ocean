package com.lifesystem.app

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.log.BodyLogScreen
import com.lifesystem.app.ui.log.JournalScreen
import com.lifesystem.app.ui.log.MaintenanceScreen
import com.lifesystem.app.ui.meal.MealPlanScreen
import com.lifesystem.app.ui.training.TrainingScreen

/** Feature routes beyond status and quest log. */
fun NavGraphBuilder.extraRoutes(nav: NavHostController, repo: Repository, today: Long) {
    composable("${Routes.TRAINING}/{questId}") { entry ->
        TrainingScreen(repo, today, entry.arguments?.getString("questId") ?: "pushup")
    }
    composable(Routes.MEAL) { MealPlanScreen(repo, today) }
    composable(Routes.BODY) { BodyLogScreen(repo, today) { nav.navigate(Routes.MAINTENANCE) } }
    composable(Routes.JOURNAL) { JournalScreen(repo, today) }
    composable(Routes.MAINTENANCE) { MaintenanceScreen(repo, today) }
}
