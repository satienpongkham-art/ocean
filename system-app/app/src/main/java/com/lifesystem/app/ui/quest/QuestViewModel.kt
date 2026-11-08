package com.lifesystem.app.ui.quest

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.lifesystem.app.data.QuestEntity
import com.lifesystem.app.data.Repository
import com.lifesystem.engine.model.Verify
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Manual completion rules: only self-verified quests can be ticked by hand (spec §5.6). */
class QuestActions(private val repo: Repository, private val epochDay: Long) {
    suspend fun tick(questId: String): Boolean {
        val q = repo.board(epochDay).first().firstOrNull { it.questId == questId } ?: return false
        if (q.verify != Verify.SELF.name) return false
        repo.complete(epochDay, questId)
        return true
    }
}

class QuestViewModel(private val repo: Repository, val epochDay: Long) : ViewModel() {
    private val actions = QuestActions(repo, epochDay)

    val board: StateFlow<List<QuestEntity>> = repo.board(epochDay).stateIn(viewModelScope, SharingStarted.Eagerly, emptyList())

    val dayNumber: StateFlow<Int> = repo.profileFlow()
        .map { p -> if (p == null) 1 else repo.dayNumber(p, epochDay) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, 1)

    init {
        viewModelScope.launch { repo.ensureBoard(epochDay) }
    }

    fun tick(questId: String) {
        viewModelScope.launch { actions.tick(questId) }
    }
}
