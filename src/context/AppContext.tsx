import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Recipe, Category, AppState, SearchFilters } from '../types';
import { detectAllergens, calculateTotalWeight } from '../utils/recipeUtils';
import { fetchRecipes, createRecipe as createRecipeInDB, updateRecipe as updateRecipeInDB, deleteRecipe as deleteRecipeInDB, bulkImportRecipes } from '../lib/recipes';
import type { User } from '@supabase/supabase-js';

// Données de test
const TEST_RECIPES: Omit<Recipe, 'id' | 'allergens' | 'totalWeight'>[] = [];

// Fonction pour créer les recettes de test avec ID et calculs
function createTestRecipes(): Recipe[] {
  console.log('Création des recettes de test...');
  const recipes = TEST_RECIPES.map(recipe => ({
    ...recipe,
    id: uuidv4(),
    allergens: detectAllergens(recipe.ingredients),
    totalWeight: calculateTotalWeight(recipe.ingredients)
  }));
  console.log('Recettes de test créées:', recipes.length);
  return recipes;
}

// Actions du reducer
type AppAction = 
  | { type: 'SET_RECIPES'; payload: Recipe[] }
  | { type: 'ADD_RECIPE'; payload: Recipe }
  | { type: 'UPDATE_RECIPE'; payload: Recipe }
  | { type: 'VALIDATE_IMPORTED_RECIPE'; payload: string }
  | { type: 'DELETE_RECIPE'; payload: string }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'ADD_LINKED_RECIPE'; payload: { recipeId: string; linkedRecipeId: string } }
  | { type: 'REMOVE_LINKED_RECIPE'; payload: { recipeId: string; linkedRecipeId: string } }
  | { type: 'SELECT_RECIPE'; payload: Recipe | null }
  | { type: 'SET_SEARCH_FILTERS'; payload: SearchFilters }
  | { type: 'SET_SORT_BY'; payload: 'alphabetical' | 'lastOpened' }
  | { type: 'UPDATE_LAST_OPENED'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'UPDATE_TAG_COLOR'; payload: { tagName: string; color: string } }
  | { type: 'DELETE_TAG'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_CUSTOM_ALLERGEN_DICTIONARY'; payload: Record<string, string[]> }
  | { type: 'SET_CUSTOM_ALLERGEN_EXCEPTIONS'; payload: Record<string, string[]> }
  | { type: 'SET_SELECTING_LINKED_RECIPE_FOR'; payload: string | null };

// État initial
const initialState: AppState = {
  recipes: [],
  categories: [
    { id: 'sucre', name: 'Sucré', color: '#EC4899', visible: false },
    { id: 'sale', name: 'Salé', color: '#14B8A6', visible: false },
    { id: 'boisson', name: 'Boisson', color: '#F59E0B', visible: false },
    { id: '1', name: 'Glaces', color: '#3B82F6', visible: true },
    { id: '2', name: 'Pâtes', color: '#EF4444', visible: true },
    { id: '3', name: 'Sauces', color: '#10B981', visible: true },
    { id: '4', name: 'Desserts', color: '#F59E0B', visible: true }
  ],
  tags: {}, // Tag colors mapping
  selectedRecipe: null,
  searchFilters: { query: '', categories: [], masterTags: [], allergens: [], excludeAllergens: [] },
  sortBy: 'alphabetical',
  theme: 'dark',
  customAllergenDictionary: {},
  customAllergenExceptions: {},
  selectingLinkedRecipeFor: null
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_RECIPES':
      return { ...state, recipes: action.payload };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    
    case 'ADD_RECIPE':
      const newRecipe = {
        ...action.payload,
        allergens: detectAllergens(
          action.payload.ingredients,
          state.customAllergenDictionary,
          state.customAllergenExceptions
        ),
        totalWeight: calculateTotalWeight(action.payload.ingredients)
      };
      return { ...state, recipes: [...state.recipes, newRecipe] };
    
    case 'UPDATE_RECIPE':
      const updatedRecipe = {
        ...action.payload,
        allergens: detectAllergens(
          action.payload.ingredients,
          state.customAllergenDictionary,
          state.customAllergenExceptions
        ),
        totalWeight: calculateTotalWeight(action.payload.ingredients)
      };
      return {
        ...state,
        recipes: state.recipes.map(recipe => 
          recipe.id === action.payload.id ? updatedRecipe : recipe
        ),
        selectedRecipe: state.selectedRecipe?.id === action.payload.id ? updatedRecipe : state.selectedRecipe
      };

    case 'VALIDATE_IMPORTED_RECIPE':
      return {
        ...state,
        recipes: state.recipes.map(recipe =>
          recipe.id === action.payload
            ? { ...recipe, importPendingValidation: false }
            : recipe
        ),
        selectedRecipe: state.selectedRecipe?.id === action.payload
          ? { ...state.selectedRecipe, importPendingValidation: false }
          : state.selectedRecipe
      };
    
    case 'DELETE_RECIPE':
      return {
        ...state,
        recipes: state.recipes.filter(recipe => recipe.id !== action.payload),
        selectedRecipe: state.selectedRecipe?.id === action.payload ? null : state.selectedRecipe
      };
    
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        recipes: state.recipes.map(recipe =>
          recipe.id === action.payload 
            ? { ...recipe, favorite: !recipe.favorite }
            : recipe
        ),
        selectedRecipe: state.selectedRecipe?.id === action.payload 
          ? { ...state.selectedRecipe, favorite: !state.selectedRecipe.favorite }
          : state.selectedRecipe
      };
    
    case 'ADD_LINKED_RECIPE': {
      const { recipeId, linkedRecipeId } = action.payload;
      return {
        ...state,
        recipes: state.recipes.map(recipe =>
          recipe.id === recipeId
            ? {
                ...recipe,
                linkedRecipeIds: [
                  ...(recipe.linkedRecipeIds || []),
                  linkedRecipeId
                ]
              }
            : recipe
        ),
        selectedRecipe: state.selectedRecipe?.id === recipeId
          ? {
              ...state.selectedRecipe,
              linkedRecipeIds: [
                ...(state.selectedRecipe.linkedRecipeIds || []),
                linkedRecipeId
              ]
            }
          : state.selectedRecipe
      };
    }
    
    case 'REMOVE_LINKED_RECIPE': {
      const { recipeId, linkedRecipeId } = action.payload;
      return {
        ...state,
        recipes: state.recipes.map(recipe =>
          recipe.id === recipeId
            ? {
                ...recipe,
                linkedRecipeIds: (recipe.linkedRecipeIds || []).filter(id => id !== linkedRecipeId)
              }
            : recipe
        ),
        selectedRecipe: state.selectedRecipe?.id === recipeId
          ? {
              ...state.selectedRecipe,
              linkedRecipeIds: (state.selectedRecipe.linkedRecipeIds || []).filter(id => id !== linkedRecipeId)
            }
          : state.selectedRecipe
      };
    }
    
    case 'SELECT_RECIPE':
      return { ...state, selectedRecipe: action.payload };
    
    case 'SET_SEARCH_FILTERS':
      return { ...state, searchFilters: action.payload };
    
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    
    case 'UPDATE_LAST_OPENED':
      return {
        ...state,
        recipes: state.recipes.map(recipe => 
          recipe.id === action.payload 
            ? { ...recipe, lastOpened: new Date() }
            : recipe
        )
      };
    
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(cat => 
          cat.id === action.payload.id ? action.payload : cat
        )
      };
    
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== action.payload)
      };
    
    case 'UPDATE_TAG_COLOR':
      return {
        ...state,
        tags: {
          ...state.tags,
          [action.payload.tagName]: action.payload.color
        }
      };
    
    case 'DELETE_TAG':
      return {
        ...state,
        tags: Object.fromEntries(
          Object.entries(state.tags).filter(([key]) => key !== action.payload)
        )
      };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_CUSTOM_ALLERGEN_DICTIONARY':
      return { ...state, customAllergenDictionary: action.payload };

    case 'SET_CUSTOM_ALLERGEN_EXCEPTIONS':
      return { ...state, customAllergenExceptions: action.payload };
    
    case 'SET_SELECTING_LINKED_RECIPE_FOR':
      return { ...state, selectingLinkedRecipeFor: action.payload };
    
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  loading: boolean;
  user: User;
  onSignOut: () => void;
  actions: {
    addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'allergens' | 'totalWeight'>) => Promise<void>;
    updateRecipe: (recipe: Recipe) => Promise<void>;
    deleteRecipe: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    addLinkedRecipe: (recipeId: string, linkedRecipeId: string) => void;
    removeLinkedRecipe: (recipeId: string, linkedRecipeId: string) => void;
    selectRecipe: (recipe: Recipe | null) => void;
    updateLastOpened: (id: string) => void;
    setSearchFilters: (filters: SearchFilters) => void;
    setSortBy: (sortBy: 'alphabetical' | 'lastOpened') => void;
    addCategory: (category: Omit<Category, 'id'>) => void;
    updateCategory: (category: Category) => void;
    deleteCategory: (id: string) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setCustomAllergenDictionary: (dictionary: Record<string, string[]>) => void;
    setCustomAllergenExceptions: (exceptions: Record<string, string[]>) => void;
    setSelectingLinkedRecipeFor: (recipeId: string | null) => void;
    validateImportedRecipe: (id: string) => void;
    importRecipes: (recipes: Recipe[], mode?: 'append' | 'replace') => Promise<void>;
    loadTestData: () => void;
    updateTagColor: (tagName: string, color: string) => void;
    deleteTag: (tagName: string) => void;
  };
} | null>(null);

