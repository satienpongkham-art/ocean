package com.lifesystem.engine.report

data class DaySummary(val epochDay: Long, val requiredDone: Int, val requiredTotal: Int, val missed: List<String>)

data class Report(
    val completionPct: Int,
    val bestDay: Long?,
    val topMissed: List<Pair<String, Int>>,
    val weightChange: Double?,
    val waistChange: Double?,
    val advice: List<String>,
)

/** Round 2 rule R2.12: the Sunday report card. */
object ReportCard {
    fun build(days: List<DaySummary>, weight: Pair<Double?, Double?>, waist: Pair<Double?, Double?>): Report {
        val done = days.sumOf { it.requiredDone }
        val total = days.sumOf { it.requiredTotal }
        val pct = if (total == 0) 0 else done * 100 / total
        val best = days.maxByOrNull { if (it.requiredTotal == 0) 0.0 else it.requiredDone / it.requiredTotal.toDouble() }?.epochDay
        val missed = days.flatMap { it.missed }.groupingBy { it }.eachCount().entries.sortedByDescending { it.value }.take(3).map { it.key to it.value }
        fun delta(p: Pair<Double?, Double?>) = p.first?.let { a -> p.second?.let { b -> b - a } }
        val dw = delta(weight); val dWaist = delta(waist)
        val advice = buildList {
            if (pct < 60) add("ภาระอาจหนักไป · สัปดาห์หน้าโฟกัสเควสต์ CORE ให้ครบก่อน")
            missed.map { it.first }.forEach { id ->
                when (id) {
                    "sleep" -> add("พลาดเข้านอนบ่อย · ตั้งเตือนนอนให้เร็วขึ้น 30 นาที และวางมือถือนอกห้อง")
                    "pushup", "squat", "situp" -> add("ฝึกไม่ครบบ่อย · แบ่งเป็นเซ็ตเล็กทุกชั่วโมง ไม่ต้องรอทำรวด")
                    "journal" -> add("ไดอารี่หลุดบ่อย · เขียน 3 บรรทัดทันทีหลังแปรงฟันก่อนนอน")
                    "wake" -> add("ตื่นสายบ่อย · เข้านอนให้ตรงเวลาก่อน แล้วการตื่นจะง่ายขึ้นเอง")
                }
            }
            if (dWaist != null && dWaist < 0) add("รอบเอวลดลง %.1f ซม. · มาถูกทางแล้ว".format(-dWaist))
            if (isEmpty()) add("สัปดาห์นี้ทำได้ดี · รักษาจังหวะนี้ต่อไป")
        }.distinct()
        return Report(pct, best, missed, dw, dWaist, advice)
    }
}
