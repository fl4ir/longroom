import { supabase } from './supabase';
import type { Recipe } from '../types';

export async function fetchRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients:ingredients (
        id,
        name,
        quantity,
        unit,
        allergens
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    categories: row.category ? [row.category] : [],
    servings: row.servings,
    prep_time: row.prep_time,
    cook_time: row.cook_time,
    procedure: row.procedure,
    source: row.source,
    usages: row.uses || [],
    tags: row.tags || [],
    ingredients: row.ingredients || [],
    allergens: [],
    favorite: false,
    priority: undefined,
    importPendingValidation: false,
    createdAt: new Date(row.created_at),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  })) as Recipe[];
}

export async function createRecipe(userId: string, recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('recipes')
    .insert([{
      user_id: userId,
      name: recipe.name,
      category: recipe.categories?.[0] || null,
      servings: recipe.servings,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      procedure: recipe.procedure,
      source: recipe.source,
      uses: recipe.usages,
      tags: recipe.tags
    }])
    .select()
    .single();

  if (error) throw error;

  // Insert ingredients
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(
        recipe.ingredients.map(ing => ({
          recipe_id: data.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          allergens: ing.allergens || []
        }))
      );
    
    if (ingredientsError) throw ingredientsError;
  }

  return data;
}

export async function updateRecipe(recipe: Recipe) {
  const { ingredients, ...recipeData } = recipe;

  // Update recipe
  const { error: updateError } = await supabase
    .from('recipes')
    .update({
      name: recipeData.name,
      category: recipeData.categories?.[0] || null,
      servings: recipeData.servings,
      prep_time: recipeData.prep_time,
      cook_time: recipeData.cook_time,
      procedure: recipeData.procedure,
      source: recipeData.source,
      uses: recipeData.usages,
      tags: recipeData.tags,
      updated_at: new Date().toISOString()
    })
    .eq('id', recipe.id);

  if (updateError) throw updateError;

  // Delete old ingredients and insert new ones
  const { error: deleteError } = await supabase
    .from('ingredients')
    .delete()
    .eq('recipe_id', recipe.id);

  if (deleteError) throw deleteError;

  if (ingredients && ingredients.length > 0) {
    const { error: insertError } = await supabase
      .from('ingredients')
      .insert(
        ingredients.map(ing => ({
          recipe_id: recipe.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          allergens: ing.allergens || []
        }))
      );

    if (insertError) throw insertError;
  }
}

export async function deleteRecipe(recipeId: string) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId);

  if (error) throw error;
}

export async function bulkImportRecipes(userId: string, recipes: Recipe[]): Promise<number> {
  if (recipes.length === 0) return 0;

  // Préparer les recettes pour l'insertion
  const recipesToInsert = recipes.map(recipe => ({
    id: recipe.id,
    user_id: userId,
    name: recipe.name,
    category: recipe.categories?.[0] || null,
    servings: recipe.servings,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    procedure: recipe.procedure,
    source: recipe.source,
    uses: recipe.usages,
    tags: recipe.tags,
    created_at: recipe.created_at || recipe.createdAt,
    updated_at: new Date()
  }));

  // Insérer les recettes (en batch si nécessaire)
  const { error: recipeError } = await supabase
    .from('recipes')
    .insert(recipesToInsert);

  if (recipeError) throw recipeError;

  // Préparer et insérer les ingrédients
  const allIngredients = recipes.flatMap(recipe =>
    (recipe.ingredients || []).map(ing => ({
      id: ing.id,
      recipe_id: recipe.id,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      allergens: ing.allergens || []
    }))
  );

  if (allIngredients.length > 0) {
    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .insert(allIngredients);

    if (ingredientsError) throw ingredientsError;
  }

  return recipes.length;
}
