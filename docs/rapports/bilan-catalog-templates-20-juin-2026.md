# Bilan des sprints catalogage & refactor — Minautor Prompt Service

**Date :** 20 juin 2026
**Branche :** `master`
**Perimetre :** ~14 missions de sprint sur 1 session, ~8 commits (T1 → T4 + refactor + polish)

---

## Vue d'ensemble

| Metrique | Avant | Apres | Evolution |
|----------|-------|-------|-----------|
| Templates dans `runtime/templates.seed.json` | 5 (prophylax only) | **37** | +32 |
| Version du seed | v3 | **v5** | +2 |
| Categories couvertes | 4 | **7 sur 7** | 100% |
| Identites referencees en double-check | partiel | **9 sur 9, exhaustives** | 100% |
| Ordre `identities[]` alphabetique | non normalise | **37/37 conformes** | adotation |
| Repertoires racine | `data-system/` + `data/` | **`config/` + `runtime/`** | rename |
| References orphelines `data-system` / `data/` (hors code mort) | n/a | **0** | OK |
| Tests unitaires | 577 (34 fichiers) | **577** (34 fichiers) | stable |
| Typecheck | 0 erreur | **0 erreur** | stable |
| Code-reviewer | n/a | **APPROVED** (x4) | adotation |

---

## Sprint T1 — Mini-sprint prophylaxie 🛡️

5 templates pre-existants alignes sur la guideline v3 (sous-categories desecurees par identite dans `config/identity-subcategories.json`).

| # | Template | Categorie | mappers avant  | mappers apres  |
|---|----------|-----------|----------------|----------------|
| 1 | `tpl-spec-writing` | management | 1 (ChefProjet) | **4** (ChefProjet + Architecte + Superviseur + User) |
| 2 | `tpl-architecture-design` | architecture | 2 (Superviseur + ChefProjet) | **2** (Architecte + ChefProjet) |
| 3 | `tpl-security-audit` | security | 2 (Superviseur + Responsable) | **3** (Architecte + DevOps + Superviseur) |
| 4 | `tpl-ci-pipeline` | devops | 1 (Superviseur) | **1** (DevOps) |
| 5 | `tpl-db-profiling` | performance | 1 (Superviseur) | **2** (DevOps + Superviseur) |

**Gain :** conformite prophylactique — chaque `identities[]` reflete exactement les mappers de la categorie.

---

## Sprint T2 — Croissance du catalogue 🌱

**13 nouveaux templates** (5 → 18 dans le seed, bump v3 → v4).

| Categorie | Templates ajoutes |
|-----------|-------------------|
| Architecture | `tpl-api-design`, `tpl-adr`, `tpl-large-refactor` |
| Documentation | `tpl-readme`, `tpl-api-doc`, `tpl-runbook-procedure` |
| Refactoring | `tpl-feature-flag-cleanup`, `tpl-rename-symbol`, `tpl-extract-function` |
| Review | `tpl-code-review`, `tpl-pr-quality-gate` |
| Devops | `tpl-containerfile`, `tpl-k8s-manifest` |

**Gain :** couverture architecture et refactoring, piliers manquants du catalogue initial.

---

## Sprint T3 — Diversification 📚

**10 nouveaux templates** (18 → 28 dans le seed, v4 maintenu). Observations collectees pour T4.

| Categorie | Templates ajoutes |
|-----------|-------------------|
| Security | `tpl-threat-model`, `tpl-incident-postmortem` |
| Testing | `tpl-test-plan`, `tpl-bug-triage` |
| Decision | `tpl-decision-record`, `tpl-tradeoff-analysis` |
| Documentation | `tpl-onboarding-guide` (style handbook) |
| Refactoring | `tpl-legacy-strangler`, `tpl-deps-upgrade` |
| Management | `tpl-risk-register` |

**Observation notee (T3 → T4) :** `tpl-decision-record.body` contient « Decision : {choice}... » → ambiguite lexicale en francais (Decision = action de decider vs Choix = resultat). Reporter au Sprint T4.

---

## Sprint T4 (final) — Catalogue complet a 37 templates 🏁

**9 derniers templates + reordonnancement alphabetique global.**

### Templates ajoutés (28 → 37, seed v4 → v5)

