import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeCreateForm } from "@/components/recipes/recipe-create-form";
import { Card, Eyebrow } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listRecipes } from "@/lib/recipes";

export default async function RecipesPage() {
  const user = await requireUser();
  const recipes = await listRecipes(user.id);

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-6 md:max-w-2xl">
      <header className="space-y-1.5 pt-2">
        <Eyebrow>สูตรของฉัน</Eyebrow>
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          ประกอบเมนูเองครั้งเดียว
        </h1>
        <p className="text-sm leading-relaxed text-ink-2">
          คลังอาหารมีแต่วัตถุดิบ ไม่มีเมนูจานเดียวแบบไทย — ประกอบเองจากวัตถุดิบไว้ที่นี่
          แล้วครั้งต่อไปบันทึกทั้งจานได้ในแตะเดียว
        </p>
      </header>

      <Card>
        <Eyebrow>สร้างสูตรใหม่</Eyebrow>
        <div className="mt-4">
          <RecipeCreateForm />
        </div>
      </Card>

      {recipes.length === 0 ? (
        <Card className="text-center text-sm text-ink-3">
          ยังไม่มีสูตร ลองสร้างเมนูที่คุณกินบ่อยที่สุดก่อนสักอย่าง
        </Card>
      ) : (
        recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={{
              id: recipe.id,
              name: recipe.name,
              servings: recipe.servings,
              ingredients: recipe.ingredients,
              perServing: recipe.perServing,
              totalGrams: recipe.totalGrams,
            }}
          />
        ))
      )}
    </main>
  );
}
