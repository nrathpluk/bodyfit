/**
 * ชื่อไทยของอาหารจากคลัง USDA
 *
 * คีย์คือ description ของ USDA แบบตรงตัวอักษร ไม่ใช่ fdcId เพราะอ่านแล้วรู้ทันทีว่าแมปกับอะไร
 * และถ้าสะกดผิด สคริปต์ import จะฟ้องว่า "หาไม่เจอ" ให้เห็นทันที (fdcId สะกดผิดจะเงียบ)
 *
 * ครอบเฉพาะของที่คนไทยกินบ่อย — คลัง USDA มี 7,793 รายการ แต่ที่เหลือ
 * ผู้ใช้ค้นด้วยชื่ออังกฤษได้อยู่แล้ว
 */
export const THAI_NAMES: Record<string, string> = {
  // ข้าวและแป้ง
  // เลือกแถวที่ "ไม่ใส่เกลือ" เสมอเมื่อมีให้เลือก — แถวที่ USDA หุงใส่เกลือมีโซเดียม
  // สูงถึง 382 มก./100 ก. ซึ่งไม่ตรงกับวิธีหุงของคนไทย และจะทำให้ยอดโซเดียมทั้งวันเพี้ยน
  "Rice, white, long-grain, regular, enriched, cooked": "ข้าวสวย",
  "Rice, white, long-grain, regular, raw, enriched": "ข้าวสาร",
  "Rice, white, glutinous, unenriched, cooked": "ข้าวเหนียวนึ่ง",
  "Rice, white, glutinous, unenriched, uncooked": "ข้าวเหนียวดิบ",
  "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)":
    "ข้าวกล้องสุก",
  "Oats (Includes foods for USDA's Food Distribution Program)": "ข้าวโอ๊ต",
  "Pasta, cooked, enriched, with added salt": "สปาเกตตีต้ม",
  "Noodles, egg, cooked, enriched, with added salt": "บะหมี่ไข่ต้ม",
  "Wheat flour, white, all-purpose, enriched, bleached": "แป้งสาลีอเนกประสงค์",

  // เนื้อสัตว์
  "Chicken, broilers or fryers, breast, meat only, cooked, roasted": "อกไก่อบ (ไม่มีหนัง)",
  "Chicken, broilers or fryers, thigh, meat only, cooked, fried": "สะโพกไก่ทอด (ไม่มีหนัง)",
  "Pork, fresh, ground, cooked": "หมูสับสุก",
  "Pork, fresh, belly, raw": "หมูสามชั้นดิบ",
  "Pork, fresh, loin, whole, separable lean and fat, cooked, roasted": "สันนอกหมูอบ",

  // ไข่และนม
  "Egg, whole, raw, fresh": "ไข่ไก่ดิบ",
  "Egg, whole, cooked, hard-boiled": "ไข่ต้ม",
  "Milk, whole, 3.25% milkfat, with added vitamin D": "นมสดรสจืด",
  "Yogurt, plain, whole milk": "โยเกิร์ตรสธรรมชาติ",
  "Butter, salted": "เนยเค็ม",

  // อาหารทะเล
  "Fish, tilapia, cooked, dry heat": "ปลานิลสุก",
  "Fish, mackerel, Atlantic, cooked, dry heat": "ปลาแมคเคอเรลสุก",
  "Fish, salmon, Atlantic, farmed, cooked, dry heat": "ปลาแซลมอนสุก",
  "Crustaceans, shrimp, cooked": "กุ้งสุก",

  // ถั่วและเต้าหู้
  "Tofu, raw, firm, prepared with calcium sulfate": "เต้าหู้แข็ง",
  "Peanuts, all types, raw": "ถั่วลิสงดิบ",

  // ผัก
  "Garlic, raw": "กระเทียม",
  "Cucumber, with peel, raw": "แตงกวา",
  "Peppers, hot chili, red, raw": "พริกขี้หนูแดง",
  "Onions, raw": "หัวหอมใหญ่",
  "Carrots, raw": "แครอท",
  "Tomatoes, red, ripe, raw, year round average": "มะเขือเทศ",
  "Broccoli, raw": "บรอกโคลี",
  "Cabbage, raw": "กะหล่ำปลี",
  "Spinach, cooked, boiled, drained, without salt": "ผักโขมลวก",
  "Mushrooms, white, raw": "เห็ดสด",
  "Ginger root, raw": "ขิง",

  // ผลไม้
  "Bananas, raw": "กล้วย",
  "Papayas, raw": "มะละกอ",
  "Mangos, raw": "มะม่วง",
  "Apples, raw, golden delicious, with skin": "แอปเปิล",
  "Watermelon, raw": "แตงโม",
  "Grapes, red or green (European type, such as Thompson seedless), raw": "องุ่น",

  // น้ำมันและกะทิ
  "Oil, soybean, salad or cooking": "น้ำมันถั่วเหลือง",
  "Oil, olive, salad or cooking": "น้ำมันมะกอก",
  "Oil, palm": "น้ำมันปาล์ม",
  "Nuts, coconut milk, canned (liquid expressed from grated meat and water)": "กะทิกระป๋อง",
  "Nuts, coconut milk, raw (liquid expressed from grated meat and water)": "กะทิสด",
};
