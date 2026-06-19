# Changelog — Minautor Prompt Service

**Repository :** French-Team/minautor-prompt-service  
**Stack :** Nuxt 3.21 · TypeScript 5.9 · Vue 3 · Vitest · Playwright · ESLint 10 · vue-tsc  
**Derniere mise a jour :** 19 juin 2026

---

## [1.0.0] — 2026-06-19 — Commit initial

### ✨ Nouveautés

- Application Nuxt 3 SSR complète avec 6 pages (Dashboard, Contextes, Identites, Prompts, Templates, Versions, Preferences)
- Librairie TypeScript modulaire (`src/`) avec modeles, services, validateurs, factories
- 8 services metier : IdentityResolver, ContextAnalyzer, PromptGenerator, PromptManager, RulesIntegrationEngine, VersionHandler, AgentAdaptation, TemplateLibrary
- 9 validateurs modulaires avec `BaseValidator<T>`
- Systeme de gestion d'erreurs complet (Chain of Responsibility, retry, monitoring, notifications)
- 4 composants Vue 3 reutilisables : AnalyticsDashboard, PromptCustomization, TemplateLibrary, VersionHistory
- Conteneur DI avec factory `createDIContainer`
- Modele de donnees complet : Identity, Prompt, Context, Template, Version, Agent, Rule
- Tests unitaires : 553 tests (32 fichiers) — 100%
- Tests e2e Playwright : 23 tests (18 OK + 5 skips intentionnels)
- Husky + lint-staged pour les pre-commit hooks
- ESLint flat config avec regles strictes (`no-explicit-any: error`, `consistent-type-imports`)
- vue-tsc pour le type-checking des templates .vue
- Alias `~src` pour acceder a la librairie depuis Nuxt
- Composables Nuxt : `usePromptSystem`, `useAppSettings`
- Theme clair/sombre, personnalisation (taille police, densite, sidebar)

---

## Corrections et améliorations (session du 19 juin 2026)

Les changements ci-dessous ont été effectués après le commit initial pour amener le projet à un état zéro-défaut.

---

### ESLint et Qualite du code

| Changement | Detail |
|------------|--------|
| Configuration ESLint flat config | `eslint-plugin-vue@10.9` + `vue-eslint-parser` — parsing correct des fichiers .vue |
| Regles Vue activees | `vue/attributes-order`, `html-closing-bracket-spacing`, `html-self-closing` |
| 32 warnings auto-corriges | `eslint --fix` sur l'ensemble du projet |
| Globaux Nuxt etendus | `nuxtGlobals` passe de 16 a ~60 entrees (Vue reactivity, lifecycle, composables Nuxt) |
| Globaux navigateur ajoutes | `localStorage`, `document`, `window`, `HTMLElement`, `MutationObserver`, etc. |
| Bloc Nitro dedie | `server/**/*.ts` avec globaux : `defineEventHandler`, `getQuery`, `readBody`, etc. |

### Suppression des `any`

| Fichier | Corrections |
|---------|-------------|
| `pages/identities.vue` | `ref<any>` → `UserIdentity | null` + `IdentityProfile | null` ; `catch (e: any)` → `e: unknown` |
| `pages/index.vue` | `ref<any>` → `UserIdentity | null` + `ProjectContext | null` ; `catch (e: any)` → `e: unknown` |
| `pages/prompts.vue` | `ref<any>` → `Record<string, unknown> | null` ; `let identity: any` → `UserIdentity | null` ; supprime `as any` ; `catch (e: any)` → `e: unknown` |
| `pages/context.vue` | `useState<any>` → `ProjectContext | null` + `FlowState | null` ; `catch (e: any)` → `e: unknown` |
| `composables/useAppSettings.ts` | Correction `localStorage`/`document` non definis (globaux navigateur ajoutes) |
| `server/list-dirs.get.ts` | `catch (err: any)` → `err: unknown` |
| `dist/` (anciens fichiers compiles) | Nombreuses erreurs `no-explicit-any` corrigees |
| `eslint-disable` intentionnels | 2 `eslint-disable-next-line` pour `(window as any)` et `(process as any)` dans context.vue |

