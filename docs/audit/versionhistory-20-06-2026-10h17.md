# Constat — Composant `VersionHistory`

**Fichier :** `components/VersionHistory.vue`
**Utilisé par :** `pages/versions.vue`

## État des lieux

### Interface utilisateur
- ✅ Timeline verticale avec points (dot) par version
- ✅ Badge "actuelle" sur la version la plus récente
- ✅ Bouton "Restaurer" pour revenir à une version antérieure
- ✅ Formulaire de création de version (promptId, raison, contenu)
- ✅ Affichage du contenu de chaque version (pre)
- ✅ Date et raison du changement affichées
- ✅ Messages de succès/erreur

### Données
- ✅ Appelle `versionHandler.getVersionHistory(pid)` — le bon service backend
- ✅ Appelle `versionHandler.createVersion()` pour créer une version
- ✅ Appelle `versionHandler.rollbackToVersion()` pour restaurer
- ❌ **Stockage `VersionHandler` en RAM** : `private versionStore = new Map<string, PromptVersion[]>()` — perdu au restart serveur
- ❌ **Aucune seed data** : historique vide au premier démarrage
- ❌ **Pas de cache localStorage** : les versions ne survivent pas au refresh serveur

### Comportement
- `onMounted(refresh)` charge les versions au montage
- `watch(promptId)` recharge si le prop change
- La création de version est synchrone avec le service
- Le rollback appelle `rollbackToVersion()` puis rafraîchit la liste
- Aucune gestion d'erreur spécifique (catch générique)

## Problèmes identifiés

1. **Stockage 100% RAM** : toutes les versions, métriques et feedbacks sont dans des `Map` côté serveur
2. **Perte au restart** : un redémarrage du serveur Nuxt efface tout l'historique
3. **Pas de seed data** : l'utilisateur arrive sur une page vide sans aucun exemple
4. **`rollbackToVersion()` non testé** : la méthode existe dans `VersionHandler` mais le comportement réel n'a pas été validé
5. **PerformanceMetrics en dur** : `createVersion()` envoie `{ responseTime: 0, successRate: 1.0, ... }` — valeurs factices

## Recommandations

1. Ajouter une persistance fichier JSON ou SQLite pour les versions
2. Ajouter un jeu de versions de démonstration au premier démarrage
3. Connecter automatiquement les prompts générés sur `/prompts` à l'historique des versions
4. Remplacer les métriques factices par de vraies mesures
5. Envisager un stockage Git-like (diff entre versions) pour l'efficacité
