// Script temporaire pour nettoyer le localStorage et forcer le rechargement des données de test
// À exécuter dans la console du navigateur

console.log('Nettoyage du localStorage...');
localStorage.removeItem('longroom-local-data');
console.log('localStorage nettoyé. Rechargez la page pour voir les recettes de test.');

// Optionnel : recharger automatiquement la page
window.location.reload();
