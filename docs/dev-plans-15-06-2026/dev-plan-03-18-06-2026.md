# Plan de developpement — Sprint 03

**Projet :** Minautor Prompt Service  
**Sprint :** 03 — Ameliorations moyenne priorite  
**Perimetre :** SPRINT-A a SPRINT-C  
**Duree estimee :** 3h-4h  
**Objectif :** Renforcer la couverture de tests, ajouter l'analyse du bundle, nettoyer les composants obsoletes

---

## SPRINT-A : Couverture de tests 🟡 Moyenne

### Probleme
Les services `MonitoringService` et `ErrorHandlerChain` n'avaient aucun test unitaire. Les handlers individuels (`AgentErrorHandler`, `ContextErrorHandler`, `RuleErrorHandler`, `TemplateErrorHandler`) etaient egalement non couverts.

### Solution
Creer 2 nouveaux fichiers de test :
1. `src/test/services/error-handling/monitoring-service.test.ts` — 57 tests
2. `src/test/services/error-handling/error-handler-chain.test.ts` — 14 tests

**Total : 24 nouveaux tests** (553 → 577)

### Changements
| # | Action | Fichier |
|---|--------|---------|
| A.1 | Creer les tests MonitoringService | `src/test/services/error-handling/monitoring-service.test.ts` |
| A.2 | Creer les tests ErrorHandlerChain | `src/test/services/error-handling/error-handler-chain.test.ts` |
| A.3 | Corriger bug enum dans monitoring-service.ts | `src/services/error-handling/monitoring-service.ts` |

---

## SPRINT-B : Analyse visuelle du bundle 🟡 Moyenne

### Probleme
Pas de moyen rapide d'analyser la composition du bundle Nuxt (taille des chunks, dependances).

### Solution
Ajouter le script `npm run analyze` utilisant la commande `npx nuxi analyze` fournie par Nuxt.

### Changements
| # | Action | Fichier |
|---|--------|---------|
| B.1 | Ajouter `npm run analyze` | `package.json` |

---

## SPRINT-C : Migration des composants obsoletes 🟡 Moyenne

### Probleme
5 fichiers `.ts` dans `src/components/` sont marques `@deprecated` et ne sont imports par aucun code. Les vrais composants Vue sont dans `components/` (auto-import Nuxt).

### Solution
Supprimer les 5 fichiers deprecies.

### Changements
| # | Action | Fichier |
|---|--------|---------|
| C.1 | Supprimer `analytics-dashboard.ts` | `src/components/` |
| C.2 | Supprimer `prompt-customization.ts` | `src/components/` |
| C.3 | Supprimer `template-library.ts` | `src/components/` |
| C.4 | Supprimer `version-history.ts` | `src/components/` |
| C.5 | Supprimer `index.ts` | `src/components/` |

---

## Metriques

| Metrique | Avant | Apres |
|----------|-------|-------|
| Tests unitaires | 553 | **577** (+24) |
| Fichiers de test | 32 | **34** (+2) |
| Composants deprecies | 5 | **0** (-5) |
| Typecheck | 0 erreur | 0 erreur |
| Lint | 0 erreur | 0 erreur |
