import { useState } from 'react';
import { ArrowLeft, Edit2, Scale, AlertTriangle, Share2, Trash2, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adjustRecipeProportions, findRelatedRecipes, expandIngredients, searchIngredientSuggestions } from '../utils/recipeUtils';
import { getContrastingTextColor, stringToColor } from '../utils/colorUtils';
import type { Recipe, IngredientSuggestion } from '../types';
import './RecipePage.css';

interface RecipePageProps {
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRecipeSelect: (recipe: Recipe) => void;
}

export default function RecipePage({ recipe, onBack, onEdit, onDelete, onRecipeSelect }: RecipePageProps) {
  const { state, actions } = useApp();
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [adjustedRecipe, setAdjustedRecipe] = useState<Recipe | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExpandedIngredients, setShowExpandedIngredients] = useState(false);
  const [expandedRelatedSections, setExpandedRelatedSections] = useState<Set<string>>(new Set());
  const [linkedRecipeSearch, setLinkedRecipeSearch] = useState('');
  const [linkedRecipeSuggestions, setLinkedRecipeSuggestions] = useState<IngredientSuggestion[]>([]);
  const [unitCount, setUnitCount] = useState<string>('');
  
  const relatedRecipes = findRelatedRecipes(recipe, state.recipes);
  
  console.log('Related recipes:', { manually: relatedRecipes.manually?.length, usedAs: relatedRecipes.usedAs?.length, byCategory: relatedRecipes.byCategory?.length, byUsage: relatedRecipes.byUsage?.length, byAllergens: relatedRecipes.byAllergens?.length });
  
  // Calculer automatiquement le poids si unitWeight est défini et unitCount est saisi
  const handleUnitCountChange = (value: string) => {
    setUnitCount(value);
    if (recipe.unitWeight && value) {
      const count = parseFloat(value);
      if (count > 0) {
        const calculatedWeight = recipe.unitWeight * count;
        setTargetWeight(calculatedWeight.toString());
        const adjusted = adjustRecipeProportions(recipe, calculatedWeight);
        setAdjustedRecipe(adjusted);
      }
    } else {
      setTargetWeight('');
      setAdjustedRecipe(null);
    }
  };
  
  const handleAdjustProportions = () => {
    const weight = parseFloat(targetWeight);
    if (weight > 0) {
      const adjusted = adjustRecipeProportions(recipe, weight);
      setAdjustedRecipe(adjusted);
    }
  };
  
  const resetProportions = () => {
    setAdjustedRecipe(null);
    setTargetWeight('');
  };
  
  const displayRecipe = adjustedRecipe || recipe;
  
  const hasNestedRecipes = displayRecipe.ingredients.some(ing => ing.recipeId);
  const expandedIngredients = showExpandedIngredients && hasNestedRecipes 
    ? expandIngredients(displayRecipe.ingredients, state.recipes)
    : displayRecipe.ingredients;
  
  const toggleRelatedSection = (section: string) => {
    const newSet = new Set(expandedRelatedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedRelatedSections(newSet);
  };
  
  const handleLinkedRecipeSearch = (query: string) => {
    setLinkedRecipeSearch(query);
    
    if (query.length >= 2) {
      // Chercher seulement les recettes (not ingredient suggestions)
      const suggestions = searchIngredientSuggestions(query, state.recipes)
        .filter(s => s.type === 'recipe' && s.recipeId !== recipe.id && !recipe.linkedRecipeIds?.includes(s.recipeId!));
      setLinkedRecipeSuggestions(suggestions);
    } else {
      setLinkedRecipeSuggestions([]);
    }
  };
  
  const addLinkedRecipe = (linkedRecipeId: string) => {
    actions.addLinkedRecipe(recipe.id, linkedRecipeId);
    setLinkedRecipeSearch('');
    setLinkedRecipeSuggestions([]);
  };
  
  const formatIngredient = (ingredient: typeof recipe.ingredients[0]) => {
    return `${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`;
  };
  
  return (
    <div className="recipe-page">
      <header className="recipe-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft />
          <span>Retour</span>
        </button>
        
        <div className="recipe-actions">
          <button 
            className={`icon-button favorite-button ${recipe.favorite ? 'active' : ''}`}
            onClick={() => actions.toggleFavorite(recipe.id)}
            title={recipe.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart fill={recipe.favorite ? 'currentColor' : 'none'} />
            <span>{recipe.favorite ? 'Favoris' : 'Ajouter'}</span>
          </button>
          <button className="icon-button" onClick={onEdit}>
            <Edit2 />
            <span>Éditer</span>
          </button>
          <button 
            className="icon-button delete-button" 
            onClick={() => setShowDeleteConfirm(true)}
            title="Supprimer la recette"
          >
            <Trash2 />
            <span>Supprimer</span>
          </button>
          <button className="icon-button">
            <Share2 />
            <span>Partager</span>
          </button>
        </div>
      </header>
      
      <div className="recipe-content">
        <div className="recipe-main">
          <h1 className="recipe-title">{recipe.name}</h1>
          
          {recipe.tags.some(tag => ['Sucré', 'Salé', 'Boisson'].includes(tag)) && (
            <div className="recipe-type">
              {recipe.tags.filter(tag => ['Sucré', 'Salé', 'Boisson'].includes(tag)).map((type, index) => {
                const typeMeta = state.categories.find(cat => cat.name === type);
                const backgroundColor = typeMeta?.color ?? stringToColor(type);
                const textColor = getContrastingTextColor(backgroundColor);

                return (
                  <span
                    key={index}
                    className="type-tag"
                    style={{ backgroundColor, color: textColor }}
                  >
                    {type}
                  </span>
                );
              })}
            </div>
          )}
          
          {recipe.categories.length > 0 && (
            <div className="recipe-categories">
              {recipe.categories.map((category, index) => {
                const categoryMeta = state.categories.find(cat => cat.name === category);
                const backgroundColor = categoryMeta?.color ?? stringToColor(category);
                const textColor = getContrastingTextColor(backgroundColor);

                return (
                  <span
                    key={index}
                    className="category-tag"
                    style={{ backgroundColor, color: textColor }}
                  >
                    {category}
                  </span>
                );
              })}
            </div>
          )}

          {recipe.importPendingValidation && (
            <div className="import-warning">
              <AlertTriangle size={20} />
              <div className="import-warning-content">
                <strong>Recette importée automatiquement</strong>
                <span>Vérifie les ingrédients, tags et catégories puis valide pour retirer l'alerte.</span>
              </div>
              <button
                className="secondary-button"
                onClick={() => actions.validateImportedRecipe(recipe.id)}
              >
                Valider la recette
              </button>
            </div>
          )}
          
          {recipe.allergens.length > 0 && (
            <div className="allergens-warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Allergènes détectés :</strong>
                <span>{recipe.allergens.join(', ')}</span>
              </div>
            </div>
          )}
          
          <div className="proportion-adjuster">
            <h3>
              <Scale />
              Ajuster les proportions
            </h3>
            
            {recipe.unitWeight && recipe.unitLabel && (
              <div className="adjuster-controls">
                <div className="weight-input">
                  <label>Nombre de {recipe.unitLabel}s :</label>
                  <input
                    type="number"
                    value={unitCount}
                    onChange={(e) => handleUnitCountChange(e.target.value)}
                    placeholder="Ex: 4"
                    min="0"
                  />
                </div>
                {unitCount && (
                  <div className="unit-calculation">
                    <p>{unitCount} × {recipe.unitWeight}g = <strong>{(parseFloat(unitCount) * recipe.unitWeight).toFixed(0)}g total</strong></p>
                  </div>
                )}
              </div>
            )}
            
            <div className="adjuster-controls">
              <div className="weight-input">
                <label>Poids total souhaité (g) :</label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder={recipe.totalWeight ? recipe.totalWeight.toString() : '500'}
                />
              </div>
              <button
                className="primary-button"
                onClick={handleAdjustProportions}
                disabled={!targetWeight || parseFloat(targetWeight) <= 0}
              >
                Ajuster
              </button>
              {adjustedRecipe && (
                <button className="secondary-button" onClick={resetProportions}>
                  Reset
                </button>
              )}
            </div>
            {adjustedRecipe && (
              <div className="adjustment-info">
                <p>Proportions ajustées pour {targetWeight}g (ratio: {((parseFloat(targetWeight) / (recipe.totalWeight || 1)) * 100).toFixed(0)}%)</p>
              </div>
            )}
          </div>
          
          <section className="recipe-section">
            <div className="section-header-with-toggle">
              <h2>Ingrédients</h2>
              {hasNestedRecipes && (
                <button 
                  className="toggle-button"
                  onClick={() => setShowExpandedIngredients(!showExpandedIngredients)}
                >
                  {showExpandedIngredients ? 'Voir recettes' : 'Voir détails'}
                </button>
              )}
            </div>
            <ul className="ingredients-list">
              {expandedIngredients.map((ingredient, index) => (
                <li key={`${ingredient.id}-${index}`} className={`ingredient-item ${ingredient.recipeId && !showExpandedIngredients ? 'recipe-reference' : ''} ${(ingredient as any)._expandedFromRecipe ? 'expanded-ingredient' : ''}`}>
                  <span className="ingredient-content">
                    {formatIngredient(ingredient)}
                    {ingredient.recipeId && !showExpandedIngredients && (
                      <span className="recipe-ref-badge">Recette</span>
                    )}
                  </span>
                  <span className="ingredient-percentage">
                    {displayRecipe.totalWeight && displayRecipe.totalWeight > 0
                      ? `(${((ingredient.quantity / displayRecipe.totalWeight) * 100).toFixed(1)}%)`
                      : `${ingredient.quantity} ${ingredient.unit}`
                    }
                  </span>
                </li>
              ))}
            </ul>
            {displayRecipe.totalWeight && displayRecipe.totalWeight > 0 && !showExpandedIngredients && (
              <p className="total-weight">
                <strong>Poids total : {Math.round(displayRecipe.totalWeight)}g</strong>
              </p>
            )}
            {showExpandedIngredients && expandedIngredients.some((ing: any) => ing._expandedFromRecipe) && (() => {
              const expandedItems = expandedIngredients.filter((ing: any) => ing._expandedFromRecipe);
              const expandedTotal = Math.round(expandedItems.reduce((sum, ing) => sum + (ing.quantity || 0), 0));
              return expandedTotal > 0 ? (
                <p className="total-weight">
                  <strong>Poids total (détails) : {expandedTotal}g</strong>
                </p>
              ) : null;
            })()}
          </section>
          
          <section className="recipe-section">
            <h2>Procédé</h2>
            <div className="procedure-content">
              {recipe.procedure.split('\n').map((step, index) => (
                <p key={index}>{step}</p>
              ))}
            </div>
          </section>
          
          {recipe.usages.length > 0 && (
            <section className="recipe-section">
              <h2>Utilisations possibles</h2>
              <ul className="usages-list">
                {recipe.usages.map((usage, index) => (
                  <li key={index}>{usage}</li>
                ))}
              </ul>
            </section>
          )}
          
          {recipe.source && (
            <section className="recipe-section">
              <h2>Source</h2>
              <p className="source">{recipe.source}</p>
            </section>
          )}
          
          {recipe.notes && (
            <section className="recipe-section">
              <h2>Notes</h2>
              <div className="notes-content">
                {recipe.notes.split('\n').map((note, index) => (
                  <p key={index}>{note}</p>
                ))}
              </div>
            </section>
          )}
        </div>
        
        <aside className="recipe-sidebar">
          <div className="related-recipes">
            <h3>Recettes liées</h3>
            
            {relatedRecipes.manually && relatedRecipes.manually.length > 0 && (
              <div className="related-group primary">
                <h4 className="related-group-title">
                  <span className="manual-icon">⭐</span>
                  Mes liaisons
                </h4>
                <ul>
                  {relatedRecipes.manually.map(r => (
                    <li 
                      key={r.id} 
                      className="related-recipe with-action"
                    >
                      <span onClick={() => onRecipeSelect(r)}>{r.name}</span>
                      <button 
                        className="unlink-button"
                        onClick={() => actions.removeLinkedRecipe(recipe.id, r.id)}
                        title="Retirer cette liaison"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {relatedRecipes.usedAs.length > 0 && (
              <div className="related-group primary">
                <h4 className="related-group-title">
                  <span className="recipe-icon">🔗</span>
                  Ingrédient de
                </h4>
                <ul>
                  {relatedRecipes.usedAs
                    .slice(0, expandedRelatedSections.has('usedAs') ? undefined : 3)
                    .map(r => (
                    <li 
                      key={r.id} 
                      className="related-recipe"
                      onClick={() => onRecipeSelect(r)}
                    >
                      {r.name}
                    </li>
                  ))}
                </ul>
                {relatedRecipes.usedAs.length > 3 && (
                  <button
                    className="expand-button"
                    onClick={() => toggleRelatedSection('usedAs')}
                  >
                    {expandedRelatedSections.has('usedAs')
                      ? `− Masquer ${relatedRecipes.usedAs.length - 3}`
                      : `+ Voir ${relatedRecipes.usedAs.length - 3} de plus`}
                  </button>
                )}
              </div>
            )}
            
            {relatedRecipes.byCategory.length > 0 && (
              <div className="related-group secondary">
                <h4 className="related-group-title secondary-title">
                  <span className="category-icon">📁</span>
                  Même catégorie
                </h4>
                <ul>
                  {relatedRecipes.byCategory
                    .slice(0, expandedRelatedSections.has('byCategory') ? undefined : 2)
                    .map(r => (
                    <li 
                      key={r.id} 
                      className="related-recipe"
                      onClick={() => onRecipeSelect(r)}
                    >
                      {r.name}
                    </li>
                  ))}
                </ul>
                {relatedRecipes.byCategory.length > 2 && (
                  <button
                    className="expand-button secondary"
                    onClick={() => toggleRelatedSection('byCategory')}
                  >
                    {expandedRelatedSections.has('byCategory')
                      ? `− Masquer`
                      : `+ ${relatedRecipes.byCategory.length - 2} de plus`}
                  </button>
                )}
              </div>
            )}
            
            {relatedRecipes.byUsage.length > 0 && (
              <div className="related-group secondary">
                <h4 className="related-group-title secondary-title">
                  <span className="usage-icon">💡</span>
                  Utilisations similaires
                </h4>
                <ul>
                  {relatedRecipes.byUsage
                    .slice(0, expandedRelatedSections.has('byUsage') ? undefined : 2)
                    .map(r => (
                    <li 
                      key={r.id} 
                      className="related-recipe"
                      onClick={() => onRecipeSelect(r)}
                    >
                      {r.name}
                    </li>
                  ))}
                </ul>
                {relatedRecipes.byUsage.length > 2 && (
                  <button
                    className="expand-button secondary"
                    onClick={() => toggleRelatedSection('byUsage')}
                  >
                    {expandedRelatedSections.has('byUsage')
                      ? `− Masquer`
                      : `+ ${relatedRecipes.byUsage.length - 2} de plus`}
                  </button>
                )}
              </div>
            )}
            
            {relatedRecipes.byAllergens.length > 0 && (
              <div className="related-group secondary">
                <h4 className="related-group-title secondary-title">
                  <span className="allergen-icon">⚠️</span>
                  Allergènes communs
                </h4>
                <ul>
                  {relatedRecipes.byAllergens
                    .slice(0, expandedRelatedSections.has('byAllergens') ? undefined : 2)
                    .map(r => (
                    <li 
                      key={r.id} 
                      className="related-recipe"
                      onClick={() => onRecipeSelect(r)}
                    >
                      {r.name}
                    </li>
                  ))}
                </ul>
                {relatedRecipes.byAllergens.length > 2 && (
                  <button
                    className="expand-button secondary"
                    onClick={() => toggleRelatedSection('byAllergens')}
                  >
                    {expandedRelatedSections.has('byAllergens')
                      ? `− Masquer`
                      : `+ ${relatedRecipes.byAllergens.length - 2} de plus`}
                  </button>
                )}
              </div>
            )}
            
            <div className="add-linked-recipe">
              <label htmlFor="linked-recipe-input">Ajouter une liaison :</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="linked-recipe-input"
                  type="text"
                  value={linkedRecipeSearch}
                  onChange={(e) => handleLinkedRecipeSearch(e.target.value)}
                  onBlur={() => setTimeout(() => setLinkedRecipeSuggestions([]), 200)}
                  placeholder="Chercher une recette à lier..."
                  className="form-input"
                  autoComplete="off"
                  style={{ paddingRight: '12px' }}
                />
                
                {linkedRecipeSuggestions.length > 0 && (
                  <div className="ingredient-suggestions" style={{ top: 'calc(100% + 4px)' }}>
                    {linkedRecipeSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="suggestion-item recipe"
                        onClick={() => addLinkedRecipe(suggestion.recipeId!)}
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
      
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Supprimer la recette</h3>
            <p>Êtes-vous sûr de vouloir supprimer définitivement la recette "{recipe.name}" ?</p>
            <div className="modal-actions">
              <button 
                className="secondary-button" 
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </button>
              <button 
                className="primary-button delete-confirm" 
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
