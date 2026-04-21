// Types principaux pour l'application de recettes

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  allergens?: string[];
  recipeId?: string; // Si défini, c'est une référence à une autre recette
}

export interface IngredientSuggestion {
  type: 'ingredient' | 'recipe';
  name: string;
  recipeId?: string;
}

export type RecipePriority = 'haute' | 'moyenne' | 'basse';

export interface Recipe {
  id: string;
  user_id?: string; // UUID de l'utilisateur Supabase
  name: string;
  ingredients: Ingredient[];
  procedure: string;
  usages: string[];
  source?: string;
  categories: string[];
  tags: string[];
  allergens: string[];
  totalWeight?: number;
  priority?: RecipePriority;
  importPendingValidation?: boolean;
  importedAutomatically?: boolean;
  notes?: string;
  favorite?: boolean;
  linkedRecipeIds?: string[]; // Liens manuels vers d'autres recettes
  unitWeight?: number; // Poids d'une unité (ex: 200g pour une pizza)
  unitLabel?: string; // Nom de l'unité (ex: "pizza", "lot")
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  created_at?: Date;
  createdAt: Date;
  updated_at?: Date;
  lastOpened?: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

export interface SearchFilters {
  query: string;
  categories: string[];
  masterTags: string[];
  allergens: string[];
  excludeAllergens: string[]; // Allergènes à exclure
}

export const MASTER_TAGS = ['Sucré', 'Salé', 'Boisson'];

export interface AppState {
  recipes: Recipe[];
  categories: Category[];
  tags: Record<string, string>; // Tag name -> color mapping
  selectedRecipe: Recipe | null;
  searchFilters: SearchFilters;
  sortBy: 'alphabetical' | 'lastOpened';
  theme: 'light' | 'dark';
  customAllergenDictionary: AllergenDictionary;
  customAllergenExceptions: AllergenExceptions;
  selectingLinkedRecipeFor?: string | null; // ID de la recette pour laquelle on ajoute une liaison
}

// Dictionnaire d'allergènes communs
export type AllergenDictionary = Record<string, string[]>;
export type AllergenExceptions = Record<string, string[]>;

export const DEFAULT_ALLERGEN_DICTIONARY: AllergenDictionary = {
  lactose: ['lait', 'beurre', 'crème', 'fromage', 'yaourt', 'mascarpone', 'ricotta', 'mozzarella'],
  gluten: ['farine', 'blé', 'orge', 'seigle', 'avoine', 'pain', 'pâtes'],
  œuf: ['œuf', 'oeuf', 'blanc d\'œuf', 'jaune d\'œuf', 'œufs'],
  fruits_a_coque: ['amande', 'noix', 'noisette', 'pistache', 'noix de cajou', 'noix de pécan'],
  arachide: ['cacahuète', 'arachide', 'beurre de cacahuète'],
  soja: ['soja', 'sauce soja', 'tofu', 'lécithine de soja'],
  poisson: ['poisson', 'saumon', 'thon', 'morue', 'anchois'],
  crustaces: ['crevette', 'crabe', 'homard', 'écrevisse'],
  sulfites: ['vin', 'vinaigre', 'fruits secs']
};

// Unités de mesure courantes
export const UNITS = [
  'g', 'kg', 'ml', 'l', 'cl', 'dl',
  'cuillère à soupe', 'cuillère à café', 'c. à s.', 'c. à c.',
  'tasse', 'verre', 'pincée', 'pièce', 'gousse', 'tranche'
];

// Liste des allergènes disponibles pour les filtres
export const AVAILABLE_ALLERGENS = [
  'lactose', 'gluten', 'œuf', 'fruits_a_coque', 'arachide', 
  'soja', 'poisson', 'crustaces', 'sulfites'
];

// Labels d'affichage pour les allergènes
export const ALLERGEN_LABELS: Record<string, string> = {
  lactose: 'Lactose',
  gluten: 'Gluten',
  œuf: 'Œuf',
  fruits_a_coque: 'Fruits à coque',
  arachide: 'Arachide',
  soja: 'Soja',
  poisson: 'Poisson',
  crustaces: 'Crustacés',
  sulfites: 'Sulfites'
};
