# Plan de developpement — Sprint 01

**Projet :** Minautor Prompt Service  
**Sprint :** 01 — Optimisations obligatoires  
**Perimetre :** OB-01, OB-04, OB-03  
**Duree estimee :** 2h30-3h30  
**Objectif :** Stabiliser la chaine de build et nettoyer le projet

> **Note :** OB-02 (nettoyage `.kiro/specs/`) est supprime — le dossier `.kiro/` a ete entierement supprime du projet.

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
Phase 1 : OB-04 + OB-01 (config + kill-port, impact fort)      ~1h
    OB-04 Nettoyage config Vite (15min)
    OB-01 Kill-port automatique (30min)
    ↓
Phase 2 : OB-03 Investigation bundle serveur                   ~2h
    Analyse des chunks
    Recherche de solution
    Rapport de faisabilite
```

---

## Risques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| `kill-port` non disponible sur tous les OS | Bloquant pour CI | Utiliser `npx --yes kill-port` (portable) |
| `@babel/parser` impossible a exclure du bundle SSR | Gain nul sur OB-03 | Documenter et passer a la tache suivante |
| Regression apres nettoyage config Vite | Build casse | Tester `npm run validate` complet |

---

## Livrables

| Livrable | Description |
|----------|-------------|
| `package.json` mis a jour | Script `build:clean` + `validate` modifie |
| `nuxt.config.ts` nettoye | Section `optimizeDeps` supprimee |
| Rapport OB-03 | Faisabilite de la reduction du bundle serveur |
| `todo-list_01.md` mis a jour | Suivi des taches completees |
