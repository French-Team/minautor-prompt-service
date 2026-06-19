# Todo List — Sprint 01

**Projet :** Minautor Prompt Service  
**Sprint :** 01 — Optimisations obligatoires  
**Etat :** 📋 Planifie  

---

## OB-01 : Kill-port automatique avant build 🔴 Critique

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 1.1 | Ajouter `kill-port` en dependance dev | `package.json` | 5min | ⬜ |
| 1.2 | Creer le script `build:clean` | `package.json` | 5min | ⬜ |
| 1.3 | Modifier le script `build` → `build:clean` | `package.json` | 5min | ⬜ |
| 1.4 | Modifier `validate` → `build:clean` | `package.json` | 5min | ⬜ |
| 1.5 | Tester : `npm run validate` sans serveur | Terminal | 5min | ⬜ |

**Total OB-01 :** ~30min

---

## OB-02 : Nettoyer les specs `.kiro/` 🔴 Critique

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 2.1 | Lister et classifier les 11 specs | `.kiro/specs/` | 30min | ⬜ |
| 2.2 | Creer le dossier `archived/` | `.kiro/specs/` | 5min | ⬜ |
| 2.3 | Deplacer les specs obsoletes | `.kiro/specs/` | 15min | ⬜ |
| 2.4 | Conserver les specs pertinentes | `.kiro/specs/` | 5min | ⬜ |
| 2.5 | Mettre a jour les fichiers steering | `.kiro/steering/` | 15min | ⬜ |
| 2.6 | Valider les hooks Kiro | `.kiro/hooks/` | 10min | ⬜ |
| 2.7 | Commit + push | Terminal | 5min | ⬜ |

**Total OB-02 :** ~1h30

---

## OB-04 : Nettoyer `vite.optimizeDeps.include` 🟠 Haute

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 4.1 | Supprimer `vite.optimizeDeps` | `nuxt.config.ts` | 5min | ⬜ |
| 4.2 | Tester `npm run dev` | Terminal | 5min | ⬜ |
| 4.3 | Tester `npm run build` | Terminal | 1min | ⬜ |
| 4.4 | Commit + push | Terminal | 5min | ⬜ |

**Total OB-04 :** ~15min

---

## OB-03 : Investigation bundle serveur 🟡 Moyenne

| # | Tache | Fichier | Effort | Etat |
|---|-------|---------|--------|------|
| 3.1 | Analyser les chunks du build serveur | Terminal | 15min | ⬜ |
| 3.2 | Rechercher options Nuxt/Nitro pour exclure `@babel/parser` | Documentation | 30min | ⬜ |
| 3.3 | Appliquer la configuration si possible | `nuxt.config.ts` | 15min | ⬜ |
| 3.4 | Tester build + e2e apres modif | Terminal | 30min | ⬜ |
| 3.5 | Rediger le rapport de faisabilite | `docs/` | 15min | ⬜ |
| 3.6 | Commit + push si applicable | Terminal | 5min | ⬜ |

**Total OB-03 :** ~2h

---

## Recapitulatif

| Lot | Taches | Effort total | Etat |
|-----|--------|-------------|------|
| OB-01 | 5 taches | ~30min | ⬜ Planifie |
| OB-02 | 7 taches | ~1h30 | ⬜ Planifie |
| OB-04 | 4 taches | ~15min | ⬜ Planifie |
| OB-03 | 6 taches | ~2h | ⬜ Planifie |
| **Total** | **22 taches** | **~4h-6h** | ⬜ |

---

## Legende

| Symbole | Signification |
|---------|---------------|
| ⬜ | Planifie, non commence |
| 🔄 | En cours |
| ✅ | Termine |
| ❌ | Bloque / Abandonne |
