# Rapport OB-03 — Reduction du bundle serveur

**Projet :** Minautor Prompt Service  
**Sprint :** 01 — Phase 2  
**Date :** 19 juin 2026  
**Auteur :** Analyse automatisee  

---

## 1. Etat des lieux

### Taille du build

| Element | Taille |
|---------|--------|
| `.output/` total | **3.3 Mo** |
| `.output/server/` total | **2.9 Mo** |
| `.output/server/chunks/` | 1.1 Mo |
| `.output/server/node_modules/` | 1.8 Mo |
| `.output/public/` (client) | 439 Ko |

### Repartition du bundle serveur (2.9 Mo)

```
server/
├── chunks/       1.1 Mo  ← code compile + dependances inlinees
│   ├── nitro.mjs             162 Ko  ← runtime Nitro
│   ├── prompt-generator       48 Ko
│   ├── server.mjs             47 Ko
│   ├── rules-integration      38 Ko
│   ├── context-analyzer       29 Ko
│   └── ...                    20-22 Ko (autres modules metier)
│
└── node_modules/  1.8 Mo  ← dependances externes copiees
    ├── @vue/        701 Ko  ← compiler-core, compiler-ssr, runtime
    ├── @babel/      508 Ko  ← @babel/parser, @babel/core, etc.
    ├── source-map-js 133 Ko
    ├── vue-router    117 Ko
    ├── unhead        117 Ko
    └── autres       224 Ko  ← entities, devalue, ufo, hookable, etc.
```

---

## 2. Analyse de `@babel/parser`

### Constat

`@babel/parser` (504 Ko dans le bundle serveur) est **present uniquement comme dependance externe** (`node_modules/`) et **absente des chunks inlinees**. Le tree-shaking de Nitro fonctionne correctement.

### Chemins d'importation

`@babel/parser` est importe via 6 chemins :

```
nuxt
  → @nuxt/vite-builder
    → @vitejs/plugin-vue-jsx → @babel/core → @babel/parser
    → @vue/babel-plugin-jsx → @vue/babel-plugin-resolve-type → @babel/parser
  
  → unplugin-vue-router
    → @babel/generator → @babel/parser
    → @vue-macros/common → ast-kit → @babel/parser
    → ast-walker-scope → @babel/parser

@vue/test-utils / @nuxt/test-utils
  → @vue/compiler-dom → @vue/compiler-core → @babel/parser
```

Tous ces chemins sont des outils de **build** (`vite-builder`, `unplugin-vue-router`, `compiler-sfc`). En theorie, ils ne devraient pas etre necessaires au runtime SSR une fois les templates pre-compiles.

### Verdict

`@babel/parser` est **probablement du code mort** dans le bundle serveur. Nuxt 3 compile tous les templates en fonctions `_sfc_render` pendant le build. Le runtime SSR (`@vue/server-renderer`) execute ces fonctions sans avoir besoin de parser du code.

Cependant :
- `@vue/compiler-core` (present dans le bundle serveur) importe `@babel/parser` statiquement
- Si ce code n'est jamais execute, un shim vide fonctionnerait
- Si jamais il est execute (edge case), le serveur crasherait

---

## 3. Options envisagees

### Option A : Shim `@babel/parser` → module vide (Risque : FAIBLE)

**Principe :** Remplacer `@babel/parser` par un module vide dans le bundle Nitro via `alias`.

**Configuration :**
```ts
// nuxt.config.ts
nitro: {
  alias: {
    '@babel/parser': 'unenv/runtime/mock/empty'
  }
}
```

**Gain attendu :** ~504 Ko (tout `@babel/`)

**Risque :** Si une fonctionnalite SSR utilise `@babel/parser` a chaud, crash au runtime.

**Verification :** Creer une page Vue complexe avec des expressions template avancees et tester le rendu SSR.

---

### Option B : Exclure `@babel/*` des externals (Risque : MOYEN)

**Principe :** Forcer Nitro a ne pas copier `@babel/*` dans le dossier de sortie.

**Configuration :**
```ts
// nuxt.config.ts
nitro: {
  externals: {
    external: ['@babel/*']
  }
}
```

**Gain attendu :** ~508 Ko

**Risque :** Si les dependances ne sont pas trouvees a l'installation en production, le serveur echoue au demarrage.

---

### Option C : Activer la minification (Risque : NUL)

**Principe :** Activer `minify: true` dans Nitro pour compresser le bundle.

**Configuration :**
```ts
// nuxt.config.ts
nitro: {
  minify: true
}
```

**Gain attendu :** ~10-15% sur `chunks/` (environ 100-150 Ko)

**Risque :** Aucun. La minification est securisee et recommandee.

---

### Option D : Ne rien faire (Risque : NUL)

**Principe :** Accepter 2.9 Mo comme taille normale pour une app Nuxt 3 SSR.

**Justification :** 2.9 Mo est dans la moyenne basse pour une app Nuxt 3. La plupart des apps similaires font 3-5 Mo.

---

## 4. Comparatif

| Option | Gain | Risque | Effort | Action requise |
|--------|------|--------|--------|----------------|
| **A** — Shim `@babel/parser` | ~504 Ko (17%) | Faible | 15min | Modifier `nuxt.config.ts` |
| **B** — Exclure `@babel/*` | ~508 Ko (18%) | Moyen | 5min | Modifier `nuxt.config.ts` |
| **C** — Minification | ~100-150 Ko (5%) | Nul | 5min | Modifier `nuxt.config.ts` |
| **D** — Ne rien faire | 0 | Nul | 0 | Aucune |

**Taille cible avec Option A + C :** ~2.3 Mo (reduction de ~20%)

---

## 5. Recommandation

**Strategie recommandee :**

1. ✅ **Appliquer l'Option C** (minification) — aucun risque, gain garanti de ~100 Ko
2. 🔄 **Tester l'Option A** (shim `@babel/parser`) — potentiel gain de 504 Ko, a valider avec les tests e2e
3. ❌ **Eviter l'Option B** — trop risquee par rapport au gain

### Plan de test pour l'Option A

1. Ajouter `nitro.alias` avec `@babel/parser` → `unenv/runtime/mock/empty`
2. Lancer `npm run build` (verifier que le build ne casse pas)
3. Lancer `npm run typecheck` (verifier qu'aucun type ne depend de `@babel/parser`)
4. Lancer `npm test` (553 tests unitaires)
5. Lancer `npm run dev` et naviguer sur toutes les pages (test manuel du SSR)
6. Mesurer la taille finale du bundle serveur
7. Si tout passe : deployer. Si une page SSR echoue : revert.

---

## 6. Conclusion

`@babel/parser` (504 Ko) est le plus gros contributeur du bundle serveur apres `@vue/*`. Il est tres probablement du code mort dans le contexte SSR de Nuxt 3, car les templates sont pre-compiles en build.

**La reduction potentielle maximale est de ~20%** (de 2.9 Mo a ~2.3 Mo) en combinant minification + shim de `@babel/parser`.

L'effort d'investigation et d'application est faible (~1h), ce qui rend l'OB-03 rentable meme pour un gain modeste.
