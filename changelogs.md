# Changelog

Tous les changements notables du projet **Minautor Prompt Service** sont documentés ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/),
et le projet suit [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Repository :** [French-Team/minautor-prompt-service](https://github.com/French-Team/minautor-prompt-service)  
**Stack :** Nuxt 3.21 · TypeScript 5.9 · Vue 3 · Vitest · Playwright · ESLint 10 · vue-tsc

---

## [Non publié]

### À venir
- Documentation API OpenAPI/Swagger pour les routes Nitro
- Badges README dynamiques branchés sur GitHub Actions

---

## [1.0.0] — 2026-06-19

### ✨ Ajouté
- Application Nuxt 3 SSR complète avec 7 pages (Dashboard, Prompts, Templates, Identités, Contexte, Versions, Préférences)
- Librairie TypeScript modulaire (`src/`) avec modèles, services, validateurs, factories
- 8 services métier : IdentityResolver, ContextAnalyzer, PromptGenerator, PromptManager, RulesIntegrationEngine, VersionHandler, AgentAdaptation, TemplateLibrary
- 9 validateurs modulaires avec `BaseValidator<T>`
- Système de gestion d'erreurs complet (Chain of Responsibility, retry, monitoring, notifications)
- 4 composants Vue 3 réutilisables : AnalyticsDashboard, PromptCustomization, TemplateLibrary, VersionHistory
- Conteneur DI avec factory `createDIContainer`
- Modèle de données complet : Identity, Prompt, Context, Template, Version, Agent, Rule
- Tests unitaires : 553 tests (32 fichiers) — 100%
- Tests e2e Playwright : 23 tests (18 OK + 5 skips intentionnels)
- Husky + lint-staged pour les pre-commit hooks
- ESLint flat config avec règles strictes (`no-explicit-any: error`, `consistent-type-imports`)
- vue-tsc pour le type-checking des templates `.vue`
- Alias `~src` pour accéder à la librairie depuis Nuxt
- Composables Nuxt : `usePromptSystem`, `useAppSettings`
- Thème clair/sombre, personnalisation (taille police, densité, sidebar)
- Workflow GitHub Actions `validate.yml` (build + typecheck + test + lint)
- Badge CI dynamique dans le README

### 🔧 Changé
- ESLint : configuration flat config avec `eslint-plugin-vue@10.9` + `vue-eslint-parser` pour le parsing correct des fichiers `.vue`
- ESLint : 32 warnings auto-corrigés sur l'ensemble du projet
- ESLint : globaux Nuxt étendus de 16 à ~60 entrées (Vue reactivity, lifecycle, composables Nuxt)
- ESLint : globaux navigateur ajoutés (`localStorage`, `document`, `window`, etc.)
- ESLint : bloc Nitro dédié avec globaux `defineEventHandler`, `getQuery`, `readBody`, etc.
- Scripts npm : `lint` et `lint:fix` étendus à `src/ pages/ components/`
- Scripts npm : `format` étendu aux fichiers `.vue` dans `pages/` et `components/`
- Scripts npm : `validate` ajouté (build + typecheck + test + lint)
- Scripts npm : `typecheck` mis à jour avec `vue-tsc --noEmit`
- README.md : réécriture complète (badges, description, aperçu 7 pages, démarrage rapide, architecture, stack technique, métriques, tests, contribution)
- README.md : logo `logo-minautor.png` restauré en tête du fichier

### 🐛 Corrigé
- `pages/identities.vue` : `ref<any>` → `UserIdentity | null` + `IdentityProfile | null` ; `catch (e: any)` → `e: unknown`
- `pages/index.vue` : `ref<any>` → `UserIdentity | null` + `ProjectContext | null` ; `catch (e: any)` → `e: unknown`
- `pages/prompts.vue` : `ref<any>` → `Record<string, unknown> | null` ; `catch (e: any)` → `e: unknown`
- `pages/context.vue` : `useState<any>` → typage strict ; `catch (e: any)` → `e: unknown`
- `composables/useAppSettings.ts` : globaux navigateur manquants (`localStorage`, `document`)
- `server/list-dirs.get.ts` : `catch (err: any)` → `err: unknown`
- `dist/` : nombreuses erreurs `no-explicit-any` dans les fichiers compilés supprimés
- Test flaky `reanalyze-button` : `.or()` locators remplacés par `waitFor().catch()`
- `.gitignore` : ajout des noms réservés Windows (`nul`, `CON`, `PRN`, `AUX`, etc.)
- `monitoring-service.ts` : comparaison `ErrorSeverity` utilisait `'critical'` (minuscules) au lieu de `ErrorSeverity.CRITICAL`
- Bundle serveur : optimisation des dépendances (kill-port automatique, build:clean)
- Config Vite : suppression de `vite.optimizeDeps.include` inutile en production

### 🧹 Supprimé
- Dossier `.kiro/` — specs historiques de l'ancien projet
- `src/components/` (5 fichiers `.ts` marqués `@deprecated`) — remplacés par les composants Vue dans `components/`
- `rollup-plugin-visualizer` — remplacé par `npx nuxi analyze` natif

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✨ Ajouté | Nouvelle fonctionnalité |
| 🔧 Changé | Modification de fonctionnalité existante |
| 🐛 Corrigé | Correction de bug |
| 🧹 Supprimé | Fonctionnalité retirée |
| ⚠️ Sécurité | Correction de sécurité |

---

## Références

| Lien | Description |
|------|-------------|
| [1.0.0] | Release initiale |
| [Non publié] | Prochains changements |

[1.0.0]: https://github.com/French-Team/minautor-prompt-service/releases/tag/v1.0.0
