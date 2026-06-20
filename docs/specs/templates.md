# Catalogue des templates — Minautor Prompt Service

**Date :** 2026-06-20
**Version taxonomie :** v3 (10 piliers, scission `optimization` → `refactoring` + `performance`)
**Version identités :** v2 (9 identités, 3 catégories)
**Objectif :** Définir exhaustivement les templates à produire pour que **chaque combinaison Identité × Sous-catégorie affiche au moins 1 résultat**, sans cascade « Aucun template ».

---

## 1. Architecture du catalogue

### Cascade UI
```
Identité (9)  →  Sous-catégorie (label par identité, id partagé)  →  Templates (template.category === sousCategorie.id)
```

### Règles de mapping (figées depuis v3)
1. **`subcategory.id` ∈ {TemplateCategory union v3}** : `general | technical | architecture | refactoring | quality | security | documentation | devops | management | performance`.
2. **`template.category === subcategory.id`** : convention clé-valeur, pas de table de mapping explicite.
3. **`template.identities[]`** : portée d'affichage (warning visuel séparé dans `/prompts`), pas un filtre dur.
4. **Plusieurs identités peuvent partager un même template** si elles partagent la sous-catégorie au sens runtime (ex. `tpl-db-profiling` pour `Superviseur` couvre `Superviseur` runtimeProfile + `Architecte`/`DevOps`/`TesteurQA` qui mappent sur `Superviseur`).
5. **Couverture minimale** : 1 template par couple unique `(template.category, sous-catégorie effective identité)`. Si plusieurs identités partagent la même sous-catégorie avec le même `id`, 1 seul template suffit pour toutes.

---

## 2. Matrice de couverture Identité × Sous-catégorie

### Légende
- ✅ = au moins 1 template disponible
- ⚠️ = couvert par un template transverse mais moins naturel
- ❌ = aucun template (état actuel à combler)

### Matrice (9 identités × sous-catégories)

| Identité | Sous-catégorie (id → label) | category backend | État | Template(s) |
|---|---|---|---|---|
| **User** | `technical` → Implementation | technical | ✅ | `tpl-code-review` |
| User | `refactoring` → Refactoring local | refactoring | ✅ | `tpl-quick-refactor` |
| User | `documentation` → Documentation | documentation | ✅ | `tpl-doc-generation` |
| **Superviseur** | `technical` → Revue technique | technical | ✅ | `tpl-code-review` |
| Superviseur | `quality` → Investigation de bugs | quality | ✅ | `tpl-bug-investigation` |
| Superviseur | `refactoring` → Dette technique | refactoring | ⚠️ | `tpl-quick-refactor` (manque angle « moyenne échelle ») |
| Superviseur | `performance` → Performance & observabilité | performance | ✅ | `tpl-db-profiling` |
| Superviseur | `security` → Revue de sécurité | security | ✅ | `tpl-security-audit` |
| **Responsable** | `management` → Cadrage | management | ✅ | `tpl-spec-writing` |
| Responsable | `quality` → Assurance qualité | quality | ❌ | **MANQUE** (`tpl-validation-checklist` proposé) |
| Responsable | `documentation` → Communication | documentation | ✅ | `tpl-doc-generation` |
| Responsable | `architecture` → Vision système | architecture | ✅ | `tpl-architecture-design` |
| **Architecte** | `architecture` → Conception & Design | architecture | ✅ | `tpl-architecture-design` |
| Architecte | `refactoring` → Dette technique structurelle | refactoring | ❌ | **MANQUE** (`tpl-microservice-split` ou `tpl-large-refactor`) |
| Architecte | `security` → Sécurité by design | security | ⚠️ | `tpl-security-audit` (manque angle architecture) |
| Architecte | `documentation` → ADR & Référentiel | documentation | ❌ | **MANQUE** (`tpl-decision-record`) |
| **Developpeur** | `technical` → Génération de code | technical | ❌ | **MANQUE** (`tpl-code-generate`) |
| Developpeur | `refactoring` → Clean code local | refactoring | ✅ | `tpl-quick-refactor` |
| Developpeur | `quality` → Tests & TDD | quality | ❌ | **MANQUE** (`tpl-test-generate`) |
| Developpeur | `documentation` → JSDoc & README | documentation | ⚠️ | `tpl-doc-generation` (manque angle JSDoc) |
| **TesteurQA** | `quality` → Stratégie de test | quality | ❌ | **MANQUE** (`tpl-test-strategy`) |
| TesteurQA | `technical` → Tests automatisés | technical | ❌ | **MANQUE** (`tpl-test-script`) |
| TesteurQA | `documentation` → Rapports de bugs | documentation | ❌ | **MANQUE** (`tpl-bug-report`) |
| TesteurQA | `management` → Métriques qualité | management | ❌ | **MANQUE** (`tpl-qa-metrics`) |
| **DevOps** | `devops` → Pipelines CI/CD | devops | ✅ | `tpl-ci-pipeline` |
| DevOps | `security` → SecOps | security | ✅ | `tpl-security-audit` |
| DevOps | `performance` → Optimisation perf cloud | performance | ⚠️ | `tpl-db-profiling` (côté DB, manque côté cloud/app) |
| DevOps | `technical` → Scripts d'automatisation | technical | ❌ | **MANQUE** (`tpl-automation-script` + `tpl-iac-script`) |
| **ChefProjet** | `management` → Planning & Cadrage | management | ✅ | `tpl-spec-writing` |
| ChefProjet | `quality` → Recette | quality | ❌ | **MANQUE** (`tpl-recipe-recette`) |
| ChefProjet | `documentation` → Bilans & Comptes-rendus | documentation | ⚠️ | `tpl-doc-generation` (manque angle CR de sprint) |
| **ProductOwner** | `management` → Backlog & User Stories | management | ❌ | **MANQUE** (`tpl-user-story`) |
| ProductOwner | `quality` → Critères d'acceptation | quality | ❌ | **MANQUE** (`tpl-acceptance-criteria`) |
| ProductOwner | `documentation` → Release notes | documentation | ❌ | **MANQUE** (`tpl-release-notes`) |

