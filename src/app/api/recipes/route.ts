import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listRecipes } from "@/lib/recipes";

/** สูตรทั้งหมดของผู้ใช้ พร้อมสารอาหารต่อหนึ่งที่ — ใช้ในแผ่นเพิ่มอาหาร */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });

  const recipes = await listRecipes(user.id);
  return NextResponse.json({
    recipes: recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      ingredientCount: recipe.ingredients.length,
      kcalPerServing: recipe.perServing.kcal,
    })),
  });
}
