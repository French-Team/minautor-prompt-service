# Plan de developpement — Sprint 04

**Projet :** Minautor Prompt Service  
**Sprint :** 04 — Ameliorations basse priorite  
**Perimetre :** SPRINT-A a SPRINT-C  
**Duree estimee :** 1h-2h  
**Objectif :** Versionner le changelog, enrichir le theme sombre, ajouter un script SSL

---

## SPRINT-A : Version Keep a Changelog 🟢 Basse

### Probleme
Le `changelogs.md` existait en format libre (tableaux, sections non standardisees). Pas de liens de comparaison GitHub, pas de structure semantique.

### Solution
Reecrire au format [Keep a Changelog](https://keepachangelog.com/) avec :
- Sections standard : Ajoute, Change, Corrige, Supprime
- Liens de comparaison GitHub
- Versions semantiques ([1.0.0], [Non publie])
- Legende des symboles

### Changements
| # | Action | Fichier |
|---|--------|---------|
| A.1 | Reformater au format Keep a Changelog | `changelogs.md` |

---

## SPRINT-B : Theme sombre avance 🟢 Basse

### Probleme
Le theme sombre couvre le layout de base mais pas les composants specifiques (textarea, FolderTreePicker modal, boutons settings).

### Solution
Ajouter les variantes dark theme manquantes dans `main.css` :
- `textarea` — fond, bordure, placeholder, focus
- FolderTreePicker — modal, overlay, breadcrumb, entrées, hover states
- Boutons alternatifs settings — fond sombre
- Spinner de chargement

### Changements
| # | Action | Fichier |
|---|--------|---------|
| B.1 | Ajouter dark theme pour textarea | `assets/css/main.css` |
| B.2 | Ajouter dark theme pour FolderTreePicker | `assets/css/main.css` |
| B.3 | Ajouter dark theme pour boutons settings | `assets/css/main.css` |
| B.4 | Ajouter dark theme pour spinner | `assets/css/main.css` |

---

## SPRINT-C : Script dev SSL 🟢 Basse

### Probleme
Pas de moyen rapide de lancer le serveur de dev en HTTPS.

### Solution
Ajouter `npm run dev:ssl` utilisant `nuxt dev --https` (auto-génération de certificats).

### Changements
| # | Action | Fichier |
|---|--------|---------|
| C.1 | Ajouter script `dev:ssl` | `package.json` |

---

## Metriques

| Metrique | Valeur |
|----------|--------|
| Tests | 577 — 0 echec |
| Typecheck | 0 erreur |
| Build | OK |
