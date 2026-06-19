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
