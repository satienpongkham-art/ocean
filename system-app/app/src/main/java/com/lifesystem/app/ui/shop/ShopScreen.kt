package com.lifesystem.app.ui.shop

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
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifesystem.app.data.AvatarLook
import com.lifesystem.app.data.Repository
import com.lifesystem.app.data.RewardEntity
import com.lifesystem.app.data.addReward
import com.lifesystem.app.data.avatarLook
import com.lifesystem.app.data.buyCosmetic
import com.lifesystem.app.data.deposit
import com.lifesystem.app.data.equip
import com.lifesystem.app.data.ownedIds
import com.lifesystem.app.data.qty
import com.lifesystem.app.data.ranks
import com.lifesystem.app.data.redeemReward
import com.lifesystem.app.ui.components.AvatarArt
import com.lifesystem.app.ui.components.AvatarView
import com.lifesystem.app.ui.components.ChoiceChip
import com.lifesystem.app.ui.components.PanelBox
import com.lifesystem.app.ui.components.PixelSprite
import com.lifesystem.app.ui.components.ScreenHeader
import com.lifesystem.app.ui.components.SysField
import com.lifesystem.app.ui.components.SystemButton
import com.lifesystem.app.ui.components.Txt
import com.lifesystem.app.ui.theme.SysColors
import com.lifesystem.engine.economy.BuyCheck
import com.lifesystem.engine.economy.Cosmetic
import com.lifesystem.engine.economy.ShopCatalog
import com.lifesystem.engine.economy.Slot
import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat
import kotlinx.coroutines.launch

private val slotName = mapOf(Slot.OUTFIT to "ชุด", Slot.WEAPON to "อาวุธ", Slot.AURA to "ออร่า")

/** SHOP: cosmetics for G, VAULT (real savings) and real rewards, including TWIN items. */
@Composable
fun ShopScreen(repo: Repository) {
    val scope = rememberCoroutineScope()
    var refresh by remember { mutableIntStateOf(0) }
    var gold by remember { mutableIntStateOf(0) }
    var shards by remember { mutableIntStateOf(0) }
    var owned by remember { mutableStateOf(emptySet<String>()) }
    var ranks by remember { mutableStateOf(emptyMap<Stat, Rank>()) }
    var look by remember { mutableStateOf(AvatarLook()) }
    var vault by remember { mutableIntStateOf(0) }
    var msg by remember { mutableStateOf("") }
    var slot by remember { mutableStateOf(Slot.OUTFIT) }
    val rewards by repo.dao.rewardsFlow().collectAsStateWithLifecycle(initialValue = emptyList())
    LaunchedEffect(refresh) {
        gold = repo.wallet().gold; shards = repo.qty("COSMETIC_SHARD"); owned = repo.ownedIds(); ranks = repo.ranks()
        look = repo.avatarLook(); vault = repo.dao.vaultBalance()
    }

    Column(Modifier.padding(horizontal = 16.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        ScreenHeader("SHOP", "$gold G · เศษ $shards")
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            PanelBox { AvatarView(look.stage, pixel = 4.dp, outfit = look.outfit, weapon = look.weapon, aura = look.aura?.let { AvatarArt.auras[it] }) }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("ของแต่งตัวละคร ซื้อด้วย G จากเควสต์", style = Txt.body)
                Text("บางชิ้นต้องมีแรงก์ถึงก่อน · ของจากอาชีพซื้อไม่ได้", style = Txt.sub)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Slot.values().forEach { s -> ChoiceChip(slotName.getValue(s), slot == s, SysColors.Gold) { slot = s } }
        }
        ShopCatalog.cosmetics.filter { it.slot == slot && (it.buyable || it.id in owned) }.forEach { item ->
            CosmeticRow(item, owned, look, gold, shards, ranks,
                onBuy = { scope.launch { msg = buyMessage(repo.buyCosmetic(item.id)); refresh++ } },
                onEquip = { equipped -> scope.launch { repo.equip(item.slot, if (equipped) null else item.id); refresh++ } })
        }
        if (msg.isNotEmpty()) Text(msg, style = Txt.body.copy(color = SysColors.Mint))

        ScreenHeader("VAULT", "฿$vault")
        VaultPanel(onDeposit = { amount -> scope.launch { repo.deposit(amount, "เก็บเงิน"); refresh++ } })

        ScreenHeader("REAL REWARDS", "ของรางวัลจริง")
        Text("ตั้งของที่อยากได้จริง + ราคา · แลกได้เมื่อเงินเก็บ VAULT ถึง · ผูก TWIN ได้ (ซื้อของจริง = ได้ของในเกมด้วย)", style = Txt.sub)
        rewards.forEach { r -> RewardRow(r, vault) { scope.launch { msg = if (repo.redeemReward(r.id)) "แลก ${r.name} แล้ว · ไปซื้อของจริงได้เลย!" else "เงินเก็บยังไม่พอ"; refresh++ } } }
        AddRewardPanel(onAdd = { name, price, twin -> scope.launch { repo.addReward(name, price, twin); refresh++ } })
        Box(Modifier.padding(bottom = 16.dp))
    }
}

