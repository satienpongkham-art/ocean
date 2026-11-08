package com.lifesystem.app.ui.meal

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.DailyTargets
import com.lifesystem.app.data.MealLogEntity
import com.lifesystem.app.data.MeasureType
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.Targets
import com.lifesystem.app.ui.components.Chip
import com.lifesystem.app.ui.components.PixelSprite
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.Sprites
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.model.MealSlot
import com.lifesystem.engine.model.MenuItem
import com.lifesystem.engine.nutrition.DayPlan
import com.lifesystem.engine.nutrition.MealPlanner
import com.lifesystem.engine.nutrition.MenuCatalog
import kotlinx.coroutines.launch

private val slotColor = mapOf(MealSlot.BREAKFAST to Color(0xFFFFE066), MealSlot.LUNCH to SysColors.Gold, MealSlot.DINNER to SysColors.Mint, MealSlot.SNACK to SysColors.Hidden)

@Composable
fun MealPlanScreen(repo: Repository, today: Long) {
    val scope = rememberCoroutineScope()
    var targets by remember { mutableStateOf(DailyTargets(Targets.FALLBACK_KCAL, Targets.FALLBACK_PROTEIN, 285, 2500)) }
    val picks = remember { mutableStateMapOf<MealSlot, MenuItem>() }
    var hint by remember { mutableStateOf("") }
    val eaten by repo.meals(today).collectAsStateWithLifecycle(initialValue = emptyList())

    fun auto() {
        val plan = MealPlanner.best(MenuCatalog.items, targets.kcal, targets.budget)
        if (plan == null) { hint = "ไม่มีชุดเมนูที่อยู่ในงบวันนี้ · ปรับงบหรือเลือกเอง"; return }
        picks.clear(); picks.putAll(plan.picks); hint = ""
    }
    LaunchedEffect(Unit) {
        repo.profile()?.let { targets = Targets.of(it, repo.latest(MeasureType.WEIGHT)?.value) }
        auto()
    }
    val plan = DayPlan(picks.toMap())

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ScreenHeader("MEAL PLAN", "ค่าประมาณ ±20%")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            Ring("KCAL", "${plan.kcal}", "/ ${targets.kcal}", plan.kcal / targets.kcal.toFloat(), SysColors.Cyan)
            Ring("PROTEIN", "${plan.protein}g", "/ ${targets.protein}g", plan.protein / targets.protein.toFloat(), Color(0xFFFF8F6B))
            val over = plan.price > targets.budget
            Ring("BUDGET", "฿${plan.price}", "/ ฿${targets.budget}", plan.price / targets.budget.toFloat(), if (over) SysColors.Crimson else SysColors.Gold)
        }
        val left = targets.kcal - plan.kcal
        Text(if (hint.isNotEmpty()) hint else if (left >= 0) "เหลือ ≈$left kcal · เติมข้าว 1 ทัพพีหรือนมจืด 1 กล่องได้" else "เกินเป้า ≈${-left} kcal · สลับมื้อเย็น", style = Txt.sub)
        MealSlot.values().forEach { slot ->
            val item = picks[slot] ?: return@forEach
            val logged = eaten.any { it.slot == slot.name }
            MealCard(slot, item, logged,
                onSwap = {
                    val list = MenuCatalog.items.filter { it.slot == slot }
                    picks[slot] = list[(list.indexOf(item) + 1) % list.size]
                },
                onEat = {
                    scope.launch { repo.logMeal(MealLogEntity(epochDay = today, slot = slot.name, menuId = item.id, kcal = item.kcal, protein = item.protein, price = item.price)) }
                },
            )
        }
        SystemButton("ให้ System จัดเมนูทั้งวัน", SysColors.Cyan, { auto() })
        Text("ถึงเวลามื้อ System จะเด้งเต็มจอพร้อมเมนูและวิธีสั่ง", style = Txt.sub)
    }
}

@Composable
private fun MealCard(slot: MealSlot, item: MenuItem, logged: Boolean, onSwap: () -> Unit, onEat: () -> Unit) {
    val c = slotColor.getValue(slot)
    Row(
        Modifier.fillMaxWidth().border(1.dp, if (logged) SysColors.Mint.copy(alpha = 0.4f) else c.copy(alpha = 0.5f)).padding(8.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(72.dp, 52.dp), contentAlignment = Alignment.Center) { PixelSprite(Sprites.food[item.sprite] ?: Sprites.kapao, pixel = 3.dp) }
        Column(Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(slot.name, style = Txt.sys.copy(color = c, fontSize = 10.sp))
                if (logged) Chip("DONE", SysColors.Mint)
            }
            Text(item.name, style = Txt.body.copy(color = Color.White))
            Text("สั่งว่า: ${item.order}", style = Txt.sub.copy(color = Color(0xFFFFD38A)))
            Text("≈${item.kcal} kcal · P ${item.protein}g · ฿${item.price}", style = Txt.sub)
        }
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SystemButton("สลับ", SysColors.Cyan, onSwap, Modifier.width(72.dp), primary = false)
            SystemButton("กินแล้ว", SysColors.Mint, onEat, Modifier.width(72.dp), primary = false, enabled = !logged)
        }
    }
}

@Composable
private fun Ring(label: String, value: String, of: String, fraction: Float, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(86.dp)) {
                val w = 7.dp.toPx(); val o = Offset(w / 2, w / 2); val s = Size(size.width - w, size.height - w)
                drawArc(color.copy(alpha = 0.12f), 0f, 360f, false, o, s, style = Stroke(w))
                drawArc(color, -90f, 360f * fraction.coerceIn(0f, 1f), false, o, s, style = Stroke(w))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(value, style = Txt.num.copy(fontSize = 15.sp))
                Text(of, style = Txt.code.copy(fontSize = 9.sp))
            }
        }
        Text(label, style = Txt.sys.copy(color = color, fontSize = 10.sp))
    }
}
