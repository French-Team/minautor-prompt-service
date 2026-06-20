# Plan de développement — Missions priorisées

Date : 20/06/2026  
Projet : Minautor Prompts Service

---

## Mission 1 — Persistance des templates

**Objectif :** Remplacer le stockage local éphémère du composant `TemplateLibrary` par une vraie persistance via `TemplateLibraryService`.

### Tâches

1.1. Connecter `TemplateLibraryService` au composant `TemplateLibrary.vue`
- Importer et instancier le service
- Remplacer `createMockTemplate()` par `storeTemplate()`
- Charger les templates au `onMounted` via `searchTemplates()`
- Connecter la suppression via `deleteTemplate()`

1.2. Ajouter un stockage fichier JSON
- Créer un fichier `runtime/templates.json` dans le projet
- Modifier `TemplateLibraryService` pour lire/écrire depuis ce fichier
- Ajouter des templates par défaut pré-chargés si le fichier n'existe pas

1.3. Synchroniser avec le localStorage
- Sauvegarder les templates dans localStorage côté client
- Restaurer les templates depuis localStorage au chargement de la page

### Fichiers impactés
- `components/TemplateLibrary.vue`
- `src/services/template-library.ts`
- `pages/templates.vue`

### Effort estimé : Faible

---

## Mission 2 — Connexion templates → générateur

**Objectif :** Permettre de sélectionner un template depuis la bibliothèque dans le formulaire de génération de prompts (`/prompts`).

### Tâches

2.1. Ajouter un sélecteur de template
- Remplacer la textarea de template brut par un dropdown/selecteur
- Charger les templates depuis `TemplateLibraryService`
- Afficher les variables du template sélectionné dynamiquement

2.2. Lier les variables du template au formulaire
- Extraire les variables depuis le template sélectionné
- Générer les champs de saisie dynamiquement selon les variables
- Valider les champs requis avant génération

### Fichiers impactés
- `pages/prompts.vue`
- `components/TemplateLibrary.vue` (peut-être un mode "sélecteur")

### Effort estimé : Moyen

---

## Mission 3 — Persistance des prompts générés

**Objectif :** Sauvegarder les prompts générés pour les retrouver après refresh.

### Tâches

3.1. Ajouter une section "Derniers prompts" sur la page Prompts
- Stocker les prompts générés dans localStorage
- Afficher une liste des derniers prompts générés
- Permettre de re-sélectionner un prompt précédent

3.2. Connecter `PromptManager` pour la persistance serveur
- Utiliser `PromptManager.storePrompt()` pour sauvegarder les prompts
- Ajouter un stockage fichier JSON pour `PromptManager`

### Fichiers impactés
- `pages/prompts.vue`
- `src/services/prompt-manager.ts`

### Effort estimé : Faible

---

## Mission 4 — Persistance des versions

**Objectif :** Remplacer le stockage en RAM de `VersionHandler` par une persistance fichier.

### Tâches

4.1. Ajouter un stockage fichier JSON
- Créer un fichier `runtime/versions.json`
- Modifier `VersionHandler` pour lire/écrire depuis ce fichier
- Charger les versions au démarrage du service

4.2. Afficher un historique utilisable
- Ajouter des versions de démonstration si l'historique est vide
- Connecter automatiquement la création de version depuis `/prompts`

### Fichiers impactés
- `src/services/version-handler.ts`
- `components/VersionHistory.vue`

### Effort estimé : Moyen

---

## Mission 5 — Détection réelle des agents LLM

**Objectif :** Remplacer le tableau `['ollama', 'lm-studio', 'codestral', 'generic']` en dur par une vraie détection.

### Tâches

5.1. Analyser les options de détection
- Vérifier si Ollama tourne en local (port 11434)
- Vérifier si LM Studio est accessible (port 1234)
- Vérifier la disponibilité de l'API CodeStral
- Scanner les processus pour détecter les serveurs LLM

5.2. Implémenter la détection
- Créer un service `AgentDetector` avec vérification par requête HTTP
- Intégrer la détection dans `AnalyticsDashboard`
- Afficher les agents réellement disponibles plutôt que "supportés"

### Fichiers impactés
- `components/AnalyticsDashboard.vue`
- `server/api/` (nouvel endpoint de détection)
- `src/services/` (nouveau service AgentDetector)

### Effort estimé : Moyen

---

## Mission 6 — Refonte stockage transverse

**Objectif :** Remplacer toutes les `Map` en RAM par un système de stockage fichier unifié.

### Tâches

6.1. Créer un service de stockage unifié
- `StorageService` avec méthodes `read(key)` / `write(key, data)`
- Support fichier JSON + localStorage selon le contexte (serveur/client)
- Interface commune pour tous les services métier

6.2. Migrer les services existants
- `TemplateLibraryService` → utiliser `StorageService`
- `VersionHandler` → utiliser `StorageService`
- `PromptManager` → utiliser `StorageService`
- `IdentityResolver` → utiliser `StorageService`

6.3. Supprimer les helpers mock
- Retirer `createMockContext()` de `usePromptSystem.ts`
- Retirer `createMockTemplate()` de `usePromptSystem.ts`
- Remplacer par des données réelles ou des seeds

### Fichiers impactés
- `src/services/storage-service.ts` (nouveau)
- `src/services/template-library.ts`
- `src/services/version-handler.ts`
- `src/services/prompt-manager.ts`
- `src/services/identity-resolver.ts`
- `composables/usePromptSystem.ts`

### Effort estimé : Lourd

---

## Mission 7 — Backend authentification

**Objectif :** Connecter les identités à un vrai service d'authentification.

### Tâches

7.1. Choisir un fournisseur d'authentification
- Évaluer Auth0, Keycloak, Firebase Auth, Supabase Auth, ou solution custom
- Définir les besoins : rôles, permissions, SSO, stockage des préférences

7.2. Intégrer le fournisseur choisi
- Mettre en place le login/logout
- Synchroniser les identités avec le fournisseur
- Remplacer les identités en RAM par les utilisateurs authentifiés

7.3. Adapter l'UI
- Ajouter un bouton login/logout
- Afficher l'utilisateur connecté
- Gérer les rôles et permissions depuis le fournisseur

### Fichiers impactés
- `src/services/identity-resolver.ts`
- `pages/identities.vue`
- `composables/useAuth.ts` (nouveau)
- `server/api/auth/` (nouveau)

### Effort estimé : Lourd

---

## Ordre d'exécution recommandé

```
Mission 1  ────────────────┐
                           ├──> Mission 2 ──> Mission 3
Mission 4  ────────────────┘
                                    │
                                    v
                               Mission 6 (transverse)
                                    │
                                    v
                               Mission 5 (indépendante)
                                    │
                                    v
                               Mission 7 (indépendante)
```

**Les missions 1, 2, 3, 4 sont indépendantes et peuvent être réalisées en parallèle.**
**La mission 6 est transverse et bénéficie de l'expérience des missions 1-4.**
**Les missions 5 et 7 sont indépendantes et peuvent être planifiées séparément.**
