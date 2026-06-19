# Todo List — Sprint 01

**Projet :** Minautor Prompt Service  
**Sprint :** 01 — Optimisations obligatoires  
**Ordre d'execution :** cf. `dev-plan-01.md` — Phase 1 → Phase 2  
**Etat :** 📋 Planifie  

> **Note :** OB-02 (nettoyage `.kiro/specs/`) supprime — le dossier `.kiro/` a ete entierement supprime du projet.

---

## [Phase 1] OB-04 : Nettoyer `vite.optimizeDeps.include` 🟠 Haute

*Quick win — 15 min, zero risque.*

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 4.1 | Supprimer `vite.optimizeDeps` | `nuxt.config.ts` | 5min | ✅ |
| 4.2 | Tester `npm run dev` | Terminal | 5min | ✅ |
| 4.3 | Tester `npm run build` | Terminal | 5min | ✅ |
| 4.4 | Commit + push | Terminal | 5min | ⬜ |

**Total OB-04 :** ~15min ✅

---

## [Phase 1] OB-01 : Kill-port automatique avant build 🔴 Critique

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 1.1 | Ajouter `kill-port` en dependance dev | `package.json` | 5min | ✅ |
| 1.2 | Creer le script `build:clean` | `package.json` | 5min | ✅ |
| 1.3 | Modifier le script `build` → `build:clean` | `package.json` | 5min | ✅ |
| 1.4 | Modifier `validate` → `build:clean` | `package.json` | 5min | ✅ |
| 1.5 | Tester : `npm run validate` sans serveur | Terminal | 5min | ✅ |

**Total OB-01 :** ~30min ✅

---

## [Phase 2] OB-03 : Investigation bundle serveur 🟡 Moyenne

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 3.1 | Analyser les chunks du build serveur | Terminal | 15min | ✅ |
| 3.2 | Rechercher options Nuxt/Nitro pour exclure `@babel/parser` | Documentation | 30min | ✅ |
| 3.3 | Appliquer la minification Nitro | `nuxt.config.ts` | 15min | ✅ |
| 3.4 | Tester build + typecheck | Terminal | 10min | ✅ |
| 3.5 | Rediger le rapport de faisabilite | `docs/rapport-ob-03.md` | 15min | ✅ |
| 3.6 | Commit + push | Terminal | 5min | ⬜ |

**Total OB-03 :** ~2h ✅

---

## Recapitulatif

| Phase | Lot | Taches | Effort total | Etat |
|-------|-----|--------|-------------|------|
| Phase 1 | OB-04 + OB-01 | 9 taches | ~45min | ✅ Termine |
| Phase 2 | OB-03 | 6 taches | ~2h | ✅ Termine |
| **Total** | **3 lots** | **15 taches** | **~2h30-3h30** | ✅ Sprint 01 termine |

---

## Legende

| Symbole | Signification |
|---------|---------------|
| ⬜ | Planifie, non commence |
| 🔄 | En cours |
| ✅ | Termine |
| ❌ | Bloque / Abandonne |
