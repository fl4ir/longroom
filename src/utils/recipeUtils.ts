import { DEFAULT_ALLERGEN_DICTIONARY } from '../types';
import type { Ingredient, Recipe, AllergenDictionary, IngredientSuggestion } from '../types';

/**
 * Normalise une chaîne de caractères pour la recherche:
 * - Convertit en minuscules
 * - Supprime les accents et diacritiques
 * - Utile pour un fuzzy search insensible aux accents et à la casse
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Détecte automatiquement les allergènes dans une liste d'ingrédients
 */
export function detectAllergens(
  ingredients: Ingredient[],
  customDictionary: AllergenDictionary = {},
  exceptions: Record<string, string[]> = {}
): string[] {
  const detectedAllergens = new Set<string>();
  const combinedDictionary: AllergenDictionary = {
    ...DEFAULT_ALLERGEN_DICTIONARY,
    ...customDictionary
  };

  ingredients.forEach(ingredient => {
    const ingredientName = ingredient.name.toLowerCase();

    Object.entries(combinedDictionary).forEach(([allergen, keywords]) => {
      const allergenExceptions = exceptions[allergen] ?? [];
      // Si l'ingrédient correspond à une phrase d'exception, on ignore cet allergène
      if (allergenExceptions.some(exc => ingredientName.includes(exc.toLowerCase()))) {
        return;
      }

      if (keywords.some(keyword => ingredientName.includes(keyword.toLowerCase()))) {
        detectedAllergens.add(allergen);
      }
    });
  });

  return Array.from(detectedAllergens);
}

/**
 * Ajuste automatiquement les quantités d'une recette selon un poids total cible
 */
export function adjustRecipeProportions(recipe: Recipe, targetWeight: number): Recipe {
  if (!recipe.totalWeight || recipe.totalWeight === 0) {
    console.warn('Impossible d\'ajuster les proportions : poids total de la recette non défini');
    return recipe;
  }
  
  const ratio = targetWeight / recipe.totalWeight;
  
  const adjustedIngredients = recipe.ingredients.map(ingredient => ({
    ...ingredient,
    quantity: Math.round((ingredient.quantity * ratio) * 100) / 100 // Arrondi à 2 décimales
  }));
  
  return {
    ...recipe,
    ingredients: adjustedIngredients,
    totalWeight: targetWeight
  };
}

/**
 * Calcule le poids total d'une recette à partir de ses ingrédients
 */
export function calculateTotalWeight(ingredients: Ingredient[]): number {
  return ingredients.reduce((total, ingredient) => {
    // Conversion basique des unités vers grammes
    let weightInGrams = ingredient.quantity;
    
    switch (ingredient.unit.toLowerCase()) {
      case 'kg':
        weightInGrams *= 1000;
        break;
      case 'ml':
      case 'cl':
        weightInGrams *= (ingredient.unit === 'cl' ? 10 : 1); // Approximation densité = 1
        break;
      case 'l':
        weightInGrams *= 1000;
        break;
      case 'cuillère à soupe':
      case 'c. à s.':
        weightInGrams *= 15; // Approximation
        break;
      case 'cuillère à café':
      case 'c. à c.':
        weightInGrams *= 5; // Approximation
        break;
      case 'tasse':
        weightInGrams *= 240; // Approximation
        break;
      case 'verre':
        weightInGrams *= 200; // Approximation
        break;
      case 'pincée':
        weightInGrams *= 1; // Approximation
        break;
      case 'pièce':
      case 'gousse':
      case 'tranche':
        weightInGrams *= 10; // Approximation très grossière
        break;
    }
    
    return total + weightInGrams;
  }, 0);
}

/**
 * Déploie tous les ingrédients en cascade (résout les recettes imbriquées)
 * Retourne une liste plate d'ingrédients avec les quantités ajustées
 * Les ingrédients avec recipeId restent visibles, suivis de leurs ingrédients détaillés
 */
export function expandIngredients(
  ingredients: Ingredient[],
  allRecipes: Recipe[],
  visited: Set<string> = new Set()
): (Ingredient & { _expandedFromRecipe?: boolean, _sourceRecipeId?: string })[] {
  const expanded: (Ingredient & { _expandedFromRecipe?: boolean, _sourceRecipeId?: string })[] = [];

  ingredients.forEach(ingredient => {
    if (ingredient.recipeId) {
      // Ajouter d'abord l'ingrédient avec recipeId pour le montrer
      expanded.push(ingredient);
      
      // C'est une référence à une recette
      const referencedRecipe = allRecipes.find(r => r.id === ingredient.recipeId);
      if (referencedRecipe && !visited.has(ingredient.recipeId)) {
        // Éviter les boucles infinies
        visited.add(ingredient.recipeId);
        
        // Calculer le ratio d'ajustement
        const ratio = ingredient.quantity / (referencedRecipe.totalWeight || 1);
        
        // Récursivement déplier les ingrédients de la recette
        const expandedSubIngredients = expandIngredients(
          referencedRecipe.ingredients,
          allRecipes,
          new Set(visited)
        );
        
        // Ajouter les ingrédients expandus avec flag
        expandedSubIngredients.forEach(subIng => {
          expanded.push({
            ...subIng,
            quantity: Math.round((subIng.quantity * ratio) * 100) / 100,
            _expandedFromRecipe: true,
            _sourceRecipeId: ingredient.recipeId
          });
        });
      }
    } else {
      // Ingrédient normal
      expanded.push(ingredient);
    }
  });

  return expanded;
}

/**
 * Recherche dans les recettes par nom, ingrédients et utilisations
 * avec support pour l'exclusion d'allergènes
 */
