# Plan de developpement — Sprint 02

**Projet :** Minautor Prompt Service  
**Sprint :** 02 — Ameliorations haute priorite  
**Perimetre :** SPRINT-01 a SPRINT-03  
**Duree estimee :** 1h-1h30  
**Objectif :** Lazy loading, tests pre-commit, e2e CI etendu

---

## SPRINT-01 : Lazy loading des pages 🟠 Haute

### Probleme
Les pages Nuxt sont deja automatiquement code-splittees, mais aucun indicateur de chargement ni transition n'est presente. La navigation semble instantanee sans retour visuel.

### Solution
1. Ajouter `<NuxtLoadingIndicator>` dans le layout pour un feedback visuel
2. Configurer `pageTransition` dans `nuxt.config.ts`
3. Activer `keepalive` sur le dashboard (page la plus visitee)
4. Ajouter le CSS des transitions de page

### Changements
| # | Action | Fichier |
|---|--------|---------|
| 1.1 | Ajouter `<NuxtLoadingIndicator>` | `layouts/default.vue` |
| 1.2 | Configurer `pageTransition` dans `nuxt.config.ts` | `nuxt.config.ts` |
| 1.3 | Ajouter `keepalive: true` sur le dashboard | `pages/index.vue` |
| 1.4 | Ajouter le CSS des transitions de page | `assets/css/main.css` |

---

## SPRINT-02 : Tests dans le hook pre-commit 🟠 Haute

### Probleme
Le dossier `.husky/` est vide — aucun hook pre-commit n'est configure.

### Solution
Creer `.husky/pre-commit` qui execute `lint-staged` (lint + format sur les fichiers staged) puis `npm test` (553 tests unitaires, ~6s).

### Changements
| # | Action | Fichier |
|---|--------|---------|
| 2.1 | Creer `.husky/pre-commit` avec `npx lint-staged && npm test` | `.husky/pre-commit` |

---

## SPRINT-03 : Workflow e2e etendu 🟠 Haute

### Probleme
Le workflow e2e (`playwright-e2e.yml`) ne se declenche que sur les branches `main` et `develop`, pas sur `master`.

### Solution
Ajouter `master` aux triggers de push et pull_request.

### Changements
| # | Action | Fichier |
|---|--------|---------|
| 3.1 | Ajouter `master` aux branches de trigger | `.github/workflows/playwright-e2e.yml` |

---

## Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Tests flaky bloquent les commits | Perturbation du workflow | `npm test` complet est rapide (~6s) et stable (553/553) |
| Transition CSS non supportee | Navigation degradee | Graceful degradation : navigateurs ignores le CSS inconnu |
| Hook non executable sur Windows | Hook ignore | `chmod +x` applique ; Husky gere le fallback Windows |

---

## Livrables

| Livrable | Description |
|----------|-------------|
| Layout mis a jour | `NuxtLoadingIndicator` + transitions |
| Hook pre-commit | Lint + tests automatiques |
| CI e2e etendu | Inclut `master` |
| `dev-plan-02.md` / `todo-list_02.md` | Documents de sprint |
