package com.lifesystem.engine.economy

import com.lifesystem.engine.model.Rank
import com.lifesystem.engine.model.Stat
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class EconomyTest {
    @Test fun catalog_hasEverySlot_uniqueIds_pricesInRange() {
        val items = ShopCatalog.cosmetics
        assertEquals(items.size, items.map { it.id }.toSet().size)
        Slot.values().forEach { s -> assertTrue(items.any { it.slot == s && it.buyable }) }
        items.filter { it.buyable && it.priceShards == 0 }.forEach { assertTrue(it.priceG in 300..2000) }
    }

    @Test fun buyChecks() {
        val cheap = ShopCatalog.cosmetics.first { it.buyable && it.needRank == null && it.priceShards == 0 }
        assertEquals(BuyCheck.Ok, ShopCatalog.check(cheap, gold = cheap.priceG, shards = 0, ranks = emptyMap(), owned = emptySet()))
        assertEquals(BuyCheck.NotEnough(1), ShopCatalog.check(cheap, gold = cheap.priceG - 1, shards = 0, ranks = emptyMap(), owned = emptySet()))
        assertEquals(BuyCheck.Owned, ShopCatalog.check(cheap, gold = 9999, shards = 0, ranks = emptyMap(), owned = setOf(cheap.id)))
        val ranked = ShopCatalog.cosmetics.first { it.needRank != null }
        assertTrue(ShopCatalog.check(ranked, 9999, 0, mapOf(ranked.needStat!! to Rank.E), emptySet()) is BuyCheck.RankTooLow)
        assertEquals(BuyCheck.Ok, ShopCatalog.check(ranked, 9999, 0, mapOf(ranked.needStat!! to Rank.S), emptySet()))
        assertTrue(ShopCatalog.check(ranked, 9999, 0, mapOf(ranked.needStat!! to Rank.UNKNOWN), emptySet()) is BuyCheck.RankTooLow)
    }

    @Test fun shardItem_paidInShards() {
        val s = ShopCatalog.cosmetics.first { it.priceShards > 0 }
        assertEquals(BuyCheck.NotEnough(1), ShopCatalog.check(s, gold = 0, shards = s.priceShards - 1, ranks = emptyMap(), owned = emptySet()))
        assertEquals(BuyCheck.Ok, ShopCatalog.check(s, gold = 0, shards = s.priceShards, ranks = emptyMap(), owned = emptySet()))
    }

    @Test fun jobOutfits_notBuyable() {
        assertTrue(ShopCatalog.cosmetics.filter { it.id.startsWith("job_") }.none { it.buyable })
        assertEquals(6, ShopCatalog.cosmetics.count { it.id.startsWith("job_") })
    }

    @Test fun vault() {
        assertEquals(1500, Vault.balance(listOf(1000, 800, -300)))
        assertTrue(Vault.canRedeem(1500, 1500)); assertFalse(Vault.canRedeem(1499, 1500)); assertFalse(Vault.canRedeem(100, 0))
    }

    @Test fun stat_ranksUsedForGate_areStats() = assertTrue(ShopCatalog.cosmetics.mapNotNull { it.needStat }.all { it != Stat.GOLD })
}
