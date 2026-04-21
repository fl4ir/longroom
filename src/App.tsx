import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import HomePage from './components/HomePage';
import RecipePage from './components/RecipePage';
import RecipeEditor from './components/RecipeEditor';
import { AuthForm } from './components/AuthForm';
import { onAuthStateChange, signOut } from './lib/auth';
import type { Recipe } from './types';
import type { User } from '@supabase/supabase-js';
import './App.css';

type AppView = 'home' | 'recipe' | 'editor';

function AppContent() {
  const { state, actions } = useApp();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  // Appliquer le thème au body
  useEffect(() => {
    document.body.className = state.theme === 'dark' ? 'dark-theme' : 'light-theme';
  }, [state.theme]);
  
  const handleRecipeSelect = (recipe: Recipe | null) => {
    if (recipe === null) {
      // Créer une nouvelle recette
      setEditingRecipe(null);
      setCurrentView('editor');
    } else {
      // Voir une recette existante
      actions.selectRecipe(recipe);
      actions.updateLastOpened(recipe.id);
      setCurrentView('recipe');
    }
  };
  
  const handleRecipeEdit = () => {
    setEditingRecipe(state.selectedRecipe);
    setCurrentView('editor');
  };
  
  const handleRecipeSave = async (recipe: Recipe) => {
    try {
      if (editingRecipe) {
        await actions.updateRecipe(recipe);
      } else {
        await actions.addRecipe(recipe);
      }
      actions.selectRecipe(recipe);
      setCurrentView('recipe');
      setEditingRecipe(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    }
  };
  
  const handleRecipeDelete = async () => {
    if (state.selectedRecipe) {
      try {
        await actions.deleteRecipe(state.selectedRecipe.id);
        setCurrentView('home');
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression. Veuillez réessayer.');
      }
    }
  };
  
  const handleBack = () => {
    if (currentView === 'editor') {
      if (editingRecipe) {
        setCurrentView('recipe');
      } else {
        setCurrentView('home');
      }
    } else {
      setCurrentView('home');
      actions.selectRecipe(null);
    }
    setEditingRecipe(null);
  };
  
  switch (currentView) {
    case 'recipe':
      return state.selectedRecipe ? (
        <RecipePage
          recipe={state.selectedRecipe}
          onBack={handleBack}
          onEdit={handleRecipeEdit}
          onDelete={handleRecipeDelete}
          onRecipeSelect={handleRecipeSelect}
        />
      ) : (
        <HomePage onRecipeSelect={handleRecipeSelect} />
      );
      
    case 'editor':
      return (
        <RecipeEditor
          recipe={editingRecipe}
          onBack={handleBack}
          onSave={handleRecipeSave}
        />
      );
      
    default:
      return <HomePage onRecipeSelect={handleRecipeSelect} />;
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      const { getCurrentUser } = await import('./lib/auth');
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const subscription = onAuthStateChange((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="app loading">Chargement...</div>;
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  return (
    <AppProvider user={user} onSignOut={() => signOut()}>
      <div className="app">
        <AppContent />
      </div>
    </AppProvider>
  );
}

export default App;
