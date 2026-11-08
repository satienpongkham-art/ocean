package com.lifesystem.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.lifesystem.app.ui.theme.SystemTheme

class MainActivity : ComponentActivity() {
    companion object {
        const val EXTRA_ROUTE = "route"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repo = (application as SystemApp).repository
        val route = intent.getStringExtra(EXTRA_ROUTE)
        setContent {
            SystemTheme { SystemNav(repo, SystemApp.today(), route) }
        }
    }
}
