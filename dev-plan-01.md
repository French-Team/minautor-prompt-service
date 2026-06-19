# Plan de developpement — Sprint 01

**Projet :** Minautor Prompt Service  
**Sprint :** 01 — Optimisations obligatoires  
**Perimetre :** OB-01 a OB-04  
**Duree estimee :** 4-6 heures  
**Objectif :** Stabiliser la chaine de build et nettoyer le projet

---

## OB-01 : Kill-port automatique avant build 🔴 Critique

### Probleme
Le serveur Nuxt preview (port 3000) bloque la suppression de `.output/` lors d'un rebuild, ce qui fait echouer `npm run build` et `npm run validate` avec l'erreur `EBUSY: resource busy or locked`.

### Solution
Ajouter un script `build:clean` qui tue le port 3000 avant de lancer le build, et modifier `validate` pour l'utiliser.

### Actions

| # | Action | Fichier |
|---|--------|---------|
| 1.1 | Ajouter `kill-port` en dependance dev ou utiliser `npx --yes kill-port` | `package.json` |
| 1.2 | Creer le script `build:clean`: `npx --yes kill-port 3000 2>/dev/null; sleep 1; nuxt build` | `package.json` |
| 1.3 | Modifier le script `build` pour appeler `build:clean` | `package.json` |
| 1.4 | Ajouter `build:clean` au debut de `validate` | `package.json` |
| 1.5 | Tester : `npm run validate` sans serveur actif → build OK | Terminal |

### Criteres de validation
- `npm run build` reussi meme si un serveur tourne sur le port 3000
- `npm run validate` ne bloque plus sur `EBUSY`

---

## OB-02 : Nettoyer les specs `.kiro/` 🔴 Critique

### Probleme
11 dossiers de specifications historiques (`.kiro/specs/`) de l'ancien projet subsistent, dont certaines parlent d'architectures qui n'existent plus (Flux Workflow v1/v2, etc.).

### Solution
Auditer chaque spec, archiver celles qui sont obsoletes, conserver celles qui sont encore pertinentes.

### Actions

| # | Action | Fichier |
|---|--------|---------|
| 2.1 | Lister les 11 specs avec leur contenu et les classifier (pertinent / obsolete) | `.kiro/specs/` |
| 2.2 | Deplacer les specs obsoletes dans `.kiro/specs/archived/` | `.kiro/specs/` |
| 2.3 | Conserver les specs encore pertinentes sur place | `.kiro/specs/` |
| 2.4 | Mettre a jour les fichiers de steering si necessaire | `.kiro/steering/` |
| 2.5 | Valider que les hooks Kiro fonctionnent toujours | `.kiro/hooks/` |

### Criteres de validation
- Les specs en double ou obsoletes sont archivees
- Les specs pertinentes sont conservees
- Aucun hook Kiro casse

---

## OB-04 : Nettoyer `vite.optimizeDeps.include` dans `nuxt.config.ts` 🟠 Haute

### Probleme
`vite.optimizeDeps.include` contient `src/index.ts` et `src/config/index.ts` qui n'ont d'effet qu'en mode developpement. En production (build Nuxt), ces entrees sont inutiles.

### Solution
Supprimer la section `optimizeDeps.include` de `nuxt.config.ts`.

### Actions

| # | Action | Fichier |
|---|--------|---------|
| 4.1 | Supprimer `vite.optimizeDeps` du fichier de config | `nuxt.config.ts` |
| 4.2 | Tester `npm run dev` (verifier qu'il demarre toujours) | Terminal |
| 4.3 | Tester `npm run build` (build OK) | Terminal |

### Criteres de validation
- `npm run dev` demarre sans erreur
- `npm run build` reussi

---

## OB-03 : Investir la reduction du bundle serveur 🟡 Moyenne

### Probleme
Le bundle serveur pese 2.9 Mo. Le plus gros contributeur est `@vue/compiler-core` qui embarque `@babel/parser` (504 Ko). Il faut determiner si ce poids peut etre reduit.

### Solution
Analyse du bundle serveur et investigation des options de configuration Nuxt/Nitro.

### Actions

| # | Action | Fichier |
|---|--------|---------|
| 3.1 | Analyser le bundle serveur avec `nuxt build` et inspecter les chunks | Terminal |
| 3.2 | Rechercher si Nuxt/Nitro propose une option pour exclure `@babel/parser` du bundle SSR | Documentation |
| 3.3 | Si possible, appliquer la configuration dans `nuxt.config.ts` | `nuxt.config.ts` |
| 3.4 | Tester le build et les e2e apres modification | Terminal |

### Criteres de validation
- Rapport sur la faisabilite de la reduction du bundle serveur
- Si applicable : config appliquee et build OK

---

## Planning d'execution

```
Phase 1 : OB-01 + OB-04 (config, rapide, impact fort)       ~1h
    OB-04 Nettoyage config Vite (15min)
    OB-01 Kill-port automatique (30min)
    ↓
Phase 2 : OB-02 Audit specs .kiro/                           ~2h
    Classification des 11 specs
    Archivage des obsoletes
    ↓
Phase 3 : OB-03 Investigation bundle serveur                ~2h
    Analyse des chunks
    Recherche de solution
    Rapport de faisabilite
```

---

## Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| `kill-port` non disponible sur tous les OS | Bloquant pour CI | Utiliser `npx --yes kill-port` (portable) |
| Spec .kiro pertinentes identifiees par erreur comme obsoletes | Perte d'information | Archivage, pas de suppression definitive |
| `@babel/parser` impossible a exclure du bundle SSR | Gain nul sur OB-03 | Documenter et passer a la tache suivante |
| Regression apres nettoyage config Vite | Build casse | Tester `npm run validate` complet |

---

## Livrables

| Livrable | Description |
|----------|-------------|
| `package.json` mis a jour | Script `build:clean` + `validate` modifie |
| `.kiro/specs/` nettoye | Specs archivees et organisees |
| `nuxt.config.ts` nettoye | Section `optimizeDeps` supprimee |
| Rapport OB-03 | Faisabilite de la reduction du bundle serveur |
| `todo-list_01.md` mis a jour | Suivi des taches completees |