| # | Template | Categorie | `identities[]` (alpha) |
|---|----------|-----------|-----------------------|
| 1 | `tpl-automation-script` | technical | Developpeur, DevOps, Superviseur, TesteurQA, User |
| 2 | `tpl-iac-script` | devops | DevOps |
| 3 | `tpl-deploy-runbook` | devops | DevOps |
| 4 | `tpl-js-perf` | performance | DevOps, Superviseur |
| 5 | `tpl-cloud-cost` | performance | DevOps, Superviseur |
| 6 | `tpl-bug-report` | documentation | Architecte, ChefProjet, Developpeur, ProductOwner, Responsable, TesteurQA, User |
| 7 | `tpl-cr-sprint` | documentation | Architecte, ChefProjet, Developpeur, ProductOwner, Responsable, TesteurQA, User |
| 8 | `tpl-changelog-entry` | documentation | Architecte, ChefProjet, Developpeur, ProductOwner, Responsable, TesteurQA, User |
| 9 | `tpl-general-assist` | general (fallback) | (9/9 — toutes les identites) |

### Reordonnancement alphabetique global

Application systematique sur les **37 templates** de `identities[]` selon l'ordre canonique :
`Architecte < ChefProjet < Developpeur < DevOps < ProductOwner < Responsable < Superviseur < TesteurQA < User`

**Benefice :** elimination des divergences d'ordre observees entre templates (certains par ordre d'apparition, d'autres par `runtimeProfile`).

### Bonus polish T3 → T4