**Bilan :** 9 ✅ + 6 ⚠️ (couverts transversalement) + **18 ❌** à combler pour atteindre une couverture pleine.

---

## 3. Templates existants (9 — figés dans `runtime/templates.seed.json`)

| ID | category | identities | Vocation |
|---|---|---|---|
| `tpl-code-review` | technical | User / Superviseur / Responsable | Revue de code structurée multi-focus |
| `tpl-bug-investigation` | quality | Superviseur / Responsable | Analyse de cause racine + correctifs |
| `tpl-spec-writing` | management | Responsable | Spécification fonctionnelle ou technique |
| `tpl-quick-refactor` | refactoring | User / Superviseur | Refactor incrémental local |
| `tpl-architecture-design` | architecture | Superviseur / Responsable | Conception d'architecture haut niveau |
| `tpl-security-audit` | security | Superviseur / Responsable | Audit de vulnérabilités + threat modeling |
| `tpl-doc-generation` | documentation | User / Superviseur / Responsable | Documentation technique ou utilisateur |
| `tpl-ci-pipeline` | devops | Superviseur | Pipeline d'intégration et déploiement |
| `tpl-db-profiling` | performance | Superviseur | Diagnostic de requêtes DB lentes |

---

## 4. Templates à créer — Spécifications unitaires

Chaque nouvelle entrée respecte le format existant : `id`, `name`, `description`, `category`, `identities[]`, `template`, `variables[]`, `constraints[]`, `version`, `isPublic`, `author`, `createdAt`, `updatedAt`, `usageCount`.

### 4.1 Pilier `general` (1 template)

#### `tpl-general-assist` — Assistance généraliste
- **category** : `general`
- **identities** : `["User", "Superviseur", "Responsable"]` (fallback universel)
- **description** : Réponse polyvalente pour demandes hors-scope couvert par les piliers spécialisés.
- **variables** : `task` (required, string) ; `context` (optional, default="").
- **template** : `En tant qu'assistant polyvalent, traite la demande suivante : {{task}}. Contexte additionnel : {{context}}. Structure ta réponse en : compréhension, étapes, livrables.`

### 4.2 Pilier `technical` (4 nouveaux templates)

#### `tpl-code-generate` — Génération de code
- **category** : `technical`
- **identities** : `["User", "Superviseur", "Responsable"]`
- **description** : Génère un extrait de code (fonction, classe, module) à partir d'une spécification concise.
- **variables** : `language` (required, avec exemples : TypeScript / Python / Go) ; `spec` (required, spécification fonctionnelle) ; `style` (optional, default="conventions projet").
- **template** : `Génère du code en {{language}} pour la spécification : {{spec}}. Respecte le style {{style}}. Inclus : signature, corps, gestion d'erreurs, et un test unitaire d'exemple.`

