# Plan de développement — Mission 01 : Persistance des templates

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 01/07 — Persistance des templates  
**Effort estimé :** Faible  
**Dépendances :** Aucune (indépendante)

---

## Objectif

Remplacer le stockage local éphémère du composant `TemplateLibrary` par une vraie persistance via `TemplateLibraryService`. Actuellement, les templates créés par l'utilisateur disparaissent au refresh de la page.

---

## Tâches détaillées

### 1.1 — Ajouter un stockage fichier JSON côté serveur

**Description :** Modifier `TemplateLibraryService` pour qu'il lise/écrive ses templates dans un fichier `runtime/templates.json` plutôt que dans une `Map` en RAM.

**Sous-tâches :**
- [ ] Créer le dossier `runtime/` à la racine du projet (si inexistant)
- [ ] Ajouter une méthode `loadFromDisk()` dans `TemplateLibraryService` qui lit `runtime/templates.json` et peuple la `Map`
- [ ] Ajouter une méthode `saveToDisk()` qui écrit la `Map` dans `runtime/templates.json`
- [ ] Appeler `loadFromDisk()` dans le constructeur ou au démarrage du service
- [ ] Appeler `saveToDisk()` après chaque opération modifiante (`storeTemplate`, `updateTemplate`, `deleteTemplate`)
- [ ] Ajouter des templates par défaut pré-chargés si le fichier n'existe pas (seed data)

**Fichiers impactés :**
- `src/services/template-library.ts`
- `runtime/templates.json` (nouveau)

---

### 1.2 — Connecter le composant TemplateLibrary au service

**Description :** Le composant `TemplateLibrary.vue` utilise actuellement son propre `ref<TemplateEntry[]>([])` local. Il doit importer et utiliser `TemplateLibraryService` pour charger et sauvegarder les templates.

**Sous-tâches :**
- [ ] Importer `TemplateLibraryService` (via le DI container ou directement depuis `src/services/`)
- [ ] Remplacer le `ref` local par un appel à `templateLibraryService.searchTemplates()` au `onMounted`
- [ ] Remplacer `createMockTemplate()` par `templateLibraryService.storeTemplate()`
- [ ] Connecter la suppression via `templateLibraryService.deleteTemplate()`
- [ ] Connecter la modification via `templateLibraryService.updateTemplate()`
- [ ] Vérifier que le formulaire de création utilise les champs réels du modèle `PromptTemplate`

**Fichiers impactés :**
- `components/TemplateLibrary.vue`
- `pages/templates.vue` (peut nécessiter des ajustements d'import)

---

### 1.3 — Synchroniser avec localStorage (optionnel, côté client)

**Description :** En complément du fichier JSON serveur, sauvegarder les templates dans le `localStorage` du navigateur pour un accès rapide et un fallback si le serveur n'est pas joignable.

**Sous-tâches :**
- [ ] Créer un helper `localStorageTemplateCache` dans le composant ou dans un util
- [ ] Sauvegarder les templates dans localStorage après chaque modification
- [ ] Restaurer depuis localStorage au chargement initial (avec fallback vers l'API)
- [ ] Ajouter un indicateur "cache local" / "serveur" dans l'UI (optionnel)

**Fichiers impactés :**
- `components/TemplateLibrary.vue`

---

## Critères d'acceptation

- [ ] Créer un template → il persiste après refresh de la page (F5)
- [ ] Modifier un template → les changements persistent après refresh
- [ ] Supprimer un template → il disparaît définitivement
- [ ] Redémarrer le serveur Nuxt → les templates sont toujours là
- [ ] La liste des templates par défaut (seed) s'affiche au premier lancement
- [ ] Les tests existants passent toujours

---

## Notes d'implémentation

- Le `TemplateLibraryService` utilise actuellement une `Map<string, PromptTemplate>` en RAM. L'approche la plus simple est de conserver la `Map` comme cache en mémoire et de synchroniser avec le fichier JSON à chaque modification.
- Pour le fichier JSON, utiliser `import { readFileSync, writeFileSync, existsSync } from 'node:fs'` et `path.join(process.cwd(), 'data', 'templates.json')`.
- Structure du fichier JSON : `{ "templates": { [id]: PromptTemplate }, "metadata": { "version": 1, "lastUpdated": "ISO date" } }`.
- Les templates par défaut peuvent être inspirés des `createDefaultTemplates()` existants dans `usePromptSystem.ts` ou du modèle `PromptTemplate` dans `src/models/template.ts`.
