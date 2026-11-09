package com.lifesystem.app.ui.quest

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.app.popup.PopupRules
import com.lifesystem.engine.model.Verify
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalTime

/**
 * Manual completion rules: only self-verified quests can be ticked by hand (spec §5.6),
 * plus "wake"/"sleep" inside their time windows (Round 1 honour rules, see [PopupRules]).
 */
class QuestActions(
    private val repo: Repository,
    private val epochDay: Long,
    private val nowMin: () -> Int = { LocalTime.now().let { it.hour * 60 + it.minute } },
    /** False once sleep is tracked automatically (usage access or Health Connect). */
    private val sleepManual: suspend () -> Boolean = { true },
) {
    suspend fun tick(questId: String): Boolean {
        val q = repo.board(epochDay).first().firstOrNull { it.questId == questId } ?: return false
        if (q.done) return false
        when {
            questId == "wake" -> {
                val p = repo.profile() ?: return false
                if (!PopupRules.wakeOnTime(nowMin(), p.wakeMin)) return false
                repo.complete(epochDay, questId)
            }
            questId == "sleep" -> {
                if (!sleepManual()) return false
                val p = repo.profile() ?: return false
                if (!PopupRules.bedOnTime(nowMin(), p.sleepMin)) return false
                repo.complete(epochDay, questId)
            }
            q.verify != Verify.SELF.name -> return false
            questId.startsWith("mt_") -> repo.markMaintenanceDone(questId.removePrefix("mt_"), epochDay)
            questId == "buy_sunscreen" -> { repo.setHasSunscreen(); repo.complete(epochDay, questId) }
            else -> repo.complete(epochDay, questId)
        }
        return true
    }

    companion object {
        /** Quests the Quest Log may offer a tick for (the rules above still decide). */
        fun tickable(q: QuestEntity) = q.verify == Verify.SELF.name || q.questId == "wake" || q.questId == "sleep"
    }
}

class QuestViewModel(
    private val repo: Repository,
    val epochDay: Long,
    private val prepare: suspend (Long) -> Unit = { repo.ensureBoard(it) },
    private val sleepManual: suspend () -> Boolean = { true },
) : ViewModel() {
    private val actions = QuestActions(repo, epochDay, sleepManual = sleepManual)

    val board: StateFlow<List<QuestEntity>> = repo.board(epochDay).stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val dayNumber: StateFlow<Int> = repo.profileFlow()
        .map { p -> if (p == null) 1 else repo.dayNumber(p, epochDay) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 1)

    init {
        // Wait for a profile (fresh install finishes onboarding first), then build today's board.
        viewModelScope.launch { repo.profileFlow().filterNotNull().first(); prepare(epochDay) }
    }

    private val _notice = MutableStateFlow("")
    val notice: StateFlow<String> = _notice

    fun tick(questId: String) {
        viewModelScope.launch {
            val ok = actions.tick(questId)
            val p = repo.profile()
            _notice.value = when {
                ok || p == null -> ""
                questId == "wake" -> "ตื่นตามเวลา: กดได้ช่วง ${hhmm(p.wakeMin - PopupRules.WAKE_EARLY_MIN)}–${hhmm(p.wakeMin + PopupRules.WAKE_GRACE_MIN)} เท่านั้น"
                questId == "sleep" && !sleepManual() -> "เข้านอนตรงเวลา: System ตรวจจากเวลานอนจริงตอนเช้า ไม่ต้องกด"
                questId == "sleep" -> "เข้านอนตรงเวลา: กดได้ช่วง ${hhmm(p.sleepMin - PopupRules.BED_EARLY_MIN)}–${hhmm(p.sleepMin + PopupRules.BED_LATE_MIN)} เท่านั้น"
                else -> ""
            }
        }
    }

    private fun hhmm(min: Int) = Math.floorMod(min, 1440).let { "%02d:%02d".format(it / 60, it % 60) }
}
