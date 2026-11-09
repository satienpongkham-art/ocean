package com.lifesystem.app.data

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/** Schema history. Every change after v0.1.0 needs a migration here so updates never lose data. */
object Migrations {
    /** v0.1.0 → v0.2.0: gate windows, day buffs, equipment, shop/vault/rewards, achievements, boss results. */
    val M1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            listOf(
                "ALTER TABLE `profile` ADD COLUMN `titleId` TEXT",
                "ALTER TABLE `profile` ADD COLUMN `job` TEXT",
                "ALTER TABLE `profile` ADD COLUMN `outfit` TEXT",
                "ALTER TABLE `profile` ADD COLUMN `weapon` TEXT",
                "ALTER TABLE `profile` ADD COLUMN `aura` TEXT",
                "ALTER TABLE `quest` ADD COLUMN `openMin` INTEGER",
                "ALTER TABLE `quest` ADD COLUMN `closeMin` INTEGER",
                "ALTER TABLE `day` ADD COLUMN `expMultiplier` REAL NOT NULL DEFAULT 1.0",
                "ALTER TABLE `day` ADD COLUMN `rest` INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE `day` ADD COLUMN `gatesCleared` INTEGER NOT NULL DEFAULT 0",
                "CREATE TABLE IF NOT EXISTS `owned_item` (`id` TEXT NOT NULL, `kind` TEXT NOT NULL, `qty` INTEGER NOT NULL, PRIMARY KEY(`id`))",
                "CREATE TABLE IF NOT EXISTS `vault_entry` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `tMs` INTEGER NOT NULL, `amount` INTEGER NOT NULL, `note` TEXT NOT NULL)",
                "CREATE TABLE IF NOT EXISTS `reward` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `name` TEXT NOT NULL, `price` INTEGER NOT NULL, `twinCosmetic` TEXT, `redeemedMs` INTEGER)",
                "CREATE TABLE IF NOT EXISTS `achievement` (`id` TEXT NOT NULL, `epochDay` INTEGER NOT NULL, PRIMARY KEY(`id`))",
                "CREATE TABLE IF NOT EXISTS `boss_result` (`epochDay` INTEGER NOT NULL, `damage` INTEGER NOT NULL, `defeated` INTEGER NOT NULL, `improved` TEXT NOT NULL, PRIMARY KEY(`epochDay`))",
            ).forEach(db::execSQL)
        }
    }

    /** v0.2.0 → v0.3.0: settings, progress log, expenses, core misses per day. */
    val M2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            listOf(
                "ALTER TABLE `day` ADD COLUMN `coreMisses` INTEGER NOT NULL DEFAULT 0",
                "CREATE TABLE IF NOT EXISTS `setting` (`key` TEXT NOT NULL, `value` TEXT NOT NULL, PRIMARY KEY(`key`))",
                "CREATE TABLE IF NOT EXISTS `progress_log` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `epochDay` INTEGER NOT NULL, `questId` TEXT NOT NULL, `tMs` INTEGER NOT NULL, `amount` INTEGER NOT NULL)",
                "CREATE TABLE IF NOT EXISTS `expense` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `epochDay` INTEGER NOT NULL, `tMs` INTEGER NOT NULL, `amount` INTEGER NOT NULL, `category` TEXT NOT NULL)",
            ).forEach(db::execSQL)
        }
    }
}