#### `tpl-code-explain` — Explication de code
- **category** : `technical`
- **identities** : `["User", "Superviseur", "Responsable"]`
- **description** : Explique un extrait de code en français clair avec sections (but, flux, complexité, points d'attention).
- **variables** : `code` (required, extrait de code) ; `audience_level` (optional, default="intermédiaire", valeurs : débutant / intermédiaire / expert).
- **template** : `Explique le code suivant : {{code}}. Niveau d'audience : {{audience_level}}. Structure : (1) objectif, (2) flux d'exécution, (3) complexité et points d'attention, (4) exemples d'usage.`

#### `tpl-test-script` — Script de test E2E / API
- **category** : `technical`
- **identities** : `["Superviseur", "Responsable"]` (TesteurQA couverte via runtimeProfile Superviseur)
- **description** : Écrit un script de test automatisé (Playwright, Postman, supertest) à partir d'un scénario.
- **variables** : `framework` (required, ex : Playwright / Postman / supertest) ; `scenario` (required, scénario Gherkin/BDD) ; `target` (required, URL ou endpoint).
- **template** : `Rédige un script de test en {{framework}} pour le scénario : {{scenario}}. Cible : {{target}}. Inclus : setup, exécution, assertions explicites, teardown, et reporting d'échec lisible.`

#### `tpl-automation-script` — Script d'automatisation Bash / Python
- **category** : `technical`
- **identities** : `["Superviseur", "Responsable"]` (DevOps via runtimeProfile)
- **description** : Génère un script d'automatisation (Bash, Python, Makefile) avec gestion d'erreurs et logging.
- **variables** : `language` (required, ex : bash / python / make) ; `goal` (required, ce que le script doit faire) ; `environment` (optional, default="Linux standard").
- **template** : `Écris un script {{language}} qui : {{goal}}. Cible l'environnement : {{environment}}. Inclus : garde-fous de sécurité (set -e, validation d'entrées), logging structuré, mode dry-run, et exemples d'invocation.`

### 4.3 Pilier `management` (5 nouveaux templates)

#### `tpl-user-story` — User Story Gherkin
- **category** : `management`
- **identities** : `["Responsable"]`
- **description** : Formate une User Story BDD avec epics, scénarios Given-When-Then.
- **variables** : `actor` (required, persona) ; `feature` (required, fonctionnalité) ; `benefit` (required, valeur métier).
- **template** : `Rédige une User Story pour : en tant que {{actor}}, je veux {{feature}} afin de {{benefit}}. Inclus : 3 scénarios Gherkin (nominal, erreur, bord), dépendances et critères d'investigation prêt.`

#### `tpl-acceptance-criteria` — Critères d'acceptation
- **category** : `management`
- **identities** : `["Responsable"]`
- **description** : Définit les critères d'acceptation Given/When/Then mesurables et testables.
- **variables** : `story_id` (required, identifiant US) ; `criteria_focus` (required, périmètre CA) ; `priority` (optional, default=Must).
- **template** : `Rédige les critères d'acceptation pour la story {{story_id}}, ciblant : {{criteria_focus}}. Priorité : {{priority}}. Format : Given/When/Then mesurables. Inclus : cas nominaux, cas d'erreur, SLA et definition of done.`

#### `tpl-release-notes` — Release notes orientées valeur
- **category** : `management`
- **identities** : `["Responsable"]`
- **description** : Notes de release orientées utilisateur (Highlights, Breaking, Fixes, Known Issues).
- **variables** : `version` (required) ; `audience` (optional, default="utilisateurs finaux") ; `tone` (optional, default="accessible non-technique").
- **template** : `Rédige les release notes pour la version {{version}}. Cible : {{audience}}. Ton : {{tone}}. Structure : Highlights (3 max), Changes (feature/enhancement), Breaking (migration), Fixes, Known Issues, et CTA vers la doc.`

#### `tpl-qa-metrics` — Synthèse métriques qualité
- **category** : `management`
- **identities** : `["Responsable"]` (TesteurQA via runtimeProfile)
- **description** : Synthèse exécutive des métriques qualité pour la direction (taux de défaut, couverture, MTTR).
- **variables** : `period` (required, ex : sprint N ou 2026-Q2) ; `scope` (required, périmètre produit/projet) ; `audience` (optional, default=Direction).
- **template** : `Produis la synthèse métriques qualité pour la période {{period}}. Périmètre : {{scope}}. Cible : {{audience}}. Inclus : KPI (taux de défaut, couverture de test, MTTR, escapes en prod), tendances, alertes, recommandations.`

#### `tpl-release-readiness` — Go/No-Go release
- **category** : `management`
- **identities** : `["Responsable"]` (ChefProjet via runtimeProfile)
- **description** : Décision Go/No-Go pour une release avec checklist et risques résiduels.
- **variables** : `version` (required) ; `criteria_met` (required, liste de critères) ; `residual_risks` (required, risques acceptés).
- **template** : `Prépare la décision Go/No-Go pour la release {{version}}. Critères satisfaits : {{criteria_met}}. Risques résiduels : {{residual_risks}}. Inclus : scorecard (✓/✗ par critère), mitigation des risques, recommandation argumentée.`

### 4.4 Pilier `quality` (4 nouveaux templates)

#### `tpl-test-strategy` — Plan de test exhaustif
- **category** : `quality`
- **identities** : `["Superviseur", "Responsable"]`
- **description** : Définit un plan de test (stratégie, types, couverture, critères de sortie).
- **variables** : `feature` (required) ; `risk_level` (optional, default=medium, valeurs : low / medium / high / critical) ; `timeline` (required).
- **template** : `Définis le plan de test pour : {{feature}}. Niveau de risque : {{risk_level}}. Timeline : {{timeline}}. Inclus : stratégie (unitaire / intégration / E2E / manuel), outils, matrice de couverture, critères d'entrée/sortie, gestion des défauts.`

#### `tpl-test-generate` — Génération de tests unitaires
- **category** : `quality`
- **identities** : `["User", "Superviseur"]` (Developpeur via runtimeProfile)
- **description** : Squelette de tests unitaires (table-driven, mocks, edge cases) pour une fonction/classe.
- **variables** : `code` (required, code à tester) ; `framework` (required, ex : vitest / jest / pytest) ; `coverage_target` (optional, default="80%").
- **template** : `Génère une suite de tests unitaires pour : {{code}}. Framework : {{framework}}. Couverture cible : {{coverage_target}}. Inclus : cas nominaux, edge cases (null, vide, limites), mocks de dépendances, et assertions lisibles.`

#### `tpl-validation-checklist` — Checklist de validation
- **category** : `quality`
- **identities** : `["Superviseur", "Responsable"]`
- **description** : Checklist binaire pour validation fonctionnelle avant release.
- **variables** : `deliverable` (required) ; `criteria` (required, liste de critères) ; `signoff_required` (optional, default=Responsable).
- **template** : `Définis la checklist de validation pour le livrable {{deliverable}}. Critères à vérifier : {{criteria}}. Sign-off requis : {{signoff_required}}. Format : ✓ / ✗ / N/A par critère, commentaires,Conclusion pass/fail.`

#### `tpl-recipe-recette` — Recette fonctionnelle
- **category** : `quality`
- **identities** : `["Superviseur", "Responsable"]`
- **description** : Plan de recette manuel (pas-à-pas, attendu, observé) pour validation avant livraison.
- **variables** : `feature` (required) ; `env` (required, staging / preprod / prod) ; `steps` (required, étapes utilisateurs).
- **template** : `Rédige le plan de recette pour : {{feature}}. Environnement : {{env}}. Étapes à exécuter : {{steps}}. Format par étape : action, attendu, observé, OK/KO. Inclus : scénarios de régression et critères de sortie.`

### 4.5 Pilier `refactoring` (2 nouveaux templates)

#### `tpl-method-extract` — Extraction de méthode / clean code intermédiaire
- **category** : `refactoring`
- **identities** : `["User", "Superviseur"]`
- **description** : Refactoring ciblé sur une méthode (extract / inline / rename) avec motivations et tests de non-régression.
- **variables** : `code_block` (required, bloc à retravailler) ; `refactoring_goal` (required, ex : extract method, inline, rename) ; `constraints` (optional, default="conserver l'API publique").
- **template** : `Refactore le bloc : {{code_block}}. Objectif : {{refactoring_goal}}. Contraintes : {{constraints}}. Livre : (1) motivation, (2) version refactorée, (3) diff conceptuel, (4) tests de non-régression à ajouter.`

#### `tpl-large-refactor` — Refactoring structurel à grande échelle
- **category** : `refactoring**
- **identities** : `["Superviseur"]`
- **description** : Plan de refactoring structurel (décomposition de module, migration API, dette accumulée).
- **variables** : `scope` (required, périmètre) ; `motivation` (required, dette / performance / modularité) ; `risk_tolerance` (optional, default=medium).
- **template** : `Plan de refactoring structurel pour : {{scope}}. Motivation : {{motivation}}. Tolérance au risque : {{risk_tolerance}}. Inclus : (1) analyse de l'existant, (2) stratégie incrémentale (étapes avec go/no-go), (3) tests de régression, (4) critères de succès mesurables.`

### 4.6 Pilier `architecture` (2 nouveaux templates)

#### `tpl-decision-record` — Architecture Decision Record (ADR)
- **category** : `architecture`
- **identities** : `["Superviseur", "Responsable"]`
- **description** : Génère un ADR MADR (titre, statut, contexte, décision, conséquences).
- **variables** : `title` (required) ; `status` (optional, default=proposed, valeurs : proposed / accepted / deprecated / superseded) ; `context` (required) ; `decision` (required).
- **template** : `Rédige un ADR au format MADR pour : {{title}}. Statut : {{status}}. Contexte : {{context}}. Décision : {{decision}}. Inclus : options considérées, conséquences positives/négatives, et références croisées.`

#### `tpl-microservice-split` — Décomposition microservices / modularisation
- **domain** : architecture
- **identities** : `["Superviseur"]`
- **description** : Identifie les bounded contexts et propose un découpage en services/modules autonomes.
- **variables** : `current_monolith` (required, description de l'existant) ; `drivers` (required, motivations : scalabilité, équipes, déploiements) ; `constraints` (optional, default="équipes co-localisées").
- **template** : `Propose le découpage en services/modules pour : {{current_monolith}}. Drivers : {{drivers}}. Contraintes : {{constraints}}. Inclus : (1) bounded contexts candidats, (2) contrats d'interface (API/events), (3) data ownership, (4) impacts organisationnels et migration incrémentale.`

### 4.7 Pilier `security` (2 nouveaux templates)

#### `tpl-secure-code-review` — Revue sécurité checklist OWASP
- **category** : `security`
- **identities** : `["Superviseur", "Responsable"]`
- **description** : Revue ciblée OWASP Top 10 + CWE avec checklist de patterns vulnérables.
- **variables** : `code` (required) ; `owasp_focus` (optional, default="top10", valeurs : top10 / asvs / sam) ; `language` (required).
- **template** : `Effectue une revue sécurité du code : {{code}}. Focus OWASP : {{owasp_focus}}. Langage : {{language}}. Inclus pour chaque risque : (1) pattern détecté (avec ligne), (2) sévérité CVSS, (3) correctif exemple, (4) référence CWE.`

#### `tpl-threat-model` — Threat modeling from scratch
- **category** : `security`
- **identities** : `["Superviseur"]`
- **description** : Threat model STRIDE d'un système from scratch (acteurs, flux, trust boundaries, menaces).
- **variables** : `system` (required, périmètre) ; `data_sensitivity` (required, PII / financier / public) ; `method` (optional, default=STRIDE).
- **template** : `Produit le threat model pour : {{system}}. Sensibilité données : {{data_sensitivity}}. Méthode : {{method}}. Inclus : diagramme de flux, trust boundaries, acteurs, menaces par catégorie, scoring, et contre-mesures priorisées.`

### 4.8 Pilier `documentation` (5 nouveaux templates)

#### `tpl-jsdoc` — Documentation JSDoc structurée
- **category** : `documentation`
- **identities** : `["User", "Superviseur"]`
- **description** : Squelette JSDoc complet pour une méthode/classe avec @param, @returns, @throws, @example.
- **variables** : `code` (required) ; `style` (optional, default="standard", valeurs : standard / typedoc / custom) ; `include_examples` (optional, default=true).
- **template** : `Génère la documentation JSDoc pour : {{code}}. Style : {{style}}. Exemples : {{include_examples}}. Inclus : @param typés, @returns, @throws pour exceptions attendues, @example exécutable, et résumé clair en première ligne.`

#### `tpl-adr` — (voir `tpl-decision-record`, doublon ADR)
> Note : `tpl-decision-record` du pilier architecture couvre déjà ce besoin — ne pas dupliquer.

#### `tpl-bug-report` — Rapport de bug structuré
- **category** : `documentation**
- **identities** : `["User", "Superviseur"]`
- **description** : Ticket de bug structuré (repro, environnement, expected/actual, logs, sévérité).
- **variables** : `title` (required) ; `severity` (optional, default=medium) ; `repro_steps` (required) ; `environment` (required).
- **template** : `Rédige le rapport de bug : {{title}}. Sévérité : {{severity}}. Repro : {{repro_steps}}. Environnement : {{environment}}. Inclus : expected vs actual, logs pertinents, screenshots, et impact utilisateur.`

#### `tpl-cr-sprint` — Compte-rendu de sprint
- **category** : `documentation`
- **identities** : `["Responsable", "Superviseur"]`
- **description** : CR de sprint avec sections Done / In progress / Blockers / Métriques / Décisions.
- **variables** : `sprint_id` (required) ; `deliverables_done` (required) ; `blockers` (required) ; `highlights` (optional).
- **template** : `Rédige le compte-rendu du sprint {{sprint_id}}. Livrables Done : {{deliverables_done}}. Blockers : {{blockers}}. Highlights : {{highlights}}. Structure : (1) résumé exécutif, (2) Done / In progress / Carry-over, (3) métriques (vélocité, qualité), (4) décisions prises, (5) plan du sprint suivant.`

#### `tpl-changelog-entry` — Entrée de changelog
- **category** : `documentation`
- **identities** : `["Responsable"]`
- **description** : Entrée de changelog catégorisée (Added/Changed/Fixed/Removed/Deprecated) suivant Keep a Changelog.
- **variables** : `version` (required) ; `entries` (required, liste de changements) ; `format` (optional, default=keep-a-changelog).
- **template** : `Rédige l'entrée de changelog pour la version {{version}}. Changements : {{entries}}. Format : {{format}}. Catégorise en Added / Changed / Fixed / Removed / Deprecated / Security. Inclus : liens vers issues et migration guides.`

### 4.9 Pilier `devops` (2 nouveaux templates)

#### `tpl-iac-script` — Script Infrastructure-as-Code (Terraform / Ansible)
- **category** : `devops`
- **identities** : `["Superviseur"]` (DevOps via runtimeProfile)
- **description** : Module IaC (Terraform / Ansible / Pulumi) structuré pour provisionner une ressource.
- **variables** : `tool` (required, terraform / ansible / pulumi) ; `resource` (required, ex : S3 bucket, EC2, k8s deployment) ; `requirements` (required).
- **template** : `Rédige un module IaC en {{tool}} pour provisionner : {{resource}}. Spécifications : {{requirements}}. Inclus : variables typées,_outputs documentés, état remote, et un test d'exemple (ex : terraform plan / kitchen-ci).`

#### `tpl-deploy-runbook` — Runbook de déploiement
- **category** : `devops`
- **identities** : `["Superviseur"]`
- **description** : Runbook pas-à-pas pour déploiement (pre-flight, deploy, post-verifications, rollback).
- **variables** : `service` (required) ; `environment` (required) ; `strategy` (required, blue-green / canary / rolling).
- **template** : `Rédige le runbook de déploiement pour : {{service}}. Environnement : {{environment}}. Stratégie : {{strategy}}. Sections : (1) pre-flight checklist, (2) étapes de déploiement, (3) vérifications post-déploiement (smoke tests, health checks), (4) procédure de rollback documentée.`

### 4.10 Pilier `performance` (2 nouveaux templates)

#### `tpl-js-perf` — Profilage frontend / JavaScript
- **category** : `performance`
- **identities** : `["Superviseur", "Responsable"]`
- **description** : Diagnostic de performance JS/frontend (long tasks, re-renders, bundle size, Core Web Vitals).
- **variables** : `target` (required, page ou composant) ; `metric` (optional, default=LCP, valeurs : LCP / FID / CLS / TTI / bundle-size) ; `budget` (optional, default="2s LCP").
- **template** : `Diagnostique la performance de : {{target}}. Métrique cible : {{metric}}. Budget : {{budget}}. Inclus : (1) profilage (DevTools / Lighthouse / WebPageTest), (2) goulets d'etranglement identifiés, (3) optimisations concrètes (lazy-load, memo, splitting, prefetch), (4) tests de régression de perf.`

#### `tpl-cloud-cost` — Optimisation coûts cloud
- **category** : `performance`
- **identities** : `["Superviseur"]` (DevOps via runtimeProfile)
- **description** : Audit coûts cloud (instances, storage, data transfer) avec plan d'optimisation.
- **variables** : `provider` (required, AWS / GCP / Azure) ; `scope` (required, comptes ou services concernés) ; `period` (required, période d'analyse).
- **template** : `Audite les coûts cloud pour : provider {{provider}}, scope {{scope}}, période {{period}}. Inclus : (1) top 5 contributeurs de coût, (2) ressources sous-utilisées (CPU/mémoire <20 %), (3) opportunités de Reserved Instances / Savings Plans, (4) data transfer optimization, (5)行动计划 priorisé avec gain estimé.`

---

## 5. Récapitulatif des nouveaux templates

| Pilier | Nouveaux templates | Identifiants proposés |
|---|---|---|
| `general` | 1 | `tpl-general-assist` |
| `technical` | 4 | `tpl-code-generate`, `tpl-code-explain`, `tpl-test-script`, `tpl-automation-script` |
| `management` | 5 | `tpl-user-story`, `tpl-acceptance-criteria`, `tpl-release-notes`, `tpl-qa-metrics`, `tpl-release-readiness` |
| `quality` | 4 | `tpl-test-strategy`, `tpl-test-generate`, `tpl-validation-checklist`, `tpl-recipe-recette` |
| `refactoring` | 2 | `tpl-method-extract`, `tpl-large-refactor` |
| `architecture` | 2 | `tpl-decision-record`, `tpl-microservice-split` |
| `security` | 2 | `tpl-secure-code-review`, `tpl-threat-model` |
| `documentation` | 4 (hors doublon `tpl-adr`/`tpl-decision-record`) | `tpl-jsdoc`, `tpl-bug-report`, `tpl-cr-sprint`, `tpl-changelog-entry` |
| `devops` | 2 | `tpl-iac-script`, `tpl-deploy-runbook` |
| `performance` | 2 | `tpl-js-perf`, `tpl-cloud-cost` |
| **TOTAL** | **28 nouveaux templates** | (cible : 28 + 9 existants = **37 templates**) |

> Note : `tpl-decision-record` (architecture) et `tpl-adr` (documentation) ont été dédupliqués dans le décompte final. Le `tpl-changelog-entry` remplace `tpl-adr` côté documentation.

---

## 6. Critères qualité pour chaque nouveau template

Chaque template créé doit :

1. **Respecter la convention d'identifiant** : `tpl-{kebab-case}` (ex. `tpl-code-explain`).
2. **Avoir un `category` valide** : valeur unique dans le `TemplateCategory` union v3 (10 littéraux).
3. **Avoir au moins 1 identité** dans `identities[]` parmi les 9 de `identities.json` v2.
4. **Avoir un `template` body** contenant toutes les variables entre `{{...}}`.
5. **Avoir des `variables` typées** avec au minimum : `name`, `type` (string | number | boolean), `required`, `description`.
6. **Avoir des `constraints` valides** (typé `Template['constraints']`, souvent `[]`).
7. **Être ASCII-safe** : pas de caractères accentués (le projet stocke en JSON UTF-8 mais les seeds historiques utilisent ASCII pour portabilité).
8. **Avoir des timestamps ISO 8601** (`2026-06-20T...Z`) cohérents avec la dernière version de seed (`metadata.version` bumpée à 2).
9. **Couvrir au moins 1 combo Identité × Sous-catégorie** actuellement non couvert (❌) ou faiblement couvert (⚠️).
10. **Body du `template` clair** : 2-6 phrases structurées, pas une seule phrase bateau.

---

## 7. Roadmap de production en 4 sprints

L'objectif est de produire **28 nouveaux templates** en 4 sprints, par ordre de criticité (les plus demandés d'abord).

### Sprint T1 — Fondations de qualité & code (6 templates) 🔴 Critique
**Bénéfice :** débloque Developpeur, TesteurQA, DevOps (scripts) et comble les ⚠️ majeurs.
- `tpl-code-generate` (technical, Developpeur)
- `tpl-code-explain` (technical, User/Superviseur — Universal)
- `tpl-test-generate` (quality, Developpeur)
- `tpl-test-strategy` (quality, TesteurQA)
- `tpl-test-script` (technical, TesteurQA)
- `tpl-method-extract` (refactoring, Superviseur)

### Sprint T2 — Pilotage projet & QA (7 templates) 🟠 Haute
**Bénéfice :** débloque ProductOwner, ChefProjet recette, Responsable quality.
- `tpl-user-story` (management, ProductOwner)
- `tpl-acceptance-criteria` (quality, ProductOwner)
- `tpl-release-notes` (documentation, ProductOwner)
- `tpl-qa-metrics` (management, TesteurQA)
- `tpl-recipe-recette` (quality, ChefProjet)
- `tpl-validation-checklist` (quality, Responsable)
- `tpl-release-readiness` (management, ChefProjet)

### Sprint T3 — Architecture & Sécurité (6 templates) 🟡 Moyenne
**Bénéfice :** débloque Architecte et renforce sécurité.
- `tpl-decision-record` (architecture, Architecte)
- `tpl-microservice-split` (architecture, Architecte)
- `tpl-large-refactor` (refactoring, Architecte)
- `tpl-threat-model` (security, Architecte)
- `tpl-secure-code-review` (security, Superviseur)
- `tpl-jsdoc` (documentation, Developpeur)

### Sprint T4 — DevOps, perf & divers (9 templates) 🟢 Basse
**Bénéfice :** étoffe DevOps, documentation transverse, général.
- `tpl-automation-script` (technical, DevOps)
- `tpl-iac-script` (devops, DevOps)
- `tpl-deploy-runbook` (devops, DevOps)
- `tpl-js-perf` (performance, DevOps/Superviseur)
- `tpl-cloud-cost` (performance, DevOps)
- `tpl-bug-report` (documentation, TesteurQA)
- `tpl-cr-sprint` (documentation, ChefProjet)
- `tpl-changelog-entry` (documentation, Responsable)
- `tpl-general-assist` (general, tous)

### Effort estimé
| Sprint | Effort | Templates ajoutés |
|---|---|---|
| T1 | 1h-1h30 | 6 |
| T2 | 1h30-2h | 7 |
| T3 | 1h-1h30 | 6 |
| T4 | 1h30-2h | 9 |
| **TOTAL** | **5h-6h30** | **28** |

---

## 8. Validation post-génération

Après chaque sprint, vérifier :

1. **Taxonomie** : `npm run typecheck` → 0 erreur (unions étendus si nouvelles catégories, ce qui n'est pas le cas ici).
2. **Cohérence** : `npm test` → tous les tests existants passent.
3. **Couverture UI** : chaque combo (Identité, Sous-catégorie) affiche au moins 1 template dans `/prompts`.
4. **`extractRequiredCapabilities`** dans `src/services/prompt-generator.ts` : chaque nouveau `category` (déjà couvert par les 10 piliers actuels) a son `case` dans le switch.
5. **`VALID_CATEGORIES`** dans `server/api/templates.post.ts` et les 2 arrays hardcodés dans `src/services/template-library.ts` : aucune divergence.
6. **`test/models/template.test.ts`** : assertion sur le message d'erreur reste alignée (pas de nouveau littéral).
7. **`runtime/templates.seed.json` metadata** : bump `version` à 2 et `lastUpdated`.

---

## 9. Hors-périmètre (volontairement)

- Templates privés / non-`isPublic` : restent à 0 dans le seed public.
- Templates générés dynamiquement par l'utilisateur : fournis par `pages/templates.vue` éditeur.
- Templates > 10 catégories : extension future, hors-scope v3.

---

## 10. Références

- `config/identity-subcategories.json` (taxonomie sous-catégories v3)
- `config/identities.json` (catalogue identités v2)
- `runtime/templates.seed.json` (seed existant, 9 templates)
- `src/models/template.ts` (`TemplateCategory` union v3)
- `src/services/prompt-generator.ts` (`extractRequiredCapabilities`)
- `server/api/templates.post.ts` (`VALID_CATEGORIES`)
- `docs/specs/spec-sidebar-workflow-20-06-2026-10h17.md` (spec UI sidebar)
