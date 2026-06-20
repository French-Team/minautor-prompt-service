# Plan de développement — Mission 04 : Persistance des versions

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 04/07 — Persistance des versions  
**Effort estimé :** Moyen  
**Dépendances :** Peut être faite en parallèle des missions 01-03

---

## Objectif

Remplacer le stockage en RAM de `VersionHandler` (qui utilise des `Map<string, PromptVersion[]>`) par une persistance fichier JSON. Actuellement, les versions créées disparaissent au redémarrage du serveur. La page `/versions` et le composant `VersionHistory` s'affichent vides.

---

## Tâches détaillées

### 4.1 — Ajouter un stockage fichier JSON pour VersionHandler

**Description :** `VersionHandler` stocke actuellement les versions, métriques et feedback dans trois `Map` en RAM. Ajouter une persistance fichier.

**Sous-tâches :**
- [ ] Créer `runtime/versions.json` pour stocker les données
- [ ] Définir la structure du fichier : `{ "versions": { [promptId]: PromptVersion[] }, "metrics": { [key]: VersionUsageMetrics }, "feedback": { [key]: UserFeedback[] } }`
- [ ] Ajouter `loadFromDisk()` dans `VersionHandler` (constructeur ou méthode d'init)
- [ ] Ajouter `saveToDisk()` qui écrit les trois `Map` dans le fichier
- [ ] Appeler `saveToDisk()` après chaque opération modifiante :
  - `createVersion()`
  - `rollbackToVersion()`
  - `addUserFeedback()`
- [ ] Charger les données au démarrage du service

**Fichiers impactés :**
- `src/services/version-handler.ts`
- `runtime/versions.json` (nouveau)

---

### 4.2 — Ajouter des données de démonstration

**Description :** Si l'historique des versions est vide (premier démarrage), ajouter des exemples pour que l'UI ne soit pas vide.

**Sous-tâches :**
- [ ] Créer 2-3 prompts de démonstration avec 2-3 versions chacun
- [ ] Utiliser des identités existantes (User, Superviseur)
- [ ] Ajouter des métadonnées réalistes (dates, raisons, scores de satisfaction)
- [ ] Ne seed que si le fichier n'existe pas (pas d'écrasement)

**Fichiers impactés :**
- `src/services/version-handler.ts`

---

### 4.3 — Connecter automatiquement la création de version depuis `/prompts`

**Description :** Lorsqu'un prompt est généré via `/prompts`, créer automatiquement une version via `VersionHandler.createVersion()`.

**Sous-tâches :**
- [ ] Dans le flux de génération de `pages/prompts.vue`, après la génération réussie, appeler `versionHandler.createVersion()`
- [ ] Utiliser l'ID du prompt généré comme `promptId`
- [ ] Ajouter des métadonnées : identité utilisée, template source, raison = "Génération initiale"
- [ ] Afficher un indicateur "Version créée" dans l'UI

**Fichiers impactés :**
- `pages/prompts.vue`
- `src/services/prompt-manager.ts` (si le flux passe par lui)

---

### 4.4 — Connecter le composant VersionHistory

**Description :** Le composant `VersionHistory.vue` appelle déjà `versionHandler.getVersionHistory()`. S'assurer que tout le pipeline est fonctionnel.

**Sous-tâches :**
- [ ] Vérifier que `VersionHistory.vue` reçoit bien les données persistées
- [ ] Vérifier le rollback : `versionHandler.rollbackToVersion()` doit restaurer le contenu et persister
- [ ] Ajouter un indicateur de chargement "Chargement des versions..."
- [ ] Ajouter un message si aucune version n'existe encore

**Fichiers impactés :**
- `components/VersionHistory.vue`
- `pages/versions.vue`

---

## Critères d'acceptation

- [ ] Créer un prompt → une version est automatiquement créée
- [ ] La page `/versions` affiche les versions persistées
- [ ] Redémarrer le serveur → les versions sont toujours là
- [ ] Restaurer une version (rollback) → le contenu est mis à jour et persiste
- [ ] Les données de démonstration s'affichent au premier lancement
- [ ] Les tests existants passent toujours

---

## Notes d'implémentation

- `VersionHandler` utilise trois `Map` : `versionStore`, `metricsStore`, `feedbackStore`. Les sérialiser toutes dans le même fichier JSON.
- Structure d'une `PromptVersion` : `{ id, content, version, timestamp, metadata: { reason, identityType, templateId }, parentVersion? }`.
- Le seed data doit être réaliste mais clairement identifiable comme démo (ex: "Prompt exemple — Template marketing").
- Pour le rollback, `VersionHandler.rollbackToVersion()` existe déjà. Vérifier qu'il persiste bien après la mission.