**Total : 0 `any` restants** (hors 2 eslint-designes intentionnels)

### Scripts npm

| Changement | Detail |
|------------|--------|
| `script lint` etendu | `src/` → `src/ pages/ components/` |
| `script lint:fix` etendu | `src/` → `src/ pages/ components/` |
| `script format` etendu | Ajout de `pages/**/*.vue` et `components/**/*.vue` |
| `script validate` ajoute | `nuxt build && tsc --noEmit && vue-tsc --noEmit && vitest --run && eslint src/ pages/ components/ --ext .ts,.vue` |
| `script typecheck` mis a jour | Ajout de `vue-tsc --noEmit` |

### Stabilisation des tests

| Changement | Detail |
|------------|--------|
| Test flaky `reanalyze-button` | `.or()` locators remplaces par `waitFor().catch()` — evite le strict mode violation |
| Cache supprime | `.output/`, `.nuxt/`, `node_modules/.cache/` purges pour build propre |
| Validation complete | `npm run validate` — build + typecheck + test + lint, tout vert |

### CI/CD

| Changement | Detail |
|------------|--------|
| `.github/workflows/validate.yml` | Workflow GitHub Actions : build + typecheck + test + lint sur push/PR |
| Badge CI dynamique | Ajoute dans le README (shields.io, statut du dernier run) |

### Documentation

| Changement | Detail |
|------------|--------|
| `README.md` | Reecriture complete : badges, description, apercu 7 pages, demarrage rapide, architecture, stack technique, metriques, tests, contribution |
| Logo restaure | `assets/images/logo-minautor.png` remis en tete du README |
| `rapport-final.md` | Rapport d'etat zero-defaut genere |

### Git

| Evenement | Detail |
|-----------|--------|
| Commit initial | `142f79e` — 137 fichiers |
| Remote configure | `origin` → `https://github.com/French-Team/minautor-prompt-service` |
| `.gitignore` enrichi | Ajout des noms reserves Windows (`nul`, `CON`, `PRN`, `AUX`, etc.) |

---

## Metriques actuelles

| Metrique | Valeur |
|----------|--------|
| Fichiers source | ~50 .ts + ~10 .vue |
| Lignes de code | ~8 500 |
| Tests unitaires | 553 (32 fichiers) — 100% |
| Tests e2e | 23 (18 OK + 5 skips intentionnels) |
| Bundle client | 439 Ko (69 Ko gzip) |
| Bundle serveur | 2.9 Mo |
| Lint | 0 erreur, 0 warning |
| Typecheck | 0 erreur (tsc + vue-tsc) |
| `any` restants | 0 (hors 2 eslint-designes intentionnels) |
| Commits | 6 |

---

## Problèmes residuels connus

1. **Tests e2e skippes** — 5 skips intentionnels (analyse trop rapide, contexte serveur manquant)
2. **`useAppSettings()` dans layouts/default.vue** — appele sans utiliser la valeur de retour (effet de bord CSS)
3. **`(window as any)` / `(process as any)`** dans context.vue — supprimes par eslint-disable, pattern intentionnel
4. **Badges statiques** — les badges tests, lint, typecheck sont hardcodes (553, 0) et deviendront obsoletes si les metriques evoluent

---

## Optimisation obligatoire

