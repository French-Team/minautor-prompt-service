# Plan de développement — Mission 03 : Persistance des prompts générés

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 03/07 — Persistance des prompts générés  
**Effort estimé :** Faible  
**Dépendances :** Mission 02 (connexion templates → générateur) — optionnelle (peut être faite en parallèle)

---

## Objectif

Sauvegarder les prompts générés pour les retrouver après un refresh de la page. Actuellement, les prompts générés via `/prompts` sont affichés une fois puis disparaissent.

---

## Tâches détaillées

### 3.1 — Ajouter une section "Derniers prompts" sur la page Prompts

**Description :** Afficher une liste des derniers prompts générés sous le formulaire de génération, avec la possibilité de les re-sélectionner.

**Sous-tâches :**
- [ ] Créer une section `<aside>` ou `<div>` dans `pages/prompts.vue` pour l'historique
- [ ] Afficher les prompts sous forme de cartes (titre, date, template utilisé, extrait)
- [ ] Permettre de cliquer sur un prompt pour le re-sélectionner (afficher son contenu dans l'éditeur)
- [ ] Ajouter un bouton "Supprimer" par prompt
- [ ] Ajouter un badge "Actif" sur le prompt en cours d'édition

**Fichiers impactés :**
- `pages/prompts.vue`

---

### 3.2 — Stocker les prompts dans localStorage

**Description :** Sauvegarder les prompts générés dans le `localStorage` du navigateur pour les retrouver après refresh.

**Sous-tâches :**
- [ ] Créer une clé `prompts-history` dans localStorage
- [ ] Sauvegarder les prompts après chaque génération (max 20 prompts)
- [ ] Charger l'historique au `onMounted` de la page
- [ ] Mettre à jour le timestamp à chaque re-sélection/modification
- [ ] Nettoyer les prompts supprimés du localStorage

**Fichiers impactés :**
- `pages/prompts.vue`

---

### 3.3 — Connecter PromptManager pour la persistance serveur

**Description :** Utiliser `PromptManager.storePrompt()` pour sauvegarder les prompts côté serveur, pas seulement en localStorage.

**Sous-tâches :**
- [ ] Importer `PromptManager` (via le DI container) dans `pages/prompts.vue` ou dans un composable dédié
- [ ] Appeler `promptManager.storePrompt(prompt)` après chaque génération
- [ ] Vérifier que `PromptManager` a bien ses propres méthodes de persistance fichier (ou le faire dans cette mission)
- [ ] Charger les prompts depuis `PromptManager` au démarrage
- [ ] Synchroniser localStorage et serveur (le localStorage sert de cache rapide)

**Fichiers impactés :**
- `pages/prompts.vue`
- `src/services/prompt-manager.ts`

---

### 3.4 — Ajouter un stockage fichier JSON pour PromptManager

**Description :** Actuellement, `PromptManager` stocke tout dans une `Map<string, GeneratedPrompt>` en RAM. Ajouter une persistance fichier JSON, comme pour les templates (mission 01).

**Sous-tâches :**
- [ ] Créer `runtime/prompts.json` pour stocker les prompts
- [ ] Ajouter `loadFromDisk()` et `saveToDisk()` dans `PromptManager`
- [ ] Appeler `saveToDisk()` après `storePrompt()`, `archivePrompt()`, `deletePrompt()`
- [ ] Charger les prompts au démarrage du service

**Fichiers impactés :**
- `src/services/prompt-manager.ts`
- `runtime/prompts.json` (nouveau)

---

## Critères d'acceptation

- [ ] Générer un prompt → il apparaît dans l'historique "Derniers prompts"
- [ ] Rafraîchir la page (F5) → l'historique est toujours là
- [ ] Cliquer sur un prompt historique → son contenu s'affiche dans l'éditeur
- [ ] Supprimer un prompt de l'historique → il disparaît définitivement
- [ ] Redémarrer le serveur → les prompts sont toujours là (persistance fichier)
- [ ] Les tests existants passent toujours

---

## Notes d'implémentation

- Limiter l'historique localStorage à 20 entrées maximum (FIFO : suppression des plus anciens).
- Structure d'une entrée dans l'historique : `{ id, title, content, templateId, variables, date, identityType }`.
- La synchronisation localStorage ↔ serveur peut être simple : le localStorage sert de cache, le serveur de source de vérité.
- Le `PromptManager` a déjà une méthode `getPromptHistory()`, `storePrompt()`, `archivePrompt()` — les connecter simplement.
