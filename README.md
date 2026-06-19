<div align="center">
  <h1>🤖 Minautor Prompt Service</h1>
  <p>
    <strong>Système de prompts intelligents basés sur l'identité pour agents LLM</strong>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Nuxt-3.21-00DC82?logo=nuxt&logoColor=white" alt="Nuxt 3.21">
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9">
    <img src="https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js&logoColor=white" alt="Vue 3">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
    <br>
    <img src="https://img.shields.io/badge/tests-553%20%E2%9C%85-success" alt="553 tests">
    <img src="https://img.shields.io/badge/e2e-18%20%E2%9C%85%20%7C%205%20%E2%8F%AD%EF%B8%8F-orange" alt="18 e2e passes">
    <img src="https://img.shields.io/badge/lint-0%20errors%20%E2%9C%85-success" alt="0 lint errors">
    <img src="https://img.shields.io/badge/typecheck-0%20errors%20%E2%9C%85-success" alt="0 typecheck errors">
  </p>
</div>

---

## ✨ De quoi s'agit-il ?

**Minautor Prompt Service** est une application web SSR complète (Nuxt 3) doublée d'une librairie TypeScript modulaire, qui permet de :

- 🧩 **Gerer des identites utilisateur** — avec profils, permissions et preferences personnalisees
- 📝 **Generer des prompts adaptes** — automatiquement contextualises selon l'identite, le projet et les regles metier
- 📚 **Administrer des templates** — versionnes, categorises, avec recherche et filtres
- 🔄 **Historiser les versions** — timeline complete avec creation et restauration
- 📊 **Analyser le contexte projet** — flux de travail actifs, outils disponibles, ecosysteme technique

> Construit avec **Nuxt 3.21**, **TypeScript 5.9** et **Vue 3**.

---

## 📸 Apercu des pages

| Page | Description |
|------|-------------|
| **Dashboard** | 4 cartes KPI, analyse de contexte, etat du projet |
| **Contextes** | Analyse temps reel du dossier de travail, flux actifs |
| **Identites** | Profils utilisateur, permissions, personnalisation |
| **Prompts** | Generation de prompts contextualises par identite |
| **Templates** | CRUD, galerie, recherche et filtre par categorie |
| **Versions** | Timeline des versions, restauration, historique |
| **Preferences** | Theme clair/sombre, taille police, densite, sidebar |

---

## 🚀 Demarrage rapide

```bash
# 1. Installer les dependances
npm install

# 2. Lancer en developpement
npm run dev

# 3. Ouvrir http://localhost:3000
```

### Commandes essentielles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de developpement Nuxt |
| `npm run build` | Build de production |
| `npm run validate` | Pipeline complet : build + typecheck + test + lint |
| `npm test` | 553 tests unitaires Vitest |
| `npm run test:e2e` | 23 tests end-to-end Playwright |
| `npm run lint` | ESLint strict — 0 erreur, 0 warning |
| `npm run typecheck` | Verification TypeScript (tsc + vue-tsc) |

---

## 🏗️ Architecture

```
flux-de-travail/
├── src/                       #  Librairie backend TypeScript
│   ├── models/                #    Modeles de donnees (Identity, Prompt, Context...)
│   │   ├── validators/        #    Validateurs modulaires (9 validateurs)
│   │   └── factories/         #    Fabrication d'identites
│   ├── services/              #    Services metier (resolveur, generateur, cache...)
│   │   └── error-handling/    #    Gestion centralisee des erreurs
│   ├── config/                #    Configuration + injecteur de dependances
│   └── components/            #    Composants via librairie (deprecies cote Nuxt)
├── components/                #  Composants Vue 3 (4 composants reutilisables)
├── pages/                     #  Pages Nuxt (6 pages)
├── layouts/                   #   Layouts (header, navigation, theme)
├── composables/               #  Composables Nuxt
├── server/                    #  API routes Nitro
├── e2e/                       #  Tests Playwright (23 tests)
├── assets/                    #  CSS, Tailwind
├── .github/workflows/         #  CI/CD GitHub Actions
└── .husky/                    #  Pre-commit hooks (lint-staged)
```

### Stack technique

| Technologie | Version | Role |
|-------------|---------|------|
| Nuxt | 3.21 | Framework SSR complet |
| Vue | 3 (latest) | Interface utilisateur reactive |
| TypeScript | 5.9 | Typage strict — 0 erreur |
| Tailwind CSS | 6.8 | Design system utility-first |
| Vitest | 3.2 | Tests unitaires (553) |
| Playwright | 1.61 | Tests e2e (23) |
| ESLint | 10.0 | Linting strict |
| vue-tsc | 3.3 | Type-checking des templates .vue |

---

## 📊 Metriques

| Metrique | Valeur |
|----------|--------|
| Fichiers source | ~50 .ts + ~10 .vue |
| Lignes de code | ~8 500 |
| Tests unitaires | 553 — 32 fichiers, 100% |
| Tests e2e | 23 — 18 OK + 5 skips intentionnels |
| Bundle client | 439 Ko (69 Ko gzip) |
| Bundle serveur | 2.9 Mo |
| Lint | 0 erreur, 0 warning |
| Typecheck | 0 erreur |
| `any` restants | 0 (hors 2 eslint-designes intentionnels) |

---

## 🧪 Tests

```bash
# Tous les tests unitaires
npm test

# Tests end-to-end (necessite un build prealable)
npm run test:e2e

# Un fichier specifique
npx vitest --run src/test/services/identity-resolver.test.ts
npx playwright test e2e/reanalyze-button.spec.ts
```

Le **pre-commit hook** Husky verifie automatiquement le lint via lint-staged avant chaque commit.

---

## 🤝 Contribution

1. 🍴 Forker le projet
2. 🌿 Creer une branche (`git checkout -b feat/ma-feature`)
3. 🔧 Coder + valider (`npm run validate` doit passer)
4. ✅ Commiter (le lint est verifie par Husky)
5. 📤 Pusher (`git push origin feat/ma-feature`)
6. 🔀 Ouvrir une Pull Request

---

## 📄 License

MIT — 2026 French Team

---

<div align="center">
  <sub>Made with ❤️ by the Minautor team</sub>
  <br>
  <sub>
    <a href="https://github.com/French-Team/minautor-prompt-service">GitHub</a> ·
    <a href="https://github.com/French-Team/minautor-prompt-service/issues">Signaler un bug</a>
  </sub>
</div>
