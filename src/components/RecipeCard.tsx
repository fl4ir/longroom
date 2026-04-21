import { Clock, Users, AlertTriangle, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getContrastingTextColor, stringToColor, withAlpha } from '../utils/colorUtils';
import { getPriorityColor } from '../utils/recipeUtils';
import type { Recipe } from '../types';
import './RecipeCard.css';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  const { state, actions } = useApp();

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short'
    }).format(date);
  };

  const masterTag = ['Sucré', 'Salé', 'Boisson'].find(tag => recipe.tags.includes(tag));
  const mainCategory = recipe.categories[0] || 'Sans catégorie';
  const categoryKey = masterTag ?? mainCategory;
  const categoryMeta = state.categories.find(cat => cat.name === categoryKey);
  const categoryBg = state.tags[categoryKey] ?? categoryMeta?.color ?? stringToColor(categoryKey);
  const cardBg = withAlpha(categoryBg, 0.04);

  return (
    <div className="recipe-card" onClick={onClick} style={{ borderLeft: `8px solid ${categoryBg}`, backgroundColor: cardBg }}>
      {recipe.priority && (
        <div className="recipe-priority-badge" style={{ borderTopColor: getPriorityColor(recipe.priority) }} title={`Priorité: ${recipe.priority}`} />
      )}
      <div className="recipe-card-header">
        <div className="recipe-title-wrapper">
          <h3 className="recipe-title">{recipe.name}</h3>
          {recipe.importPendingValidation && (
            <span className="import-pending-badge">Import auto</span>
          )}
        </div>
        <button 
          className={`favorite-button ${recipe.favorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            actions.toggleFavorite(recipe.id);
          }}
          title={recipe.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart size={18} fill={recipe.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      {recipe.lastOpened && (
        <div className="last-opened">
          <Clock size={14} />
          <span>{formatDate(recipe.lastOpened)}</span>
        </div>
      )}
      
      <div className="recipe-card-body">
        {recipe.categories.length > 0 && (
          <div className="categories-preview">
            {recipe.categories.map(category => {
              const categoryMeta = state.categories.find(cat => cat.name === category);
              const categoryBg = categoryMeta?.color ?? stringToColor(category);
              const categoryText = getContrastingTextColor(categoryBg);
              return (
                <span key={category} className="category-badge" style={{ backgroundColor: categoryBg, color: categoryText }}>
                  {category}
                </span>
              );
            })}
          </div>
        )}
        
        <div className="ingredients-preview">
          <strong>Ingrédients principaux :</strong>
          <p>{recipe.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
            {recipe.ingredients.length > 3 && '...'}</p>
        </div>
        
        {recipe.usages.length > 0 && (
          <div className="usages-preview">
            <strong>Utilisations :</strong>
            <p>{recipe.usages.slice(0, 2).join(', ')}
              {recipe.usages.length > 2 && '...'}</p>
          </div>
        )}
      </div>
      
      <div className="recipe-card-footer">
        <div className="recipe-stats">
          <div className="stat">
            <Users size={16} />
            <span>{recipe.ingredients.length} ingrédients</span>
          </div>
          {recipe.totalWeight && (
            <div className="stat">
              <span>{Math.round(recipe.totalWeight)}g</span>
            </div>
          )}
        </div>
        
        {recipe.allergens.length > 0 && (
          <div className="allergens">
            <AlertTriangle size={16} className="warning-icon" />
            <span className="allergens-text">
              {recipe.allergens.slice(0, 2).join(', ')}
              {recipe.allergens.length > 2 && `+${recipe.allergens.length - 2}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
