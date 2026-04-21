# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Longroom - Gestionnaire de Recettes de Cuisine

Une application web moderne de gestion de recettes de cuisine avec interface responsive, développée en React TypeScript avec Vite.

## 🚀 Fonctionnalités

### ✨ Gestion de recettes
- **Création et édition** de recettes avec interface intuitive
- **Catégorisation** flexible avec tags visibles et internes
- **Détection automatique d'allergènes** basée sur les ingrédients
- **Ajustement automatique des proportions** selon un poids cible

### 🔍 Recherche et navigation
- **Recherche intelligente** par nom, ingrédients, ou utilisations
- **Filtrage par catégories** et allergènes
- **Tri** alphabétique ou par dernière ouverture
- **Recettes liées** par catégorie, allergènes ou utilisations

### 📱 Interface responsive
- Design **mobile-first** adaptatif
- Interface moderne et épurée
- **Optimisée pour le tactile**
- Prête pour déploiement mobile (PWA/app hybride)

## 🛠️ Technologies

- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **Lucide React** pour les icônes
- **CSS Modules** pour le styling
- **LocalStorage** pour la persistance des données

## 🚀 Installation et démarrage

```bash
# Installation des dépendances
npm install

# Démarrage du serveur de développement
npm run dev

# Build de production
npm run build

# Prévisualisation du build
npm run preview
```

## 📁 Structure du projet

```
src/
├── components/          # Composants React
│   ├── HomePage.tsx     # Page d'accueil avec liste des recettes
│   ├── RecipePage.tsx   # Affichage détaillé d'une recette
│   ├── RecipeEditor.tsx # Création/édition de recettes
│   ├── RecipeCard.tsx   # Carte de recette pour la liste
│   └── SearchBar.tsx    # Barre de recherche intelligente
├── context/
│   └── AppContext.tsx   # Gestion d'état global avec React Context
├── types/
│   └── index.ts         # Types TypeScript et constantes
├── utils/
│   └── recipeUtils.ts   # Utilitaires (détection allergènes, proportions)
└── *.css               # Styles par composant
```

## 📊 Modèle de données

### Recette
- **Informations de base** : nom, catégories, tags
- **Ingrédients** : nom, quantité, unité
- **Procédé** : étapes de préparation
- **Utilisations** : suggestions d'usage
- **Métadonnées** : source, allergènes, dates

### Fonctionnalités avancées
- **Détection automatique d'allergènes** (lactose, gluten, œuf, etc.)
- **Calcul du poids total** avec conversion d'unités
- **Ajustement proportionnel** pour quantités cibles
- **Historique d'ouverture** pour tri par récence

## 🔧 Développement

### Scripts disponibles
- `npm run dev` - Serveur de développement avec hot reload
- `npm run build` - Build de production optimisé
- `npm run preview` - Prévisualisation du build de production
- `npm run lint` - Vérification ESLint
- `npm run import:xlsm` - Conversion d'un classeur Excel (.xlsm/.xlsx) en JSON de recettes

### Import Excel massif (.xlsm)
Le script `scripts/import-xlsm.mjs` lit un classeur avec onglet sommaire + liens vers recettes, puis génère un JSON compatible avec l'application.

Commande type:

```bash
node scripts/import-xlsm.mjs --input "C:/Users/emile/Desktop/projets/mateoapp/Mine d'or oui.xlsm" --output "./data/imported-recipes-clean.json"
```

Ensuite, dans l'application:
- Clique sur **Importer** (en haut de la page d'accueil)
- Sélectionne le fichier JSON généré
- Choisis **remplacer** ou **ajouter sans doublons de nom**

### Extension future
L'architecture actuelle permet facilement :
- **Déploiement PWA** (Progressive Web App)
- **Conversion en app mobile** avec Capacitor/Cordova
- **Synchronisation cloud** (Firebase, Supabase)
- **Partage de recettes** entre utilisateurs

## 🎯 Feuille de route

- [ ] **PWA** : Support offline et installation
- [ ] **Export/Import** : Sauvegarde et partage de recettes
- [ ] **Photos** : Support d'images pour les recettes
- [ ] **Timer** : Minuteur intégré pour la cuisine
- [ ] **Mode sombre** : Thème dark/light
- [ ] **Sync cloud** : Synchronisation multi-appareils

## 📱 Déploiement mobile

Le projet est configuré pour faciliter le déploiement mobile :

### PWA (Progressive Web App)
```bash
# Ajouter les dépendances PWA
npm install -D vite-plugin-pwa

# Configuration dans vite.config.ts pour PWA
```

### Application native (Capacitor)
```bash
# Installation de Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios

# Initialisation et build
npx cap init
npm run build
npx cap add android
npx cap add ios
```

## 🤝 Contribution

Ce projet utilise les conventions suivantes :
- **TypeScript strict** pour la sécurité des types
- **Composants fonctionnels** avec hooks React
- **CSS responsive** mobile-first
- **Gestion d'état locale** avec Context API

## 📄 Licence

Projet personnel - Longroom © 2025

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
