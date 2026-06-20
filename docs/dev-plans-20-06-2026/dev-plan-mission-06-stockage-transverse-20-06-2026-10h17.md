# Plan de développement — Mission 06 : Refonte stockage transverse

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 06/07 — Refonte stockage transverse  
**Effort estimé :** Lourd  
**Dépendances :** Missions 01, 03, 04 (persistances individuelles) — à faire APRÈS avoir acquis de l'expérience sur les persistances simples

---

## Objectif

Remplacer toutes les `Map` en RAM des services métier par un système de stockage fichier unifié. Les missions 01-04 auront déjà ajouté une persistance fichier ad-hoc dans chaque service. Cette mission standardise l'approche avec un `StorageService` transverse et migre tous les services vers cette interface commune.

---

## Tâches détaillées

### 6.1 — Créer le service de stockage unifié

**Description :** Créer un `StorageService` générique qui gère la lecture/écriture de données JSON vers le disque (serveur) ou localStorage (client).

**Sous-tâches :**
- [ ] Créer `src/services/storage-service.ts`
- [ ] Définir l'interface `IStorageService` :
  ```ts
  interface IStorageService {
    get<T>(key: string, namespace: string): Promise<T | null>;
    set<T>(key: string, value: T, namespace: string): Promise<void>;
    delete(key: string, namespace: string): Promise<void>;
    getAll<T>(namespace: string): Promise<Record<string, T>>;
    clear(namespace: string): Promise<void>;
  }
  ```
- [ ] Implémenter `FileStorageService` (côté serveur) :
  - Utilise `node:fs` pour lire/écrire dans `data/{namespace}.json`
  - Cache en mémoire (lecture unique, écriture synchrone)
  - Lock basique pour éviter les conflits d'écriture concurrente
- [ ] Implémenter `LocalStorageService` (côté client) :
  - Wrapper autour de `localStorage` avec parsing JSON
  - Namespace = préfixe de clé (ex: `minautor_prompts_{namespace}_{key}`)
- [ ] Créer un mécanisme de détection automatique : `createStorageService()` qui choisit `FileStorageService` ou `LocalStorageService` selon l'environnement
- [ ] Ajouter une gestion d'erreurs cohérente (fichier corrompu → backup, permission denied → log + fallback)

**Fichiers impactés :**
- `src/services/storage-service.ts` (nouveau)

---

### 6.2 — Migrer TemplateLibraryService

**Description :** Remplacer les appels directs à `readFileSync`/`writeFileSync` (ajoutés en mission 01) par `StorageService`.

**Sous-tâches :**
- [ ] Injecter `IStorageService` dans `TemplateLibraryService`
- [ ] Remplacer `loadFromDisk()` par `storageService.getAll<PromptTemplate>('templates')`
- [ ] Remplacer `saveToDisk()` par `storageService.set(template.id, template, 'templates')`
- [ ] Supprimer les méthodes `loadFromDisk()` et `saveToDisk()` de `TemplateLibraryService`
- [ ] Adapter le constructeur pour recevoir le storage service

**Fichiers impactés :**
- `src/services/template-library.ts`

---

### 6.3 — Migrer VersionHandler

**Description :** Remplacer les appels directs à `readFileSync`/`writeFileSync` (ajoutés en mission 04) par `StorageService`.

**Sous-tâches :**
- [ ] Injecter `IStorageService` dans `VersionHandler`
- [ ] Migrer `versionStore` → `storageService.getAll<PromptVersion[]>('versions')`
- [ ] Migrer `metricsStore` → `storageService.getAll<VersionUsageMetrics>('metrics')`
- [ ] Migrer `feedbackStore` → `storageService.getAll<UserFeedback[]>('feedback')`
- [ ] Supprimer les méthodes `loadFromDisk()` et `saveToDisk()` de `VersionHandler`

**Fichiers impactés :**
- `src/services/version-handler.ts`

---

### 6.4 — Migrer PromptManager

**Description :** Remplacer les appels directs à `readFileSync`/`writeFileSync` (ajoutés en mission 03) par `StorageService`.

**Sous-tâches :**
- [ ] Injecter `IStorageService` dans `PromptManager`
- [ ] Migrer `promptStore` → `storageService.getAll<GeneratedPrompt>('prompts')`
- [ ] Migrer `promptCache` → optionnel, peut rester en RAM (cache de performance)
- [ ] Supprimer les méthodes `loadFromDisk()` et `saveToDisk()` de `PromptManager`

**Fichiers impactés :**
- `src/services/prompt-manager.ts`

---

### 6.5 — Migrer IdentityResolver (si applicable)

**Description :** `IdentityResolver` stocke actuellement l'identité courante dans une propriété en RAM. Si des préférences utilisateur doivent être persistées, utiliser `StorageService`.

**Sous-tâches :**
- [ ] Analyser ce qui doit être persisté dans `IdentityResolver`
- [ ] Si pertinent : persister les préférences utilisateur via `StorageService`
- [ ] Sinon : laisser en RAM (les identités sont gérées par la mission 07)

**Fichiers impactés :**
- `src/services/identity-resolver.ts`

---

### 6.6 — Supprimer les helpers mock

**Description :** Nettoyer les helpers mock qui ne sont plus utilisés après les migrations.

**Sous-tâches :**
- [ ] Vérifier les appels à `createMockContext()` dans tout le projet
- [ ] Vérifier les appels à `createMockTemplate()` dans tout le projet
- [ ] Si plus utilisés : les supprimer de `composables/usePromptSystem.ts`
- [ ] Supprimer les exports correspondants

**Fichiers impactés :**
- `composables/usePromptSystem.ts`

---

### 6.7 — Mettre à jour le DI container

**Description :** Enregistrer `StorageService` dans le conteneur d'injection de dépendances pour que tous les services puissent l'obtenir.

**Sous-tâches :**
- [ ] Ajouter `StorageService` au DI container dans `src/config/di-container.ts`
- [ ] Choisir l'implémentation selon l'environnement (serveur → fichier, client → localStorage)
- [ ] Mettre à jour les factories des services impactés

**Fichiers impactés :**
- `src/config/di-container.ts`

---

## Critères d'acceptation

- [ ] Tous les services utilisent `IStorageService` pour la persistance
- [ ] Les données sont stockées dans `data/{namespace}.json` côté serveur
- [ ] Un seul point d'entrée pour la persistance (modifier le comportement = modifier `StorageService`)
- [ ] Les données existantes (créées par les missions 01-03-04) sont automatiquement migrées
- [ ] Les helpers `createMockTemplate()` et `createMockContext()` sont supprimés
- [ ] Tous les tests existants passent toujours

---

## Notes d'implémentation

- Le `StorageService` doit être rétrocompatible : les fichiers `runtime/templates.json`, `runtime/prompts.json`, `runtime/versions.json` créés par les missions précédentes doivent pouvoir être lus par le nouveau service.
- Format de fichier unifié : `data/{namespace}.json` → `{ "data": { [key]: value }, "metadata": { "version": 1, "updatedAt": "iso" } }`.
- Migration transparente : si un fichier existe avec l'ancien format (mission 01), le détecter et le convertir.
- Le cache en mémoire de `StorageService` évite de relire le fichier à chaque opération. Seule l'écriture est synchrone.
- Pour les locks d'écriture, une simple queue (`Promise` chain) suffit pour un projet mono-utilisateur.