export function searchRecipes(
  recipes: Recipe[], 
  query: string, 
  excludeAllergens: string[] = []
): Recipe[] {
  let filtered = recipes;
  
  // Exclure les recettes contenant les allergènes spécifiés
  if (excludeAllergens.length > 0) {
    filtered = filtered.filter(recipe => 
      !recipe.allergens.some(allergen => excludeAllergens.includes(allergen))
    );
  }
  
  // Recherche textuelle
  if (!query.trim()) return filtered;
  
  const searchTerm = normalizeString(query);
  
  return filtered.filter(recipe => {
    // Recherche dans le nom
    if (normalizeString(recipe.name).includes(searchTerm)) {
      return true;
    }
    
    // Recherche dans les ingrédients
    if (recipe.ingredients.some(ingredient => 
      normalizeString(ingredient.name).includes(searchTerm)
    )) {
      return true;
    }
    
    // Recherche dans les utilisations
    if (recipe.usages.some(usage => 
      normalizeString(usage).includes(searchTerm)
    )) {
      return true;
    }
    
    // Recherche dans les catégories
    if (recipe.categories.some(category => 
      normalizeString(category).includes(searchTerm)
    )) {
      return true;
    }
    
    return false;
  });
}

/**
 * Trouve des recettes liées par catégorie, allergènes, utilisations et recettes imbriquées
 */
export function findRelatedRecipes(recipe: Recipe, allRecipes: Recipe[]): {
  byCategory: Recipe[];
  byAllergens: Recipe[];
  byUsage: Recipe[];
  usedAs: Recipe[];
  manually: Recipe[];
} {
  const otherRecipes = allRecipes.filter(r => r.id !== recipe.id);
  
  const byCategory = otherRecipes.filter(r => 
    r.categories.some(cat => recipe.categories.includes(cat))
  );
  
  const byAllergens = otherRecipes.filter(r => 
    r.allergens.some(allergen => recipe.allergens.includes(allergen))
  );
  
  const byUsage = otherRecipes.filter(r => 
    r.usages.some(usage => recipe.usages.includes(usage))
  );
  
  // Trouve les recettes qui utilisent celle-ci comme ingrédient
  const usedAs = otherRecipes.filter(r =>
    r.ingredients.some(ing => ing.recipeId === recipe.id)
  );
  
  // Liens manuels
  const manually = otherRecipes.filter(r =>
    recipe.linkedRecipeIds?.includes(r.id)
  );
  
  return { byCategory, byAllergens, byUsage, usedAs, manually };
}

/**
 * Extrait tous les noms d'ingrédients uniques des recettes
 */
export function getKnownIngredients(recipes: Recipe[]): string[] {
  const ingredientNames = new Set<string>();
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ingredient => {
      if (!ingredient.recipeId) { // Exclure les recettes
        ingredientNames.add(ingredient.name);
      }
    });
  });
  return Array.from(ingredientNames).sort();
}

/**
 * Suggère des ingrédients et recettes basé sur une requête
 * Très strict: seulement si include direct ou match très fort (80%+)
 * Insensible aux accents et à la casse
 */
export function searchIngredientSuggestions(
  query: string,
  recipes: Recipe[]
): IngredientSuggestion[] {
  if (query.length < 2) return [];
  
  const normalizedQuery = normalizeString(query);
  const suggestions: IngredientSuggestion[] = [];
  const seen = new Set<string>();
  
  // 1. Chercher dans les ingrédients existants (doit contenir la requête)
  const knownIngredients = getKnownIngredients(recipes);
  knownIngredients.forEach(ingredient => {
    if (normalizeString(ingredient).includes(normalizedQuery)) {
      suggestions.push({ type: 'ingredient', name: ingredient });
      seen.add(normalizeString(ingredient));
    }
  });
  
  // 2. Chercher dans les recettes (très strict)
  recipes.forEach(recipe => {
    const normalizedRecipeName = normalizeString(recipe.name);
    
    // Include simple
    if (normalizedRecipeName.includes(normalizedQuery)) {
      if (!seen.has(normalizedRecipeName)) {
        suggestions.push({ type: 'recipe', name: recipe.name, recipeId: recipe.id });
        seen.add(normalizedRecipeName);
      }
    } else {
      // Fuzzy très strict: au moins 80% de match ou début du mot
      let matchCount = 0;
      let queryIndex = 0;
      
      for (let i = 0; i < normalizedRecipeName.length && queryIndex < normalizedQuery.length; i++) {
        if (normalizedRecipeName[i] === normalizedQuery[queryIndex]) {
          matchCount++;
          queryIndex++;
        }
      }
      
      // Au moins 80% de la query doit matcher
      const fuzzyMatch = matchCount / normalizedQuery.length >= 0.8;
      // OU le premier mot commence par la query
      const firstWordMatch = normalizedRecipeName.split(' ')[0].startsWith(normalizedQuery);
      
      if ((fuzzyMatch || firstWordMatch) && !seen.has(normalizedRecipeName)) {
        suggestions.push({ type: 'recipe', name: recipe.name, recipeId: recipe.id });
        seen.add(normalizedRecipeName);
      }
    }
  });
  
  // Limiter à 5 suggestions max
  return suggestions.slice(0, 5);
}

/**
 * Retourne la variable CSS de couleur correspondant à la priorité de la recette
 */
export function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'haute':
      return 'var(--status-bad)';
    case 'moyenne':
      return 'var(--status-warning)';
    case 'basse':
      return 'var(--status-good)';
    default:
      return 'transparent';
  }
}
