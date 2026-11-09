package com.lifesystem.engine.maintenance

data class MaintenanceRoutine(val id: String, val title: String, val intervalDays: Int)

/** Recurring self-care with a durability bar (spec §10.2). Daily habits live on the quest board. */
object Maintenance {
    const val DUE_AT = 0.15

    val defaults: List<MaintenanceRoutine> = listOf(
        MaintenanceRoutine("shave", "โกนหนวด", 2),
        MaintenanceRoutine("nails_hand", "ตัดเล็บมือ", 10),
        MaintenanceRoutine("nails_foot", "ตัดเล็บเท้า", 28),
        MaintenanceRoutine("haircut", "ตัดผม", 28),
        MaintenanceRoutine("nose_brow", "เล็มขนจมูก + เก็บคิ้ว", 21),
        MaintenanceRoutine("pillowcase", "เปลี่ยนปลอกหมอน", 7),
        MaintenanceRoutine("bedsheet", "เปลี่ยนผ้าปูที่นอน", 14),
        MaintenanceRoutine("laundry_room", "ซักผ้า + จัดห้อง", 7),
        MaintenanceRoutine("toothbrush", "เปลี่ยนแปรงสีฟัน", 105),
        MaintenanceRoutine("dental", "ขูดหินปูน / ตรวจฟัน", 180),
    )

    /** 1.0 right after doing it, falling linearly to 0.0 at the interval; never done = 0.0. */
    fun durability(lastDoneEpochDay: Long?, todayEpochDay: Long, intervalDays: Int): Double {
        if (lastDoneEpochDay == null || intervalDays <= 0) return 0.0
        val left = 1.0 - (todayEpochDay - lastDoneEpochDay).toDouble() / intervalDays
        return left.coerceIn(0.0, 1.0)
    }

    /** Due routines, most worn first. */
    fun due(routines: List<MaintenanceRoutine>, lastDone: Map<String, Long>, todayEpochDay: Long): List<String> =
        routines.map { it to durability(lastDone[it.id], todayEpochDay, it.intervalDays) }
            .filter { it.second <= DUE_AT + 1e-9 }
            .sortedBy { it.second }
            .map { it.first.id }

    fun title(id: String): String = defaults.firstOrNull { it.id == id }?.title ?: id
}
