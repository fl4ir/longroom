import { useMemo, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { stringToColor, getContrastingTextColor } from '../utils/colorUtils';
import './TagColorEditor.css';

interface TagColorEditorProps {
  onClose: () => void;
}

export default function TagColorEditor({ onClose }: TagColorEditorProps) {
  const { state, actions } = useApp();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  // Collecte tous les tags uniques utilisés dans les recettes + les catégories
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    state.recipes.forEach(recipe => {
      recipe.tags.forEach(tag => tagsSet.add(tag));
    });
    // Ajouter aussi les catégories visibles
    state.categories
      .filter(cat => cat.visible && !['Sucré', 'Salé', 'Boisson'].includes(cat.name))
      .forEach(cat => tagsSet.add(cat.name));
    return Array.from(tagsSet).sort();
  }, [state.recipes, state.categories]);

  // Master tags (Sucré/Salé/Boisson)
  const masterTags = ['Sucré', 'Salé', 'Boisson'];

  const handleColorChange = (tagName: string, color: string) => {
    actions.updateTagColor(tagName, color);
  };

  const handleResetColor = (tagName: string) => {
    actions.deleteTag(tagName);
  };

  const handleAddNewTag = () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    
    // Ajouter la couleur personnalisée pour le nouveau tag
    actions.updateTagColor(trimmed, newTagColor);
    
    // Réinitialiser le formulaire
    setNewTagName('');
    setNewTagColor('#3b82f6');
    setIsCreatingTag(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content tag-color-editor" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Personnaliser les couleurs des tags</h2>
          <button className="close-button" onClick={onClose} title="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="tag-color-list">
          {/* Master Tags */}
          {masterTags.map(tag => {
            const customColor = state.tags[tag];
            const displayColor = customColor ?? stringToColor(tag);
            const textColor = getContrastingTextColor(displayColor);

            return (
              <div key={tag} className="tag-color-row">
                <div className="tag-color-preview" style={{ backgroundColor: displayColor, color: textColor }}>
                  {tag}
                </div>

                <div className="tag-color-controls">
                  <input
                    type="color"
                    value={displayColor}
                    onChange={(e) => handleColorChange(tag, e.target.value)}
                    className="color-input"
                    title="Cliquez pour changer la couleur"
                  />
                  {customColor && (
                    <button
                      className="reset-button"
                      onClick={() => handleResetColor(tag)}
                      title="Réinitialiser à la couleur par défaut"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Séparateur */}
          {allTags.length > 0 && <div style={{ height: '1px', background: 'var(--border-color)', margin: '16px 0' }} />}

          {/* Autres Tags */}
          {allTags.map(tag => {
            const customColor = state.tags[tag];
            const displayColor = customColor ?? stringToColor(tag);
            const textColor = getContrastingTextColor(displayColor);

            return (
              <div key={tag} className="tag-color-row">
                <div className="tag-color-preview" style={{ backgroundColor: displayColor, color: textColor }}>
                  {tag}
                </div>

                <div className="tag-color-controls">
                  <input
                    type="color"
                    value={displayColor}
                    onChange={(e) => handleColorChange(tag, e.target.value)}
                    className="color-input"
                    title="Cliquez pour changer la couleur"
                  />
                  {customColor && (
                    <button
                      className="reset-button"
                      onClick={() => handleResetColor(tag)}
                      title="Réinitialiser à la couleur par défaut"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bouton pour créer un nouveau tag */}
          <button
            className="add-tag-button"
            onClick={() => setIsCreatingTag(true)}
            title="Créer un nouveau tag"
          >
            <Plus size={18} />
            <span>Créer un nouveau tag</span>
          </button>

          {/* Formulaire de création de nouveau tag */}
          {isCreatingTag && (
            <div className="tag-color-row new-tag-form">
              <input
                type="text"
                placeholder="Nom du tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewTag();
                  }
                }}
                className="new-tag-input"
                autoFocus
              />

              <div className="tag-color-controls">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="color-input"
                />
                <button
                  className="reset-button confirm-button"
                  onClick={handleAddNewTag}
                  disabled={!newTagName.trim()}
                  title="Créer le tag"
                >
                  Créer
                </button>
                <button
                  className="reset-button"
                  onClick={() => {
                    setIsCreatingTag(false);
                    setNewTagName('');
                    setNewTagColor('#3b82f6');
                  }}
                  title="Annuler"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