| ID | Priorite | Action | Gain attendu |
|----|----------|--------|-------------|
| OB-01 | 🔴 Critique | **Kill-port automatique avant `npm run build`** — le serveur de preview (port 3000) bloque la suppression de `.output/` | Builds fiables sans manipulation manuelle |
| OB-02 | 🔴 Critique | **Nettoyer `.kiro/specs/`** — 11 specs historiques de l'ancien projet (dont `flux-workflow-system-v2`) qui ne refletent plus la realite du projet | Clarte et maintenabilite de la doc |
| OB-03 | 🟡 Moyenne | **Investigar la reduction du bundle serveur** — `@babel/parser` (504 Ko) est embarque par `@vue/compiler-core`. Necessite une investigation plus approfondie pour determiner si ce poids peut etre reduit sans patcher Vue | ~500 Ko potentiels (a confirmer) |
| OB-04 | 🟠 Haute | **Nettoyer `vite.optimizeDeps.include`** dans `nuxt.config.ts` — les entrees `src/index.ts` et `src/config/index.ts` n'ont d'effet qu'en mode dev, pas en production | Config plus propre, comprehension facilitee |
| OB-05 | 🟡 Moyenne | **Rendre les badges README dynamiques** — brancher les badges tests/lint/typecheck sur des badges GitHub Actions au lieu de valeurs hardcodees | Metriques toujours a jour |
| OB-06 | 🟡 Moyenne | **Ajouter `.env.example`** — documenter les variables d'environnement necessaires (si applicables) | Onboarding plus rapide |

---

## Améliorations possibles par priorité

### Haute priorite 🟠

| Amelioration | Description | Effort |
|-------------|-------------|--------|
| **Lazy loading des pages** | Les 6 pages sont chargées dans le chunk principal (184 Ko). Decomiser en chunks separes via `definePageMeta({ lazy: true })` | 1h |
| **Tests dans le pre-commit hook** | Ajouter `vitest --run --related` pour ne lancer que les tests impactes par les fichiers staged (via `lint-staged`) | 30min |
| **Tests dans le pipeline e2e CI** | Ajouter un workflow parallele `e2e.yml` declenche apres validation pour les tests Playwright, sans bloquer le merge | 2h |

### Priorite moyenne 🟡

| Amelioration | Description | Effort |
|-------------|-------------|--------|
| **Couverture de tests** | 553 tests unitaires c'est bien, mais la couverture des services (surtout error-handling) pourrait etre renforcee | 2-3h |
| **Analyse visuelle du bundle** | Ajouter `rollup-plugin-visualizer` et lancer `nuxt build --analyze` pour identifier precisement ce qui gonfle le chunk principal | 30min |
| **Migration des composables vues** | Remplacer les `.ts` dans `src/components/` (marques `@deprecated`) par les `.vue` dans `components/` — harmonisation | 1h |
| **Validation e2e sur CI** | Ajouter un workflow `e2e.yml` parallele au `validate.yml` pour les tests Playwright | 1h |

### Basse priorite 🟢

| Amelioration | Description | Effort |
|-------------|-------------|--------|
| **Versioning du changelog** | Adopter le format [Keep a Changelog](https://keepachangelog.com/) avec versions semantiques et liens de comparaison GitHub | 15min |
| **Script `npm run dev:ssl`** | Ajouter un script pour le developpement en HTTPS (utile pour tester les PWA/service workers) | 30min |
| **Theme sombre avance** | Ajouter des variantes de theme sombre pour les composants (actuellement seulement le layout de base) | 2h |
| **Documentation API** | Generer une doc OpenAPI/Swagger pour les routes Nitro dans `server/` | 2h |

---

## Roadmap suggeree

```
Sprint 1 : Optimisations obligatoires (OB-01 a OB-04)
    OB-01 🔴 Kill-port automatique
    OB-02 🔴 Nettoyage specs .kiro/
    OB-03 🟠 Reduction bundle serveur
    OB-04 🟠 Nettoyage config Vite
    ↓
Sprint 2 : Qualite et outils
    OB-05 🟡 Badges dynamiques
    OB-06 🟡 .env.example
    Haute priorite : Lazy loading pages, Tests pre-commit
    ↓
Sprint 3 : Fonctionnalites et polish
    Priorite moyenne : Bundle analyze, e2e CI, migration composants
    Priorite basse : Dark theme, docs API
```
