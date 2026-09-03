import { describe, expect, it } from "vitest";
import { mapOffProduct, type OffResponse } from "./off";

/** ตัดมาจากรูปแบบจริงของ Open Food Facts (หน่วยของแร่ธาตุและวิตามินเป็นกรัม) */
const soyMilk: OffResponse = {
  status: 1,
  product: {
    product_name: "Soy Milk Original",
    brands: "Lactasoy, Lactasoy Co",
    serving_size: "1 กล่อง (300 ml)",
    serving_quantity: 300,
    nutriments: {
      "energy-kcal_100g": 54,
      proteins_100g: 2.4,
      carbohydrates_100g: 7.3,
      fat_100g: 1.7,
      sugars_100g: 6.1,
      sodium_100g: 0.045,
      calcium_100g: 0.12,
      "vitamin-c_100g": 0.00538,
      "vitamin-d_100g": 0.0000015,
      "vitamin-b12_100g": 0.0000012,
    },
  },
};

describe("การแปลงข้อมูล Open Food Facts", () => {
  it("อ่านมาโครและชื่อสินค้าได้", () => {
    const mapped = mapOffProduct(soyMilk, "8850253000019")!;
    expect(mapped.name).toBe("Soy Milk Original");
    expect(mapped.barcode).toBe("8850253000019");
    expect(mapped.kcalPer100g).toBe(54);
    expect(mapped.proteinPer100g).toBe(2.4);
  });

  it("เอายี่ห้อแรกจากรายการที่คั่นด้วยจุลภาค", () => {
    expect(mapOffProduct(soyMilk, "1")!.brand).toBe("Lactasoy");
  });

  it("แปลงแร่ธาตุจากกรัมเป็นหน่วยของเรา", () => {
    const micros = mapOffProduct(soyMilk, "1")!.micros;
    expect(micros.sodium_mg).toBe(45);
    expect(micros.calcium_mg).toBe(120);
  });

  it("แปลงวิตามินจากกรัมเป็นหน่วยของเราได้ถูก", () => {
    const micros = mapOffProduct(soyMilk, "1")!.micros;
    expect(micros.vitamin_c_mg).toBeCloseTo(5.38, 2);
    expect(micros.vitamin_d_mcg).toBeCloseTo(1.5, 2);
    expect(micros.vitamin_b12_mcg).toBeCloseTo(1.2, 2);
  });

  it("ค่าที่น้อยกว่า 1 หน่วยต้องไม่ถูกปัดจนกลายเป็นศูนย์", () => {
    const tiny = mapOffProduct(
      {
        status: 1,
        product: {
          product_name: "ทดสอบ",
          nutriments: {
            "energy-kcal_100g": 50,
            proteins_100g: 1,
            carbohydrates_100g: 1,
            fat_100g: 1,
            // 0.004 มก. — ถ้าปัดสองตำแหน่งจะกลายเป็น 0 แล้วอ่านว่า "ไม่มีสารอาหารตัวนี้"
            "vitamin-c_100g": 0.000004,
          },
        },
      },
      "1",
    )!;
    expect(tiny.micros.vitamin_c_mg).toBe(0.004);
  });

  it("เก็บหน่วยบรรจุจากฉลากไว้ให้เลือกตอนบันทึก", () => {
    expect(mapOffProduct(soyMilk, "1")!.serving).toEqual({
      label: "1 กล่อง (300 ml)",
      grams: 300,
    });
  });

  it("ไม่ใส่คีย์ไมโครที่ฉลากไม่ได้ระบุ", () => {
    const micros = mapOffProduct(soyMilk, "1")!.micros;
    expect("iron_mg" in micros).toBe(false);
    expect("fiber_g" in micros).toBe(false);
  });
});

describe("การกันข้อมูลที่กรอกผิด", () => {
  const withNutriments = (nutriments: Record<string, number>): OffResponse => ({
    status: 1,
    product: { product_name: "ทดสอบ", nutriments },
  });

  it("ปฏิเสธเมื่อไม่พบสินค้า", () => {
    expect(mapOffProduct({ status: 0 }, "1")).toBeNull();
  });

  it("ปฏิเสธเมื่อมาโครไม่ครบ", () => {
    expect(
      mapOffProduct(withNutriments({ "energy-kcal_100g": 100, proteins_100g: 2 }), "1"),
    ).toBeNull();
  });

  it("ปฏิเสธพลังงานที่เกินความเป็นไปได้ — คนกรอกมักใส่ค่าต่อชิ้นในช่องต่อ 100 ก.", () => {
    expect(
      mapOffProduct(
        withNutriments({
          "energy-kcal_100g": 1500,
          proteins_100g: 2,
          carbohydrates_100g: 10,
          fat_100g: 5,
        }),
        "1",
      ),
    ).toBeNull();
  });

  it("ปฏิเสธมาโครที่เกิน 100 ก. ต่อ 100 ก.", () => {
    expect(
      mapOffProduct(
        withNutriments({
          "energy-kcal_100g": 300,
          proteins_100g: 250,
          carbohydrates_100g: 10,
          fat_100g: 5,
        }),
        "1",
      ),
    ).toBeNull();
  });

  it("ปฏิเสธสินค้าที่ไม่มีชื่อ — ผู้ใช้จะเห็นแถวเปล่าในไดอารี", () => {
    expect(
      mapOffProduct(
        {
          status: 1,
          product: {
            product_name: "  ",
            nutriments: {
              "energy-kcal_100g": 100,
              proteins_100g: 1,
              carbohydrates_100g: 1,
              fat_100g: 1,
            },
          },
        },
        "1",
      ),
    ).toBeNull();
  });
});
