package com.lifesystem.engine.economy

import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat

enum class Slot { OUTFIT, WEAPON, AURA }

data class Cosmetic(
    val id: String,
    val name: String,
    val slot: Slot,
    val priceG: Int,
    val needStat: Stat? = null,
    val needRank: Rank? = null,
    val buyable: Boolean = true,
    val priceShards: Int = 0,
)

sealed interface BuyCheck {
    data object Ok : BuyCheck
    data object Owned : BuyCheck
    data class NotEnough(val missing: Int) : BuyCheck
    data class RankTooLow(val stat: Stat, val rank: Rank) : BuyCheck
}

/** Round 1.5 rule R7: cosmetic catalog bought with G (or gate shards). */
object ShopCatalog {
    val cosmetics: List<Cosmetic> = listOf(
        Cosmetic("outfit_hoodie", "ฮู้ดดี้ดำ", Slot.OUTFIT, 300),
        Cosmetic("outfit_jacket", "แจ็กเก็ตหนัง", Slot.OUTFIT, 800),
        Cosmetic("outfit_coat", "โค้ทยาวสีกรม", Slot.OUTFIT, 1500, Stat.VIT, Rank.C),
        Cosmetic("weapon_dagger", "มีดสั้นเงา", Slot.WEAPON, 400),
        Cosmetic("weapon_sword", "ดาบยาวนักล่า", Slot.WEAPON, 2000, Stat.STR, Rank.C),
        Cosmetic("weapon_staff", "คทาผู้รู้", Slot.WEAPON, 1200, Stat.INT, Rank.C),
        Cosmetic("aura_cyan", "ออร่าฟ้า", Slot.AURA, 500),
        Cosmetic("aura_violet", "ออร่าม่วง", Slot.AURA, 1000, Stat.MND, Rank.C),
        Cosmetic("aura_gold", "ออร่าทอง", Slot.AURA, 2000, Stat.STR, Rank.B),
        Cosmetic("aura_gate", "ออร่าประตูมิติ", Slot.AURA, 0, priceShards = 10),
    ) + com.lifesystem.engine.job.Job.values().map { Cosmetic("job_${it.name.lowercase()}", "ชุด${it.title}", Slot.OUTFIT, 0, buyable = false) }

    fun byId(id: String): Cosmetic? = cosmetics.firstOrNull { it.id == id }

    fun check(item: Cosmetic, gold: Int, shards: Int, ranks: Map<Stat, Rank>, owned: Set<String>): BuyCheck {
        if (item.id in owned) return BuyCheck.Owned
        val need = item.needRank
        val stat = item.needStat
        if (need != null && stat != null) {
            val have = ranks[stat] ?: Rank.UNKNOWN
            if (have == Rank.UNKNOWN || have < need) return BuyCheck.RankTooLow(stat, need)
        }
        return if (item.priceShards > 0) {
            if (shards < item.priceShards) BuyCheck.NotEnough(item.priceShards - shards) else BuyCheck.Ok
        } else {
            if (gold < item.priceG) BuyCheck.NotEnough(item.priceG - gold) else BuyCheck.Ok
        }
    }
}

/** VAULT: append-only ledger of real savings (+deposit, −redemption). */
object Vault {
    fun balance(entries: List<Int>): Int = entries.sum()
    fun canRedeem(balance: Int, price: Int): Boolean = price > 0 && balance >= price
}
