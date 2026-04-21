# TODO

- [x] Sucré / salé (couleurs)
- [x] Indicateur de couleur (vert / orange / rouge) pour recette au point / a revoir / pas au point (optionnel)
- [x] Liste allergene
- [x] Ajouter un champ Notes dans les recettes
- [x] Afficher (discret) les proportions d'ingredients en pourcentage (ingredient / masse totale)
- [x] Systeme de favoris (sont en haut de la liste)

- [x] Recuperer via xlsx

- [] Systeme de compte / partage entre comptes
    -Migrer le stockage des recettes vers une couche abstraite (StorageProvider) et remplacer localStorage par IndexedDB (via idb) pour preparer la sync cloud / multi-compte
    
- [x] Recette avec ingredient recette
    -Exemple: j'ai une recette bissap, et une recette syphon bissap dans laquelle il me faut 200g de bissap, calculer les ingredients via la recette bissap


- [x] Doublon tags Sucre/Sale/boisson dans création de recette (catégorie et type)

- [x] Fuzzy search non accent sensitive (et case)

- [x] Ajouter une option "poids unitaire" optionnel dans la création de recette, pour pouvoir dire "je veux faire 4 pizzas" et l'app donnerait les bonnes quantite (si renseigné que 1 pizza = 200g de masse totale)

- [X] Afficher que les favoris au lancement de l'app (et si recherche / filtres on affiche les autres biensur) (voire un bouton "n'afficher que les favoris")

- [X] Couleurs personnalisables