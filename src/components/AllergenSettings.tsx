import { useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AllergenDictionary, Recipe } from '../types';
import {
  AVAILABLE_ALLERGENS,
  ALLERGEN_LABELS,
  DEFAULT_ALLERGEN_DICTIONARY
} from '../types';
import './AllergenSettings.css';

interface AllergenSettingsProps {
  onClose: () => void;
}

export default function AllergenSettings({ onClose }: AllergenSettingsProps) {
  const { state, actions } = useApp();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<Record<string, string[]>>(state.customAllergenDictionary);
  const [pendingExceptions, setPendingExceptions] = useState<Record<string, string[]>>(state.customAllergenExceptions);
  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({});
  const [newException, setNewException] = useState<Record<string, string>>({});
  const [newAllergenName, setNewAllergenName] = useState('');
  const [isCreatingAllergen, setIsCreatingAllergen] = useState(false);

  const combinedDictionary = useMemo(() => {
    const merged: AllergenDictionary = {};
    AVAILABLE_ALLERGENS.forEach(allergen => {
      const base = DEFAULT_ALLERGEN_DICTIONARY[allergen] ?? [];
      const custom = state.customAllergenDictionary[allergen] ?? [];
      merged[allergen] = [...new Set([...base, ...custom])];
    });
    return merged;
  }, [state.customAllergenDictionary]);

  const handleAddKeyword = (allergen: string) => {
    const keyword = (newKeyword[allergen] || '').trim().toLowerCase();
    if (!keyword) return;

    const existing = pending[allergen] ?? [];
    if (existing.includes(keyword)) return;

    const next = { ...pending, [allergen]: [...existing, keyword] };
    setPending(next);
    setNewKeyword({ ...newKeyword, [allergen]: '' });
  };

  const handleRemoveKeyword = (allergen: string, keyword: string) => {
    const existing = pending[allergen] ?? [];
    const next = existing.filter(k => k !== keyword);
    setPending({ ...pending, [allergen]: next });
  };

  const handleAddException = (allergen: string) => {
    const exception = (newException[allergen] || '').trim().toLowerCase();
    if (!exception) return;

    const existing = pendingExceptions[allergen] ?? [];
    if (existing.includes(exception)) return;

    const next = { ...pendingExceptions, [allergen]: [...existing, exception] };
    setPendingExceptions(next);
    setNewException({ ...newException, [allergen]: '' });
  };

  const handleRemoveException = (allergen: string, value: string) => {
    const existing = pendingExceptions[allergen] ?? [];
    const next = existing.filter(k => k !== value);
    setPendingExceptions({ ...pendingExceptions, [allergen]: next });
  };

  const handleSave = () => {
    actions.setCustomAllergenDictionary(pending);
    actions.setCustomAllergenExceptions(pendingExceptions);
    onClose();
  };

  const openImportDialog = () => {
    importInputRef.current?.click();
  };

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedRecipes = Array.isArray(parsed) ? parsed : parsed?.recipes;

      if (!Array.isArray(importedRecipes) || importedRecipes.length === 0) {
        window.alert("Le fichier ne contient pas de tableau 'recipes'.");
        return;
      }

      const replace = window.confirm('OK = remplacer les recettes existantes. Annuler = ajouter sans doublons de nom.');
      
      // Avertissement pour bulk import
      if (importedRecipes.length > 50) {
        const confirm = window.confirm(
          `⚠️ Bulk import: ${importedRecipes.length} recettes seront importées dans Supabase.\n\nCet import peut prendre quelques secondes. Continuer ?`
        );
        if (!confirm) return;
      }

      await actions.importRecipes(importedRecipes as Recipe[], replace ? 'replace' : 'append');
      window.alert(`✅ ${importedRecipes.length} recettes importées avec succès !`);
    } catch (error) {
      console.error('Erreur import JSON:', error);
      window.alert('Import impossible: verifie le format JSON.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="allergen-settings-overlay">
      <div className="allergen-settings">
        <header className="settings-header">
          <h2>Configuration des allergènes</h2>
          <button className="close-button" onClick={onClose} title="Fermer">
            <X />
          </button>
        </header>

        <div className="settings-body">
          {AVAILABLE_ALLERGENS.map(allergen => {
            const label = ALLERGEN_LABELS[allergen] ?? allergen;
            const base = DEFAULT_ALLERGEN_DICTIONARY[allergen] ?? [];
            const custom = pending[allergen] ?? [];
            const merged = combinedDictionary[allergen] ?? [];

            return (
              <section key={allergen} className="allergen-section">
                <h3>{label}</h3>
                <p className="allergen-hint">Mots clés détectés : {merged.join(', ')}</p>

                <div className="keyword-list">
                  {custom.map(keyword => (
                    <span key={keyword} className="keyword-pill">
                      {keyword}
                      <button
                        type="button"
                        className="remove-keyword"
                        onClick={() => handleRemoveKeyword(allergen, keyword)}
                        title="Retirer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="keyword-add">
                  <input
                    type="text"
                    value={newKeyword[allergen] ?? ''}
                    onChange={(e) => setNewKeyword({ ...newKeyword, [allergen]: e.target.value })}
                    placeholder="Ajouter un mot clé (ex : poudre d'amande)"
                  />
                  <button type="button" onClick={() => handleAddKeyword(allergen)}>
                    Ajouter
                  </button>
                </div>

                <div className="exception-section">
                  <h4>Exceptions (ne pas considérer comme allergène si...)</h4>
                  <div className="keyword-list">
                    {(pendingExceptions[allergen] ?? []).map(exception => (
                      <span key={exception} className="keyword-pill exception-pill">
                        {exception}
                        <button
                          type="button"
                          className="remove-keyword"
                          onClick={() => handleRemoveException(allergen, exception)}
                          title="Retirer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="keyword-add">
                    <input
                      type="text"
                      value={newException[allergen] ?? ''}
                      onChange={(e) => setNewException({ ...newException, [allergen]: e.target.value })}
                      placeholder="Ajouter une exception (ex : farine d'amande)"
                    />
                    <button type="button" onClick={() => handleAddException(allergen)}>
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="default-keywords">
                  <strong>Keywords par défaut :</strong> {base.join(', ')}
                </div>
              </section>
            );
          })}

          {/* Bouton pour créer un nouvel allergène */}
          <button
            type="button"
            className="add-allergen-button"
            onClick={() => setIsCreatingAllergen(true)}
            title="Créer un nouvel allergène personnalisé"
          >
            <Plus size={18} />
            <span>Créer un allergène personnalisé</span>
          </button>

          {/* Formulaire de création d'allergène */}
          {isCreatingAllergen && (
            <section className="allergen-section new-allergen-form">
              <h3>Nouvel allergène</h3>
              <input
                type="text"
                placeholder="Nom de l'allergène (ex: Sésame, Moustarde)"
                value={newAllergenName}
                onChange={(e) => setNewAllergenName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = newAllergenName.trim();
                    if (trimmed) {
                      setPending({ ...pending, [trimmed]: [] });
                      setNewAllergenName('');
                      setIsCreatingAllergen(false);
                    }
                  }
                }}
                className="new-allergen-input"
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="reset-button confirm-button"
                  onClick={() => {
                    const trimmed = newAllergenName.trim();
                    if (trimmed) {
                      setPending({ ...pending, [trimmed]: [] });
                      setNewAllergenName('');
                      setIsCreatingAllergen(false);
                    }
                  }}
                  disabled={!newAllergenName.trim()}
                  title="Créer l'allergène"
                >
                  Créer
                </button>
                <button
                  type="button"
                  className="reset-button"
                  onClick={() => {
                    setIsCreatingAllergen(false);
                    setNewAllergenName('');
                  }}
                  title="Annuler"
                >
                  Annuler
                </button>
              </div>
            </section>
          )}

          <section className="allergen-section import-section">
            <h3>Import de recettes (avance)</h3>
            <p className="allergen-hint">
              Fonction niche pour import massif depuis le JSON genere par le script XLSM.
            </p>
            <p className="allergen-hint">
              Utilise d'abord: <strong>node scripts/import-xlsm.mjs --input &lt;fichier.xlsm&gt; --output ./data/imported-recipes-clean.json</strong>
            </p>
            <div className="keyword-add">
              <button type="button" onClick={openImportDialog}>
                Importer un JSON
              </button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportJson}
            />
          </section>
        </div>

        <div className="settings-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary-button" onClick={handleSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
