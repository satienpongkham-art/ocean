package com.lifesystem.app

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.log.BodyLogScreen
import com.lifesystem.app.ui.log.JournalScreen
import com.lifesystem.app.ui.log.MaintenanceScreen
import com.lifesystem.app.ui.meal.MealPlanScreen
import com.lifesystem.app.ui.training.TimerScreen
import com.lifesystem.app.ui.training.TrainingScreen
import com.lifesystem.app.ui.gate.GateScreen
import com.lifesystem.app.ui.menu.MenuScreen
import com.lifesystem.app.ui.menu.TitlesScreen
import com.lifesystem.app.ui.shop.ShopScreen

/** Feature routes beyond status and quest log. */
fun NavGraphBuilder.extraRoutes(nav: NavHostController, repo: Repository, today: Long) {
    composable("${Routes.TRAINING}/{questId}") { entry ->
        TrainingScreen(repo, today, entry.arguments?.getString("questId") ?: "pushup")
    }
    composable(Routes.MEAL) { MealPlanScreen(repo, today) }
    composable(Routes.BODY) { BodyLogScreen(repo, today) { nav.navigate(Routes.MAINTENANCE) } }
    composable(Routes.JOURNAL) { JournalScreen(repo, today) }
    composable(Routes.MAINTENANCE) { MaintenanceScreen(repo, today) }
    composable(Routes.GATE) {
        GateScreen(repo, today, onTrain = { nav.navigate("${Routes.TRAINING}/$it") }, onBodyLog = { nav.navigate(Routes.BODY) })
    }
    composable(Routes.SHOP) { ShopScreen(repo) }
    composable(Routes.MENU) { MenuScreen { nav.navigate(it) } }
    composable(Routes.TITLES) { TitlesScreen(repo) }
    composable("${Routes.TIMER}/{questId}") { entry -> TimerScreen(repo, today, entry.arguments?.getString("questId") ?: "plank") }
}
