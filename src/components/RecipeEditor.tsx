import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../context/AppContext';
import { UNITS, MASTER_TAGS } from '../types';
import { stringToColor } from '../utils/colorUtils';
import { searchIngredientSuggestions } from '../utils/recipeUtils';
import type { Recipe, Ingredient, RecipePriority, IngredientSuggestion } from '../types';
import './RecipeEditor.css';

interface RecipeEditorProps {
  recipe?: Recipe | null;
  onBack: () => void;
  onSave: (recipe: Recipe) => Promise<void>;
}

export default function RecipeEditor({ recipe, onBack, onSave }: RecipeEditorProps) {
  const { state, actions } = useApp();
  const isEditing = !!recipe;
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    procedure: '',
    source: '',
    categories: [] as string[],
    tags: [] as string[],
    masterTags: [] as string[],
    usages: [] as string[],
    priority: undefined as RecipePriority | undefined,
    notes: '',
    unitLabel: '',
    unitWeight: undefined as number | undefined
  });
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newUsage, setNewUsage] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [suggestingForIngredientId, setSuggestingForIngredientId] = useState<string | null>(null);
  
  useEffect(() => {
    if (recipe) {
      const recipeMasterTags = recipe.tags.filter(tag => MASTER_TAGS.includes(tag));

      setFormData({
        name: recipe.name,
        procedure: recipe.procedure,
        source: recipe.source || '',
        categories: recipe.categories,
        tags: recipe.tags.filter(tag => !MASTER_TAGS.includes(tag)),
        masterTags: recipeMasterTags,
        usages: recipe.usages,
        priority: recipe.priority,
        notes: recipe.notes || '',
        unitLabel: recipe.unitLabel || '',
        unitWeight: recipe.unitWeight || undefined
      });
      setIngredients(recipe.ingredients);
    }
  }, [recipe]);
  
  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: uuidv4(),
      name: '',
      quantity: 0,
      unit: 'g'
    };
    setIngredients([...ingredients, newIngredient]);
  };
  
  const updateIngredient = (id: string, field: keyof Ingredient, value: string | number) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };
  
  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };
  
  const handleIngredientNameChange = (id: string, value: string) => {
    updateIngredient(id, 'name', value);
    setSuggestingForIngredientId(id);
    
    // Rechercher les suggestions
    if (value.length >= 2) {
      const found = searchIngredientSuggestions(value, state.recipes);
      setSuggestions(found);
    } else {
      setSuggestions([]);
    }
  };
  
  const selectSuggestion = (suggestion: IngredientSuggestion) => {
    if (suggestion.type === 'ingredient') {
      // C'est un ingrédient existant, juste remplir le champ
      updateIngredient(suggestingForIngredientId!, 'name', suggestion.name);
    } else {
      // C'est une recette, ajouter comme ingrédient
      const recipe = state.recipes.find(r => r.id === suggestion.recipeId);
      if (recipe) {
        const newIngredient: Ingredient = {
          id: uuidv4(),
          name: recipe.name,
          quantity: recipe.totalWeight || 100,
          unit: 'g',
          recipeId: recipe.id
        };
        setIngredients([...ingredients, newIngredient]);
      }
    }
    
    setSuggestions([]);
    setSuggestingForIngredientId(null);
  };
  
  const addUsage = () => {
    if (newUsage.trim()) {
      setFormData({
        ...formData,
        usages: [...formData.usages, newUsage.trim()]
      });
      setNewUsage('');
    }
  };
  
  const removeUsage = (index: number) => {
    setFormData({
      ...formData,
      usages: formData.usages.filter((_, i) => i !== index)
    });
  };
  
  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    // Empêcher l'ajout des MASTER_TAGS comme catégories
    if (MASTER_TAGS.includes(trimmed)) {
      alert(`"${trimmed}" est un type (Sucré/Salé/Boisson), pas une catégorie.\nUse la section "Type" à la place.`);
      return;
    }

    const alreadyInForm = formData.categories.includes(trimmed);
    const alreadyInState = state.categories.some(cat => cat.name.toLowerCase() === trimmed.toLowerCase());

    if (!alreadyInState) {
      actions.addCategory({
        name: trimmed,
        color: stringToColor(trimmed),
        visible: true
      });
    }

    if (!alreadyInForm) {
      setFormData({
        ...formData,
        categories: [...formData.categories, trimmed]
      });
    }

    setNewCategory('');
  };
  
  const removeCategory = (category: string) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter(c => c !== category)
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || ingredients.length === 0) {
      alert('Veuillez remplir au moins le nom et ajouter des ingrédients');
      return;
    }
    
    const validIngredients = ingredients.filter(ing => 
      ing.name.trim() && ing.quantity > 0
    );
    
    if (validIngredients.length === 0) {
      alert('Veuillez ajouter au moins un ingrédient valide');
      return;
    }
    
    const masterTagsToKeep = formData.masterTags.filter(tag => MASTER_TAGS.includes(tag));
    const otherTags = formData.tags.filter(tag => !MASTER_TAGS.includes(tag));

    const recipeData: Recipe = {
      id: recipe?.id || uuidv4(),
      name: formData.name.trim(),
      ingredients: validIngredients,
      procedure: formData.procedure.trim(),
      usages: formData.usages,
      source: formData.source.trim() || undefined,
      categories: formData.categories,
      tags: [...new Set([...masterTagsToKeep, ...otherTags])],
      priority: formData.priority,
      notes: formData.notes.trim() || undefined,
      unitLabel: formData.unitLabel.trim() || undefined,
      unitWeight: formData.unitWeight || undefined,
      allergens: [], // Will be calculated by the context
      totalWeight: 0, // Will be calculated by the context
      createdAt: recipe?.createdAt || new Date(),
      lastOpened: recipe?.lastOpened
    };
    
    setIsSaving(true);
    try {
      await onSave(recipeData);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="recipe-editor">
      <header className="editor-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft />
          <span>Retour</span>
        </button>
        <h1>{isEditing ? 'Éditer la recette' : 'Nouvelle recette'}</h1>
      </header>
      
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-section">
          <label className="form-label">
            Nom de la recette *
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              placeholder="Ex: Pâte à choux"
              required
            />
          </label>
        </div>

        <div className="form-section">
          <div className="priority-selector">
            <div className="priority-label">Priorité :</div>
            <div className="priority-pills">
              <button
                type="button"
                className={`priority-pill ${formData.priority === 'haute' ? 'active' : ''}`}
                style={{ backgroundColor: 'var(--status-bad)' }}
                onClick={() => setFormData({ ...formData, priority: formData.priority === 'haute' ? undefined : 'haute' })}
                title="Priorité haute"
              />
              <button
                type="button"
                className={`priority-pill ${formData.priority === 'moyenne' ? 'active' : ''}`}
                style={{ backgroundColor: 'var(--status-warning)' }}
                onClick={() => setFormData({ ...formData, priority: formData.priority === 'moyenne' ? undefined : 'moyenne' })}
                title="Priorité moyenne"
              />
              <button
                type="button"
                className={`priority-pill ${formData.priority === 'basse' ? 'active' : ''}`}
                style={{ backgroundColor: 'var(--status-good)' }}
                onClick={() => setFormData({ ...formData, priority: formData.priority === 'basse' ? undefined : 'basse' })}
                title="Priorité basse"
              />
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <div className="section-header">
            <h3>Tags</h3>
          </div>
          <div className="categories-section">
            <div className="existing-categories">
              {state.categories
                .filter(category => !MASTER_TAGS.includes(category.name))
                .map(category => (
                <label key={category.id} className="category-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          categories: [...formData.categories, category.name]
                        });
                      } else {
                        removeCategory(category.name);
                      }
                    }}
                  />
                  <span className="category-label" style={{ backgroundColor: category.color }}>
                    {category.name}
                  </span>
                </label>
              ))}
            </div>
            <div className="add-category">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nouvelle catégorie"
                className="form-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              />
              <button type="button" onClick={addCategory} className="add-button">
                <Plus />
              </button>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Type (Sucré / Salé / Boisson)</h3>
          </div>
          <div className="types-section">
            {MASTER_TAGS.map(tag => (
              <label key={tag} className="type-checkbox">
                <input
                  type="checkbox"
                  checked={formData.masterTags.includes(tag)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...formData.masterTags, tag]
                      : formData.masterTags.filter(t => t !== tag);
                    setFormData({ ...formData, masterTags: next });
                  }}
                />
                <span className="type-label" style={{ backgroundColor: stringToColor(tag), color: '#fff' }}>
                  {tag}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Ingrédients *</h3>
            <button type="button" onClick={addIngredient} className="add-button">
              <Plus />
              Ajouter un ingrédient
            </button>
          </div>

          <div className="ingredients-list">
            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="ingredient-row">
                <input
                  type="number"
                  value={ingredient.quantity || ''}
                  onChange={(e) => updateIngredient(ingredient.id, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="Quantité"
                  className="quantity-input"
                />

                <select
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(ingredient.id, 'unit', e.target.value)}
                  className="unit-select"
                >
                  {UNITS.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>

                <div className="ingredient-container">
                  <input
                    type="text"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientNameChange(ingredient.id, e.target.value)}
                    onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                    placeholder="Nom de l'ingrédient (ou recette)"
                    className="ingredient-name-input"
                    autoComplete="off"
                  />
                  {ingredient.recipeId && <span className="recipe-ingredient-badge">📋</span>}
                  
                  {suggestingForIngredientId === ingredient.id && suggestions.length > 0 && (
                    <div className="ingredient-suggestions">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`suggestion-item ${suggestion.type}`}
                          onClick={() => selectSuggestion(suggestion)}
                        >
                          {suggestion.type === 'recipe' && <span className="recipe-label">Recette:</span>}
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeIngredient(ingredient.id)}
                  className="remove-button"
                >
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>

          <div className="add-recipe-ingredient">
            {/* Autocomplete intégré dans les champs d'ingrédients ci-dessus */}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">
            Procédé
            <textarea
              value={formData.procedure}
              onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
              className="form-textarea"
              placeholder="Décrivez étape par étape comment préparer cette recette..."
              rows={6}
            />
          </label>
        </div>
        
        <div className="form-section">
          <div className="section-header">
            <h3>Utilisations possibles</h3>
          </div>
          <div className="usages-section">
            <div className="usages-list">
              {formData.usages.map((usage, index) => (
                <div key={index} className="usage-item">
                  <span>{usage}</span>
                  <button
                    type="button"
                    onClick={() => removeUsage(index)}
                    className="remove-button"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </div>
            <div className="add-usage">
              <input
                type="text"
                value={newUsage}
                onChange={(e) => setNewUsage(e.target.value)}
                placeholder="Ex: pour éclairs, profiteroles..."
                className="form-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addUsage())}
              />
              <button type="button" onClick={addUsage} className="add-button">
                <Plus />
              </button>
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <label className="form-label">
            Source (optionnel)
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="form-input"
              placeholder="Ex: Livre de cuisine, site web, chef..."
            />
          </label>
        </div>

        <div className="form-section">
          <h3>Poids unitaire (optionnel)</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Définir le poids d'une unité pour calculer automatiquement les proportions
            (Ex: 1 pizza = 200g, faire 4 pizzas → 800g total)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="form-label">
              Nom de l'unité
              <input
                type="text"
                value={formData.unitLabel}
                onChange={(e) => setFormData({ ...formData, unitLabel: e.target.value })}
                className="form-input"
                placeholder="Ex: pizza, lot, portion..."
              />
            </label>
            <label className="form-label">
              Poids par unité (g)
              <input
                type="number"
                value={formData.unitWeight || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  unitWeight: e.target.value ? Number(e.target.value) : undefined 
                })}
                className="form-input"
                placeholder="Ex: 200"
                min="0"
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">
            Notes (optionnel)
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-textarea"
              placeholder="Vos notes personnelles sur cette recette..."
              rows={4}
            />
          </label>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={onBack} className="secondary-button" disabled={isSaving}>
            Annuler
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            <Save />
            {isSaving ? 'Sauvegarde...' : isEditing ? 'Mettre à jour' : 'Créer la recette'}
          </button>
        </div>
      </form>
    </div>
  );
}
