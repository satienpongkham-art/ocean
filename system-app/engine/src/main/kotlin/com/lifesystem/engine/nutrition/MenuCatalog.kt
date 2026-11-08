package com.lifesystem.engine.nutrition

import com.lifesystem.engine.model.MealSlot.BREAKFAST
import com.lifesystem.engine.model.MealSlot.DINNER
import com.lifesystem.engine.model.MealSlot.LUNCH
import com.lifesystem.engine.model.MealSlot.SNACK
import com.lifesystem.engine.model.MenuItem

/** Seed menu: Thai à-la-carte shops and 7-Eleven. All numbers are estimates (±20 %). */
object MenuCatalog {
    val items: List<MenuItem> = listOf(
        MenuItem("b_chicken_egg_milk", BREAKFAST, "อกไก่ + ไข่ต้ม 2 + นมจืด + กล้วย", "อกไก่รสธรรมชาติ นมจืดไม่หวาน", 480, 45, 85, "bfast"),
        MenuItem("b_congee", BREAKFAST, "โจ๊กหมูใส่ไข่ + อกไก่", "โจ๊กถ้วยเล็ก เพิ่มอกไก่", 420, 34, 70, "bfast"),
        MenuItem("b_tuna_sandwich", BREAKFAST, "แซนด์วิชทูน่า + นมถั่วเหลือง + ไข่ต้ม", "นมถั่วเหลืองสูตรไม่หวาน", 450, 28, 65, "bfast"),

        MenuItem("l_kapao", LUNCH, "ข้าวกะเพราไก่ ไข่ต้ม", "ข้าวกะเพราไก่ ใส่ไข่ต้มแทนไข่ดาว น้ำมันน้อยครับ", 600, 38, 60, "kapao"),
        MenuItem("l_chicken_rice", LUNCH, "ข้าวมันไก่ อกล้วน", "ข้าวมันไก่ เอาเนื้ออกล้วน ไม่เอาหนังครับ", 580, 40, 55, "kapao"),
        MenuItem("l_red_curry_chicken", LUNCH, "ไก่ผัดพริกแกง + ข้าว + ไข่ต้ม", "ไก่ผัดพริกแกงราดข้าว น้ำมันน้อย เพิ่มไข่ต้มครับ", 620, 42, 65, "kapao"),
        MenuItem("l_garlic_pork", LUNCH, "ข้าวหมูกระเทียม + ไข่ต้ม", "หมูกระเทียมไม่ทอดกรอบ กระเทียมเจียวน้อยครับ", 640, 34, 60, "kapao"),
        MenuItem("l_boiled_chicken_rice", LUNCH, "ข้าวมันไก่ต้ม + ซุป", "ข้าวสวยแทนข้าวมัน เนื้ออกครับ", 520, 38, 55, "kapao"),
        MenuItem("l_mixed_veg_pork", LUNCH, "ผัดผักรวมหมู + ข้าว + ไข่ต้ม", "น้ำมันน้อย เพิ่มไข่ต้มครับ", 560, 30, 60, "kapao"),

        MenuItem("d_tomyum", DINNER, "ต้มยำไก่น้ำใส + ข้าวสวย", "ต้มยำไก่น้ำใส ไม่ใส่นมข้นครับ", 480, 34, 70, "tomyum"),
        MenuItem("d_suki", DINNER, "สุกี้น้ำไก่ใส่ไข่", "สุกี้น้ำไก่ใส่ไข่ น้ำจิ้มแยกครับ", 420, 34, 60, "tomyum"),
        MenuItem("d_veg_shrimp", DINNER, "ผัดผักรวมกุ้ง + ข้าว + ไข่ต้ม", "น้ำมันน้อยครับ", 540, 30, 70, "kapao"),
        MenuItem("d_noodle", DINNER, "ก๋วยเตี๋ยวน้ำใสไก่ฉีก + ลูกชิ้น", "เส้นเล็ก ไม่เติมน้ำตาลครับ", 400, 28, 50, "tomyum"),
        MenuItem("d_steamed_fish", DINNER, "ปลานึ่งมะนาว + ข้าวสวย", "ข้าวครึ่งจานครับ", 450, 36, 90, "tomyum"),

        MenuItem("s_yogurt_banana", SNACK, "กรีกโยเกิร์ต + กล้วย", "โยเกิร์ตรสธรรมชาติ", 230, 14, 45, "snack"),
        MenuItem("s_chicken_milk", SNACK, "อกไก่ 1 ชิ้น + นมจืด", "นมจืดไม่หวาน", 240, 30, 55, "bfast"),
        MenuItem("s_milk_almond", SNACK, "นมจืด + อัลมอนด์ 1 ซอง", "อัลมอนด์อบไม่เค็ม", 300, 13, 40, "snack"),
    )
}