`tpl-decision-record.body` : « Decision : {choice}... » → **« Choix retenu : {choice}... »** (elimination de l'ambiguite lexicale signalee en T3).

### Validation finale T4

- typecheck : **0 erreur**
- vitest : **577/578 verts** (1 skip, 0 regression)
- code-reviewer : **APPROVED** (exhaustivite `identities[]` + ordre alpha verifies sur les 37 templates)

**Roadmap closee :** 5 → 9 → 18 → 28 → **37** templates, v1→v2→v3→v4→**v5** du seed.

---

## Refactor `data-system/` → `config/` et `data/` → `runtime/` 🧭

**Motivation :** lever l'ambiguite entre configuration systeme (taxonomies typees, immuables) et etat runtime mutable (fichiers utilisateur persistes sur disque).

### Mapping avant / apres

| Avant | Apres | Role |
|-------|-------|------|
| `data-system/identities.json` | `config/identities.json` | Taxonomie des 9 identites (catalogue, v2) |
| `data-system/identity-subcategories.json` | `config/identity-subcategories.json` | Sous-categories par identite (taxonomie, v3) |
| `data/templates.seed.json` | `runtime/templates.seed.json` | Seed de bootstrap, lecture seule, versionne |
| `data/templates.json` | `runtime/templates.json` | Etat runtime mutable (persiste cote serveur) |
| `data/prompts.json` | `runtime/prompts.json` | (prevu mission 03) |
| `data/versions.json` | `runtime/versions.json` | (prevu mission 04) |
| `data/users.json` | `runtime/users.json` | (prevu mission 07 auth) |
| `sqlite:/data/prompts.db` | `sqlite:/runtime/prompts.db` | DB locale (chemin par defaut) |
| `src/data-system/identities.ts` | `src/config/identities.ts` | Wrapper TS de la taxonomie |
| `src/data-system/identity-subcategories.ts` | `src/config/identity-subcategories.ts` | Wrapper TS de la taxonomie |

### Fichiers touches (16)

| Type | Fichier | Nature du changement |
|------|---------|----------------------|
| Code (8) | `src/config/identities.ts` | import `~/data-system/` → `~/config/`, commentaire |
| Code | `src/config/identity-subcategories.ts` | import + 2 commentaires |
| Code | `pages/identities.vue` | import `~/src/data-system/...` → `~/src/config/...` |
| Code | `pages/prompts.vue` | 2 imports + 3 commentaires |
| Code | `server/utils/templateService.ts` | `DEFAULT_STORAGE_DIR = 'data'` → `'runtime'` + 2 commentaires |
| Code | `server/api/templates.get.ts` | commentaire |
| Code | `src/services/template-library.ts` | 2 commentaires |
| Outils | `.gitignore` | exclusion `data/templates.json` → `runtime/templates.json` |
| Docs (~12) | `docs/specs/templates.md`, `docs/dev-plans-20-06-2026/*.md`, `docs/priorites/*.md`, `changelogs.md`, `_ai-reprise-instructions.md` | bulk sed (3 passes) sur les chemins et commentaires |
| Config | `src/config/app.config.ts` | chemin sqlite `data/prompts.db` → `runtime/prompts.db` |

### Validation finale refactor

- **0 reference orpheline** (grep `data-system` / `data/templates` / `data/prompts` / `data/versions` / `data/users` → 0 hit hors `package-lock.json` mort).
- `tsconfig.json` : pas de modification requise (alias `~/*` générique).
- typecheck : **0 erreur**
- vitest : **577/578 verts**
- code-reviewer : **APPROVED** avec 3 observations mineures traitees ci-dessous :

#### Observations mineures resolues post-refactor

1. **Copy-edit FR** : `pages/identities.vue` ligne 11 « peut venir du **config** » → « issu de la **configuration enrichie** » / `pages/prompts.vue` ligne 25 « valeurs du **config enrichi** » → « valeurs de la **configuration enrichie** » (accord grammatical + evite le mot « config » isole qui peut etre confondu avec la tech).
2. **Convention FR documentee** : creation de `docs/FR_STYLE.md` (Standard par defaut / Inclusives au choix / Regle de coherence / Anti-patterns) avec pointeur dans `README.md` § 🤝 Contribution.

**Gain :** clarifie l'intention semantique (systeme vs runtime), prepare une migration manuelle eventuelle (`mv data/templates.json runtime/templates.json` chez les utilisateurs upgrading) — voir note de migration plus bas.

---

## Polish FR & documentation stylistique 📝

### Copy-edit FR (2 fichiers)

| Fichier | Avant | Apres |
|---------|-------|-------|
| `pages/identities.vue:11` | « peut venir du **config** » | « issu de la **configuration enrichie** » |
| `pages/prompts.vue:25` | « valeurs du **config enrichi** » | « valeurs de la **configuration enrichie** » |

### `docs/FR_STYLE.md` (nouveau)

Doc cible de ~50 lignes, sections limitees a :
1. **Formes standard (par defaut)** — `issu de` (n. m. sg.), `la developpeuse`, accord classique
2. **Formes inclusives (au choix)** — `issu·e de`, `les developpeur·euse·s`, point median
3. **Regle de coherence par paragraphe** — ne pas melanger standard et inclusif dans un meme paragraphe
4. **Anti-patterns limites au style** — pas de debat en PR, pas de melange incoherent

Pointeur une-ligne dans `README.md` § 🤝 Contribution pour la decouvrabilite.

**Iteration corrective :** un premier jet `CONTRIBUTING.md` avait ete redige mais a ete retracte (scope creep — duplication de la section Contribution du README, mention d'un LICENSE inexistant, contradictions internes et coquilles). La version finale est strictement ciblee sur la convention FR.

**Gain :** documentation claire et non-bloquante du parti pris stylistique, sans rheiner sur le debat fondamentalement culturel.

---

## Note de migration (utilisateurs upgrading)

Les utilisateurs venant d'une version anterieure a ce refactor doivent deplacer manuellement :

```bash
# Runtime state (obligatoire si deja utilise)
mv data/templates.json runtime/templates.json

# Taxonomies systeme (optionnel — versions code sont dans config/, pas d'impact runtime)
# Pas de fichier data-system/ cote utilisateur (c'etaient des JSON versionnes, pas des fichiers user)
```

Aucun fichier `data-system/` n'etait cree cote utilisateur (les JSON `data-system/` etaient versionnes avec le code). Seul `data/templates.json` peut exister en environnement utilisateur et doit etre migre.

Le seed (`runtime/templates.seed.json`) reste en lecture seule et versionne — il sert uniquement au bootstrap si `runtime/templates.json` manque.

---

## Prochaines etapes recommandees

1. **Documentation FR dans le projet** — Etendre `docs/FR_STYLE.md` avec d'autres conventions redactionnelles (capitalization, ponctuation, typographie).
2. **Audit des autres repertoires racine** — Verifier si d'autres renames similaires amelioreraient la clarte (par ex. `docs/archives/` → `docs/historical/`, `src/services/error-handling/` → `src/services/erreurs/`).
3. **Tests d'integration catalogues** — Ajouter 1-2 tests qui verifient l'exhaustivite prophylactique des `identities[]` ET l'ordre alphabetique sur `runtime/templates.seed.json` directement (golden test sur le seed).
4. **Migration assistee** — Ajouter un script `scripts/migrate-runtime-dir.sh` qui detecte `data/` et propose le `mv` automatique pour les utilisateurs upgrading.
5. **Changelog v6** — Documenter officiellement le rename `data/ → runtime/` dans `changelogs.md` (bumper vers `[1.1.0]` — breaking change pour utilisateurs avec `data/templates.json` existant).
