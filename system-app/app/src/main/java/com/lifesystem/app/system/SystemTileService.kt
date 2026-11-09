package com.lifesystem.app.system

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import com.lifesystem.app.MainActivity
import com.lifesystem.app.Routes

/** Quick Settings tile: pull down the shade and call the System window from anywhere. */
class SystemTileService : TileService() {
    override fun onStartListening() {
        qsTile?.apply { state = Tile.STATE_ACTIVE; label = "SYSTEM"; updateTile() }
    }

    override fun onClick() {
        val intent = Intent(this, MainActivity::class.java)
            .putExtra(MainActivity.EXTRA_ROUTE, Routes.SYSTEM)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (Build.VERSION.SDK_INT >= 34) {
            startActivityAndCollapse(PendingIntent.getActivity(this, 1, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
        } else {
            @Suppress("DEPRECATION", "StartActivityAndCollapseDeprecated")
            startActivityAndCollapse(intent)
        }
    }
}
