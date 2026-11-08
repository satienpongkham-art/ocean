package com.lifesystem.app

import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.compose.composable
import com.lifesystem.app.data.Repository
import com.lifesystem.app.ui.training.TrainingScreen

/** Feature routes beyond status and quest log. */
fun NavGraphBuilder.extraRoutes(nav: NavHostController, repo: Repository, today: Long) {
    composable("${Routes.TRAINING}/{questId}") { entry ->
        TrainingScreen(repo, today, entry.arguments?.getString("questId") ?: "pushup")
    }
}
