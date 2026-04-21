import { useState, useMemo, useEffect } from 'react';
import { Plus, Filter, SortAsc, Moon, Sun, Settings, Heart, Palette } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { searchRecipes } from '../utils/recipeUtils';
import { AVAILABLE_ALLERGENS, ALLERGEN_LABELS, MASTER_TAGS } from '../types';
import RecipeCard from './RecipeCard';
import SearchBar from './SearchBar';
import AllergenSettings from './AllergenSettings';
import TagColorEditor from './TagColorEditor';
import { ProfileButton } from './ProfileButton';
import type { Recipe } from '../types';
import './HomePage.css';

interface HomePageProps {
  onRecipeSelect?: (recipe: Recipe | null) => void;
}

export default function HomePage({ onRecipeSelect }: HomePageProps) {
  const { state, actions } = useApp();
  const [showFilters, setShowFilters] = useState(false);
  const [showAllergenSettings, setShowAllergenSettings] = useState(false);
  const [showTagColorEditor, setShowTagColorEditor] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(() => {
    // Charger depuis localStorage
    const saved = localStorage.getItem('longroom-show-favorites');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Sauvegarder quand le state change
  useEffect(() => {
    localStorage.setItem('longroom-show-favorites', JSON.stringify(showOnlyFavorites));
  }, [showOnlyFavorites]);
  
  // Debug: afficher les informations sur les recettes
  console.log('HomePage - Nombre de recettes:', state.recipes.length);
  console.log('HomePage - Recettes:', state.recipes.map(r => r.name));
  
  // Vérifier si des filtres/recherche sont actifs
  const hasActiveFiltersOrSearch = 
    state.searchFilters.query.length > 0 ||
    state.searchFilters.categories.length > 0 ||
    state.searchFilters.masterTags.length > 0 ||
    state.searchFilters.allergens.length > 0 ||
    state.searchFilters.excludeAllergens.length > 0;
  
  // Désactiver le mode "favoris uniquement" si des filtres/recherche sont appliqués
  const shouldShowOnlyFavorites = showOnlyFavorites && !hasActiveFiltersOrSearch;
  
  // Filtrage et tri des recettes
  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = searchRecipes(
      state.recipes, 
      state.searchFilters.query, 
      state.searchFilters.excludeAllergens
    );
    
    // Filtrage par catégories
    if (state.searchFilters.categories.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.categories.some(cat => state.searchFilters.categories.includes(cat))
      );
    }

    // Filtrage par types (Sucré / Salé / Boisson)
    if (state.searchFilters.masterTags.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.tags.some(tag => state.searchFilters.masterTags.includes(tag))
      );
    }
    
    // Filtrage par allergènes (inclusion)
    if (state.searchFilters.allergens.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.allergens.some(allergen => state.searchFilters.allergens.includes(allergen))
      );
    }
    
    // Afficher seulement les favoris si le mode est activé et pas de filtres
    if (shouldShowOnlyFavorites) {
      filtered = filtered.filter(r => r.favorite);
    }
    
    // Séparer favoris et non-favoris pour le tri
    const favorites = filtered.filter(r => r.favorite);
    const nonFavorites = filtered.filter(r => !r.favorite);
    
    // Tri
    const sortFn = (recipes: Recipe[]) => {
      return [...recipes].sort((a, b) => {
        if (state.sortBy === 'alphabetical') {
          return a.name.localeCompare(b.name);
        } else {
          const aLastOpened = a.lastOpened?.getTime() || 0;
          const bLastOpened = b.lastOpened?.getTime() || 0;
          return bLastOpened - aLastOpened;
        }
      });
    };
    
    // Retourner favoris en premier, puis les autres (sauf si showOnlyFavorites est actif)
    return shouldShowOnlyFavorites ? sortFn(favorites) : [...sortFn(favorites), ...sortFn(nonFavorites)];
  }, [state.recipes, state.searchFilters, state.sortBy, shouldShowOnlyFavorites]);
  
  const handleRecipeClick = (recipe: Recipe) => {
    actions.updateLastOpened(recipe.id);
    
    // Si on est en mode sélection de liaison, ajouter la liaison et revenir
    if (state.selectingLinkedRecipeFor) {
      actions.addLinkedRecipe(state.selectingLinkedRecipeFor, recipe.id);
      actions.setSelectingLinkedRecipeFor(null);
      // Retourner à la recette
      actions.selectRecipe(state.recipes.find(r => r.id === state.selectingLinkedRecipeFor) || null);
      return;
    }
    
    if (onRecipeSelect) {
      onRecipeSelect(recipe);
    } else {
      actions.selectRecipe(recipe);
    }
  };
  
  const handleCreateRecipe = () => {
    if (onRecipeSelect) {
      onRecipeSelect(null); // null indique création d'une nouvelle recette
    } else {
      actions.selectRecipe(null);
    }
  };
  
  const toggleSort = () => {
    actions.setSortBy(state.sortBy === 'alphabetical' ? 'lastOpened' : 'alphabetical');
  };
  
  const toggleTheme = () => {
    actions.setTheme(state.theme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Longroom - Recettes</h1>
        <div className="header-actions">
          <button
            className="icon-button theme-button"
            onClick={toggleTheme}
            title={state.theme === 'light' ? 'Mode sombre' : 'Mode clair'}
          >
            {state.theme === 'light' ? <Moon /> : <Sun />}
          </button>
          
          <button
            className={`icon-button ${showOnlyFavorites ? 'active' : ''}`}
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            title={showOnlyFavorites ? 'Afficher toutes les recettes' : 'Afficher seulement les favoris'}
          >
            <Heart fill={showOnlyFavorites ? 'currentColor' : 'none'} />
          </button>
          
          <button
            className="icon-button sort-button"
            onClick={toggleSort}
            title={state.sortBy === 'alphabetical' ? 'Trier par dernière ouverture' : 'Trier par ordre alphabétique'}
          >
            <SortAsc />
            <span className="sort-label">
              {state.sortBy === 'alphabetical' ? 'A-Z' : 'Récent'}
            </span>
          </button>
          
          <button
            className={`icon-button filter-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filtres"
          >
            <Filter />
          </button>
          <button
            className="icon-button filter-button"
            onClick={() => setShowAllergenSettings(true)}
            title="Gérer les mots-clés d'allergènes"
          >
            <Settings />
          </button>
          <button
            className="icon-button filter-button"
            onClick={() => setShowTagColorEditor(true)}
            title="Personnaliser les couleurs des tags"
          >
            <Palette />
          </button>
          
          <button
            className="primary-button create-button"
            onClick={handleCreateRecipe}
            title="Créer une nouvelle recette"
          >
            <Plus />
            <span>Nouvelle recette</span>
          </button>
          
          <button
            className="secondary-button"
            onClick={() => {
              const exampleRecipes: Recipe[] = [
                {
                  id: '1',
                  name: 'Pâte à choux',
                  ingredients: [
                    { id: '1', name: 'eau', quantity: 250, unit: 'ml' },
                    { id: '2', name: 'beurre', quantity: 125, unit: 'g' },
                    { id: '3', name: 'farine', quantity: 150, unit: 'g' },
                    { id: '4', name: 'œufs', quantity: 4, unit: 'pièce' }
                  ],
                  procedure: 'Porter à ébullition, retirer du feu, ajouter la farine, remettre 2-3 min, incorporer les œufs.',
                  usages: ['éclairs', 'profiteroles'],
                  source: 'Classique',
                  categories: ['Pâtes'],
                  tags: ['Sucré'],
                  createdAt: new Date(),
                  allergens: [],
                  totalWeight: 525,
                  favorite: false,
                  priority: 'moyenne'
                },
                {
                  id: '2',
                  name: 'Mayonnaise',
                  ingredients: [
                    { id: '5', name: 'œuf', quantity: 1, unit: 'pièce' },
                    { id: '6', name: 'huile', quantity: 250, unit: 'ml' },
                    { id: '7', name: 'moutarde', quantity: 1, unit: 'c.à.c.' }
                  ],
                  procedure: 'Jaune œuf + moutarde, incorporer huile goutte à goutte.',
                  usages: ['sandwichs', 'salades'],
                  source: 'Basique',
                  categories: ['Sauces'],
                  tags: ['Salé'],
                  createdAt: new Date(),
                  allergens: [],
                  totalWeight: 251,
                  favorite: false,
                  priority: 'moyenne'
                }
              ];
              actions.importRecipes(exampleRecipes);
              window.alert(`${exampleRecipes.length} recettes d'exemple ajoutées!`);
            }}
            title="Charger quelques recettes d'exemple"
          >
            📚 Exemples
          </button>
          
          <ProfileButton />
        </div>
      </header>
      
      <div className="search-section">
        {state.selectingLinkedRecipeFor && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--accent-color)',
            color: 'white',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            📌 Clique sur la recette que tu veux lier
          </div>
        )}
        <SearchBar />
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <h3>Tags</h3>
              <div className="filter-chips">
                {state.categories
                  .filter(cat => cat.visible && !MASTER_TAGS.includes(cat.name))
                  .map(category => (
                  <label key={category.id} className="filter-chip">
                    <input
                      type="checkbox"
                      checked={state.searchFilters.categories.includes(category.name)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...state.searchFilters.categories, category.name]
                          : state.searchFilters.categories.filter(c => c !== category.name);
                        actions.setSearchFilters({
                          ...state.searchFilters,
                          categories: newCategories
                        });
                      }}
                    />
                    <span className="chip-label" style={{ backgroundColor: category.color }}>
                      {category.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h3>Type (Sucré / Salé / Boisson)</h3>
              <div className="filter-chips">
                {MASTER_TAGS.map((tag) => {
                  const categoryMeta = state.categories.find(cat => cat.name === tag);
                  const color = categoryMeta?.color ?? '#9CA3AF';
                  return (
                    <label key={tag} className="filter-chip">
                      <input
                        type="checkbox"
                        checked={state.searchFilters.masterTags.includes(tag)}
                        onChange={(e) => {
                          const newTags = e.target.checked
                            ? [...state.searchFilters.masterTags, tag]
                            : state.searchFilters.masterTags.filter(t => t !== tag);
                          actions.setSearchFilters({
                            ...state.searchFilters,
                            masterTags: newTags
                          });
                        }}
                      />
                      <span className="chip-label" style={{ backgroundColor: color }}>
                        {tag}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <div className="filter-group">
              <h3>Exclure les allergènes</h3>
              <div className="filter-chips">
                {AVAILABLE_ALLERGENS.map(allergen => (
                  <label key={allergen} className="filter-chip allergen-chip">
                    <input
                      type="checkbox"
                      checked={state.searchFilters.excludeAllergens.includes(allergen)}
                      onChange={(e) => {
                        const newExcludeAllergens = e.target.checked
                          ? [...state.searchFilters.excludeAllergens, allergen]
                          : state.searchFilters.excludeAllergens.filter(a => a !== allergen);
                        actions.setSearchFilters({
                          ...state.searchFilters,
                          excludeAllergens: newExcludeAllergens
                        });
                      }}
                    />
                    <span className="chip-label allergen-label">
                      {ALLERGEN_LABELS[allergen]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <main className="recipes-grid">
        {showAllergenSettings && (
          <AllergenSettings onClose={() => setShowAllergenSettings(false)} />
        )}
        {showTagColorEditor && (
          <TagColorEditor onClose={() => setShowTagColorEditor(false)} />
        )}
        {filteredAndSortedRecipes.length === 0 ? (
          <div className="empty-state">
            <p>Aucune recette trouvée</p>
            {hasActiveFiltersOrSearch && (
              <button className="secondary-button" onClick={() => actions.setSearchFilters({ query: '', categories: [], masterTags: [], allergens: [], excludeAllergens: [] })}>
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          filteredAndSortedRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => handleRecipeClick(recipe)}
            />
          ))
        )}
      </main>
    </div>
  );
}