// Hook pour utiliser le context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Provider
interface AppProviderProps {
  children: React.ReactNode;
  user: User;
  onSignOut: () => void;
}

export function AppProvider({ children, user, onSignOut }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [loading, setLoading] = useState(true);
  
  // Charger les recettes depuis Supabase
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        console.log('Chargement des recettes depuis Supabase...');
        const recipes = await fetchRecipes(user.id);
        console.log('Recettes chargées:', recipes.length);
        dispatch({ type: 'SET_RECIPES', payload: recipes });
      } catch (error) {
        console.error('Erreur lors du chargement des recettes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFromSupabase();
  }, [user.id]);

  // Sauvegarder les données locales (catégories, tags, theme, allergens) dans localStorage
  useEffect(() => {
    localStorage.setItem('longroom-local-data', JSON.stringify({
      categories: state.categories,
      theme: state.theme,
      customAllergenDictionary: state.customAllergenDictionary,
      customAllergenExceptions: state.customAllergenExceptions,
      tags: state.tags
    }));
  }, [state.categories, state.theme, state.customAllergenDictionary, state.customAllergenExceptions, state.tags]);

  // Charger les données locales du localStorage
  useEffect(() => {
    try {
      const savedLocalData = localStorage.getItem('longroom-local-data');
      if (savedLocalData) {
        const parsedData = JSON.parse(savedLocalData);
        
        if (parsedData.categories && parsedData.categories.length > 0) {
          dispatch({ type: 'SET_CATEGORIES', payload: parsedData.categories });
        }

        if (parsedData.theme) {
          dispatch({ type: 'SET_THEME', payload: parsedData.theme });
        }

        if (parsedData.customAllergenDictionary) {
          dispatch({ type: 'SET_CUSTOM_ALLERGEN_DICTIONARY', payload: parsedData.customAllergenDictionary });
        }

        if (parsedData.customAllergenExceptions) {
          dispatch({ type: 'SET_CUSTOM_ALLERGEN_EXCEPTIONS', payload: parsedData.customAllergenExceptions });
        }

        if (parsedData.tags) {
          Object.entries(parsedData.tags).forEach(([tagName, color]) => {
            dispatch({ type: 'UPDATE_TAG_COLOR', payload: { tagName, color: color as string } });
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données locales:', error);
    }
  }, []);

  const recalculateAllergens = (
    recipes: Recipe[],
    dictionary: Record<string, string[]>,
    exceptions: Record<string, string[]>
  ) => recipes.map(recipe => ({
    ...recipe,
    allergens: detectAllergens(recipe.ingredients, dictionary, exceptions)
  }));

  const normalizeForKey = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const inferImportedMetadata = (recipe: Recipe) => {
    const textParts = [
      recipe.name,
      recipe.procedure,
      ...(recipe.usages || []),
      ...(recipe.ingredients || []).map((ingredient) => ingredient.name)
    ];
    const normalizedText = normalizeForKey(textParts.join(' '));

    const hasAny = (keywords: string[]) => keywords.some((keyword) => normalizedText.includes(normalizeForKey(keyword)));

    const boissonKeywords = ['boisson', 'jus', 'sirop', 'infusion', 'the', 'cafe', 'smoothie', 'lait frappe'];
    const sucreKeywords = ['sucre', 'chocolat', 'dessert', 'gateau', 'cake', 'biscuit', 'flan', 'tarte', 'glace', 'sorbet', 'caramel', 'vanille', 'macaron', 'madeleine'];
    const saleKeywords = ['sale', 'sel', 'poivre', 'chorizo', 'kebab', 'sauce', 'potage', 'bouillon', 'pickles', 'farce', 'marinade', 'confiture d\'algues', 'dashi'];

    const existingMasterTag = (recipe.tags || []).find((tag) =>
      ['sucre', 'sale', 'boisson'].includes(normalizeForKey(tag))
    );
    let masterTag = existingMasterTag;

    if (!masterTag) {
      if (hasAny(boissonKeywords)) {
        masterTag = 'Boisson';
      } else if (hasAny(sucreKeywords) && !hasAny(saleKeywords)) {
        masterTag = 'Sucré';
      } else if (hasAny(saleKeywords) && !hasAny(sucreKeywords)) {
        masterTag = 'Salé';
      } else if (hasAny(sucreKeywords)) {
        masterTag = 'Sucré';
      } else {
        masterTag = 'Salé';
      }
    }

    const inferredCategories: string[] = [];
    if (hasAny(['glace', 'sorbet'])) {
      inferredCategories.push('Glaces');
    }
    if (hasAny(['sauce', 'vinaigrette', 'mayonnaise', 'chutney'])) {
      inferredCategories.push('Sauces');
    }
    if (hasAny(['pate', 'pâte', 'brisée', 'brisee', 'focaccia', 'pizza', 'gyoza', 'naan'])) {
      inferredCategories.push('Pâtes');
    }

    if (inferredCategories.length === 0) {
      if (masterTag === 'Sucré') {
        inferredCategories.push('Desserts');
      } else {
        inferredCategories.push('Desserts');
      }
    }

    const baseTags = (recipe.tags || []).filter((tag) => !['sucre', 'sale', 'boisson'].includes(normalizeForKey(tag)));
    const tags = Array.from(new Set([masterTag, ...baseTags, 'Import auto']));
    const categories = Array.from(new Set([...(recipe.categories || []), ...inferredCategories]));

    const importNote = '[Import auto] Recette importee automatiquement depuis Excel. Verification recommandee.';
    const notes = recipe.notes?.includes('[Import auto]')
      ? recipe.notes
      : recipe.notes
        ? `${recipe.notes}\n\n${importNote}`
        : importNote;

    return { tags, categories, notes };
  };

  const actions = {
    addRecipe: async (recipe: Omit<Recipe, 'id' | 'createdAt' | 'allergens' | 'totalWeight'>) => {
      try {
        const newRecipe: Recipe = {
          ...recipe,
          id: uuidv4(),
          createdAt: new Date(),
          allergens: detectAllergens(recipe.ingredients, state.customAllergenDictionary, state.customAllergenExceptions),
          totalWeight: calculateTotalWeight(recipe.ingredients),
          user_id: user.id
        };
        
        // Sauvegarder dans Supabase
        await createRecipeInDB(user.id, newRecipe);
        dispatch({ type: 'ADD_RECIPE', payload: newRecipe });
      } catch (error) {
        console.error('Erreur lors de l\'ajout de la recette:', error);
        throw error;
      }
    },

    updateRecipe: async (recipe: Recipe) => {
      try {
        const updatedRecipe: Recipe = {
          ...recipe,
          allergens: detectAllergens(recipe.ingredients, state.customAllergenDictionary, state.customAllergenExceptions),
          totalWeight: calculateTotalWeight(recipe.ingredients)
        };
        
        // Mettre à jour dans Supabase
        await updateRecipeInDB(updatedRecipe);
        dispatch({ type: 'UPDATE_RECIPE', payload: updatedRecipe });
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la recette:', error);
        throw error;
      }
    },

    deleteRecipe: async (id: string) => {
      try {
        // Supprimer de Supabase
        await deleteRecipeInDB(id);
        dispatch({ type: 'DELETE_RECIPE', payload: id });
      } catch (error) {
        console.error('Erreur lors de la suppression de la recette:', error);
        throw error;
      }
    },

    toggleFavorite: async (id: string) => {
      try {
        const recipe = state.recipes.find(r => r.id === id);
        if (!recipe) return;

        const updated = { ...recipe, favorite: !recipe.favorite };
        await updateRecipeInDB(updated);
        dispatch({ type: 'TOGGLE_FAVORITE', payload: id });
      } catch (error) {
        console.error('Erreur lors du toggle du favori:', error);
        throw error;
      }
    },

    addLinkedRecipe: (recipeId: string, linkedRecipeId: string) => {
      dispatch({ type: 'ADD_LINKED_RECIPE', payload: { recipeId, linkedRecipeId } });
    },

    removeLinkedRecipe: (recipeId: string, linkedRecipeId: string) => {
      dispatch({ type: 'REMOVE_LINKED_RECIPE', payload: { recipeId, linkedRecipeId } });
    },

    selectRecipe: (recipe: Recipe | null) => {
      dispatch({ type: 'SELECT_RECIPE', payload: recipe });
    },

    updateLastOpened: (id: string) => {
      dispatch({ type: 'UPDATE_LAST_OPENED', payload: id });
    },

    setSearchFilters: (filters: SearchFilters) => {
      dispatch({ type: 'SET_SEARCH_FILTERS', payload: filters });
    },

    setSortBy: (sortBy: 'alphabetical' | 'lastOpened') => {
      dispatch({ type: 'SET_SORT_BY', payload: sortBy });
    },

    addCategory: (category: Omit<Category, 'id'>) => {
      const newCategory: Category = {
        ...category,
        id: uuidv4()
      };
      dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
    },

    updateCategory: (category: Category) => {
      dispatch({ type: 'UPDATE_CATEGORY', payload: category });
    },

    deleteCategory: (id: string) => {
      dispatch({ type: 'DELETE_CATEGORY', payload: id });
    },

    setTheme: (theme: 'light' | 'dark') => {
      dispatch({ type: 'SET_THEME', payload: theme });
    },

    setCustomAllergenDictionary: (dictionary: Record<string, string[]>) => {
      dispatch({ type: 'SET_CUSTOM_ALLERGEN_DICTIONARY', payload: dictionary });
      const updatedRecipes = recalculateAllergens(state.recipes, dictionary, state.customAllergenExceptions);
      dispatch({ type: 'SET_RECIPES', payload: updatedRecipes });
    },

    setCustomAllergenExceptions: (exceptions: Record<string, string[]>) => {
      dispatch({ type: 'SET_CUSTOM_ALLERGEN_EXCEPTIONS', payload: exceptions });
      const updatedRecipes = recalculateAllergens(state.recipes, state.customAllergenDictionary, exceptions);
      dispatch({ type: 'SET_RECIPES', payload: updatedRecipes });
    },

    setSelectingLinkedRecipeFor: (recipeId: string | null) => {
      dispatch({ type: 'SET_SELECTING_LINKED_RECIPE_FOR', payload: recipeId });
    },

    validateImportedRecipe: (id: string) => {
      dispatch({ type: 'VALIDATE_IMPORTED_RECIPE', payload: id });
    },

    importRecipes: async (recipes: Recipe[], mode: 'append' | 'replace' = 'append') => {
      const preparedImportedRecipes = recipes.map((recipe) => {
        const safeIngredients = (recipe.ingredients || []).map((ingredient) => ({
          ...ingredient,
          id: ingredient.id || uuidv4(),
          quantity: Number.isFinite(Number(ingredient.quantity)) ? Number(ingredient.quantity) : 0,
          unit: ingredient.unit || ''
        }));

        const baseRecipe: Recipe = {
          ...recipe,
          id: recipe.id || uuidv4(),
          ingredients: safeIngredients,
          categories: recipe.categories || [],
          tags: recipe.tags || [],
          usages: recipe.usages || [],
          source: recipe.source || 'Import JSON',
          notes: recipe.notes || '',
          favorite: Boolean(recipe.favorite),
          createdAt: recipe.createdAt ? new Date(recipe.createdAt) : new Date(),
          lastOpened: recipe.lastOpened ? new Date(recipe.lastOpened) : undefined,
          allergens: detectAllergens(safeIngredients, state.customAllergenDictionary, state.customAllergenExceptions),
          totalWeight: calculateTotalWeight(safeIngredients),
          priority: 'moyenne',
          importedAutomatically: true,
          importPendingValidation: true,
          user_id: user.id
        };

        const metadata = inferImportedMetadata(baseRecipe);

        return {
          ...baseRecipe,
          categories: metadata.categories,
          tags: metadata.tags,
          notes: metadata.notes
        } as Recipe;
      });

      try {
        // Sauvegarder dans Supabase (bulk import)
        if (preparedImportedRecipes.length > 0) {
          console.log(`⏳ Import en cours de ${preparedImportedRecipes.length} recettes dans Supabase...`);
          await bulkImportRecipes(user.id, preparedImportedRecipes);
          console.log(`✅ ${preparedImportedRecipes.length} recettes importées dans Supabase`);
        }
      } catch (error) {
        console.error('Erreur lors de l\'import bulk:', error);
        window.alert(`⚠️ Erreur lors de l'import: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
        throw error;
      }

      if (mode === 'replace') {
        dispatch({ type: 'SET_RECIPES', payload: preparedImportedRecipes });
        return;
      }

      const existingNameKeys = new Set(state.recipes.map((recipe) => normalizeForKey(recipe.name)));
      const uniqueImported = preparedImportedRecipes.filter((recipe) => !existingNameKeys.has(normalizeForKey(recipe.name)));

      dispatch({ type: 'SET_RECIPES', payload: [...state.recipes, ...uniqueImported] });
    },

    loadTestData: () => {
      const testRecipes = createTestRecipes();
      dispatch({ type: 'SET_RECIPES', payload: testRecipes });
    },

    updateTagColor: (tagName: string, color: string) => {
      dispatch({ type: 'UPDATE_TAG_COLOR', payload: { tagName, color } });
    },

    deleteTag: (tagName: string) => {
      dispatch({ type: 'DELETE_TAG', payload: tagName });
    }
  };  return (
    <AppContext.Provider value={{ state, dispatch, actions, loading, user, onSignOut }}>
      {children}
    </AppContext.Provider>
  );
}
