# Instructions Copilot pour Longroom - Gestionnaire de Recettes

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Description du projet
Application web de gestion de recettes de cuisine avec interface moderne et responsive, développée en React TypeScript avec Vite.

## Fonctionnalités principales
- Création et édition de recettes avec catégories
- Détection automatique d'allergènes
- Recherche intelligente (nom, ingrédients, utilisations)
- Ajustement automatique des proportions
- Interface responsive pour déploiement mobile futur

## Architecture et bonnes pratiques
- Utiliser TypeScript pour tous les nouveaux composants
- Privilégier les hooks React fonctionnels
- Structure modulaire avec séparation des responsabilités
- Interface responsive-first (mobile-first design)
- Gestion d'état locale avec useState/useContext
- Stockage local des données (localStorage) pour MVP

## Conventions de code
- Noms de composants en PascalCase
- Noms de fichiers en kebab-case
- Props typées avec interfaces TypeScript
- Utiliser CSS Modules ou styled-components pour le styling
- Tests unitaires avec Vitest quand nécessaire

## Structure de données
- Recettes avec ingrédients, proportions, procédé, utilisations, source
- Système de catégories flexibles (visibles et tags internes)
- Détection automatique d'allergènes basée sur dictionnaire
- Historique d'ouverture des recettes pour tri