private fun buyMessage(c: BuyCheck) = when (c) {
    BuyCheck.Ok -> "ซื้อแล้ว · แตะ \"ใส่\" เพื่อสวม"
    BuyCheck.Owned -> "มีแล้ว"
    is BuyCheck.NotEnough -> "ยังขาดอีก ${c.missing}"
    is BuyCheck.RankTooLow -> "ต้องมี ${c.stat.name} แรงก์ ${c.rank.name} ก่อน"
}

@Composable
private fun CosmeticRow(item: Cosmetic, owned: Set<String>, look: AvatarLook, gold: Int, shards: Int, ranks: Map<Stat, Rank>, onBuy: () -> Unit, onEquip: (Boolean) -> Unit) {
    val have = item.id in owned
    val equipped = item.id == look.outfit || item.id == look.weapon || item.id == look.aura
    val check = ShopCatalog.check(item, gold, shards, ranks, owned)
    Row(Modifier.fillMaxWidth().border(1.dp, (if (equipped) SysColors.Mint else SysColors.Gold).copy(alpha = 0.4f)).padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) {
            when (item.slot) {
                Slot.OUTFIT -> AvatarView(look.stage, pixel = 2.5.dp, outfit = item.id)
                Slot.WEAPON -> AvatarArt.weapons[item.id]?.let { PixelSprite(it, 4.dp) }
                Slot.AURA -> AvatarView(look.stage, pixel = 2.5.dp, outfit = look.outfit, aura = AvatarArt.auras[item.id])
            }
        }
        Column(Modifier.weight(1f)) {
            Text(item.name, style = Txt.body.copy(color = Color.White))
            Text(
                when {
                    have -> if (equipped) "สวมอยู่" else "มีแล้ว"
                    item.priceShards > 0 -> "เศษประตูมิติ ${item.priceShards} ชิ้น"
                    else -> "${item.priceG} G" + (item.needRank?.let { " · ต้อง ${item.needStat?.name} ≥ ${it.name}" } ?: "")
                },
                style = Txt.sub.copy(color = if (check is BuyCheck.RankTooLow) SysColors.CrimsonText else SysColors.Gold),
            )
        }
        if (have) SystemButton(if (equipped) "ถอด" else "ใส่", SysColors.Mint, { onEquip(equipped) }, Modifier.width(80.dp), primary = false)
        else SystemButton("ซื้อ", SysColors.Gold, onBuy, Modifier.width(80.dp), primary = false, enabled = check == BuyCheck.Ok)
    }
}

@Composable
private fun VaultPanel(onDeposit: (Int) -> Unit) {
    var amount by remember { mutableStateOf("") }
    PanelBox(Modifier.fillMaxWidth(), SysColors.Gold) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("บันทึกเงินที่โอนเข้าบัญชีเก็บจริง (ประหยัดจากงบ / กันเงินวันรับเงิน / เงินลงโทษ)", style = Txt.sub)
            SysField("จำนวนเงิน (บาท)", amount, { amount = it.filter(Char::isDigit) }, number = true)
            SystemButton("ฝากเข้า VAULT", SysColors.Gold, { amount.toIntOrNull()?.let(onDeposit); amount = "" }, primary = false)
        }
    }
}

@Composable
private fun RewardRow(r: RewardEntity, vault: Int, onRedeem: () -> Unit) {
    val done = r.redeemedMs != null
    Row(Modifier.fillMaxWidth().border(1.dp, (if (done) SysColors.Mint else SysColors.Gold).copy(alpha = 0.4f)).padding(8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Column(Modifier.weight(1f)) {
            Text(r.name, style = Txt.body.copy(color = if (done) SysColors.Muted else Color.White))
            Text("฿${r.price}" + (r.twinCosmetic?.let { " · TWIN: ${ShopCatalog.byId(it)?.name ?: it}" } ?: "") + if (done) " · แลกแล้ว" else " · ${(vault * 100 / r.price.coerceAtLeast(1)).coerceAtMost(100)}%", style = Txt.sub)
        }
        if (!done) SystemButton("แลก", SysColors.Gold, onRedeem, Modifier.width(80.dp), primary = false, enabled = vault >= r.price)
    }
}

@Composable
private fun AddRewardPanel(onAdd: (String, Int, String?) -> Unit) {
    var name by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var twin by remember { mutableStateOf<String?>(null) }
    PanelBox(Modifier.fillMaxWidth(), SysColors.Gold) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SysField("ของที่อยากได้ เช่น โมเดลดาบ", name, { name = it })
            SysField("ราคา (บาท)", price, { price = it.filter(Char::isDigit) }, number = true)
            Text("ผูก TWIN (ไม่บังคับ): ได้ของชิ้นนี้ในเกมเมื่อแลกของจริง", style = Txt.sub)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                ChoiceChip("ไม่ผูก", twin == null, SysColors.Gold) { twin = null }
                listOf("weapon_sword", "weapon_staff", "aura_gold").forEach { id ->
                    ChoiceChip(ShopCatalog.byId(id)?.name ?: id, twin == id, SysColors.Gold) { twin = id }
                }
            }
            SystemButton("เพิ่มของรางวัล", SysColors.Gold, {
                val p = price.toIntOrNull()
                if (name.isNotBlank() && p != null && p > 0) { onAdd(name, p, twin); name = ""; price = ""; twin = null }
            }, primary = false)
        }
    }
}
