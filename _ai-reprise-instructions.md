# ⚠️ Instructions de reprise — À lire en premier par l'IA

**Date du fichier :** 20/06/2026 — 10h17  
**Destinataire :** Agent IA (Buffy / Codebuff)  
**Rédacteur :** Binôme humain  
**Contexte :** Reprise de session après interruption, bug critique, ou handoff.

---

## 1. Ce fichier est ta boussole

Tu viens d'être appelé sur le projet **Minautor Prompts Service**.  
Avant de faire quoi que ce soit :

1. **Lis ce fichier en entier** — il définit comment tu dois naviguer dans le projet.
2. **Ne te précipite pas** sur les fichiers `docs/` pour les suivre aveuglément.
3. **Contacte le binôme** — il peut lancer le projet, naviguer et te donner son propre diagnostic.

---

## 2. Convention de nommage des documents

**Tous les fichiers `docs/*.md` portent un timestamp dans leur nom.**

Format : `nom-fichier-JJ-MM-AAAA-HHhMM.md`

Exemples :
- `docs/priorites/priorites-dev-20-06-2026-10h17.md` → priorités du 20 juin 2026 à 10h17
- `docs/dev-plans-20-06-2026/dev-plan-mission-05-detection-agents-llm-20-06-2026-10h17.md` → plan mission 5, 20 juin 10h17
- `docs/rapports/bilan-sprints-19-06-2026.md` → bilan du 19 juin 2026 (sans heure, plus ancien)

### Pourquoi ?

Un fichier nommé `priorites-dev.md` ne permet pas de savoir s'il est récent ou obsolète sans l'ouvrir.  
Le timestamp permet d'**identifier immédiatement** le document le plus récent et de reconstituer la chronologie des décisions.

### Règle stricte

- Si tu vois `docs/priorites/priorites-dev-20-06-2026-10h17.md` et une version plus ancienne dans `docs/archives/` → **le plus récent** (10h17) est la vérité, l'autre est un historique.
- Si deux fichiers ont des timestamps différents sur le même sujet → **le plus récent prévaut**, mais vérifie auprès du binôme qu'il n'y a pas eu de rétropédalage.
- Ne JAMAIS créer un fichier `.md` de plan/doc sans timestamp dans le nom.

---

## 3. Structure des dossiers docs/

```
docs/
├── priorites/                             ← Documents de priorisation (ACTIF)
│   └── priorites-dev-20-06-2026-10h17.md  ← Les 7 missions priorisées
│
├── specs/                                 ← Spécifications et décisions (ACTIF)
│   └── spec-sidebar-workflow-20-06-2026-10h17.md  ← Ordre de navigation sidebar
│
├── audit/                                 ← Constats d'audit du 20/06/2026
│   ├── 01-projet-20-06-2026-10h17.md      ← Page Projet : ✅ réel
│   ├── 02-identites-20-06-2026-10h17.md   ← Page Identités : ❌ simulé
│   ├── 03-templates-20-06-2026-10h17.md   ← Page Templates : ❌ simulé
│   ├── 04-prompts-20-06-2026-10h17.md     ← Page Prompts : ⚠️ mixte
│   ├── 05-versions-20-06-2026-10h17.md    ← Page Versions : ❌ simulé
│   ├── 06-dashboard-20-06-2026-10h17.md   ← Page Dashboard : ⚠️ mixte
│   ├── synthese-20-06-2026-10h17.md       ← Synthèse globale de l'audit
│   ├── templatelibrary-20-06-2026-10h17.md ← Composant TemplateLibrary (approfondi)
│   └── versionhistory-20-06-2026-10h17.md ← Composant VersionHistory (approfondi)
│
├── dev-plans-20-06-2026/                  ← Plans de mission ACTUELS (7 missions)
│   ├── dev-plan-mission-01-...-10h17.md   ← Persistance templates
│   ├── dev-plan-mission-02-...-10h17.md   ← Connexion templates → générateur
│   ├── dev-plan-mission-03-...-10h17.md   ← Persistance prompts
│   ├── dev-plan-mission-04-...-10h17.md   ← Persistance versions
│   ├── dev-plan-mission-05-...-10h17.md   ← Détection agents LLM
│   ├── dev-plan-mission-06-...-10h17.md   ← Refonte stockage transverse
│   └── dev-plan-mission-07-...-10h17.md   ← Backend authentification
│
├── dev-plans/                             ← Anciens sprints (HISTORIQUE)
│   ├── dev-plan-01-15-06-2026.md
│   ├── dev-plan-02-17-06-2026.md
│   ├── dev-plan-03-18-06-2026.md
│   ├── dev-plan-04-19-06-2026.md
│   └── todo-lists/
│       ├── todo-list_01-15-06-2026.md
│       ├── todo-list_02-17-06-2026.md
│       └── ...
│
├── rapports/                              ← Rapports et bilans (historique)
│   ├── bilan-sprints-19-06-2026.md
│   ├── rapport-final-19-juin-2026.md
│   └── rapport-ob-03-19-06-2026.md
│
└── archives/                              ← Plans et specs obsolètes (historique)
    ├── nuxt-migration-plan-14-06-2026.md
    └── reprise-projet-spec-18-06-2026.md
```

---

## 4. Que faire en cas de reprise — Protocole

### Phase 1 — Diagnostic (ne rien modifier)

1. **Lis ce fichier** ← tu es en train de le faire.
2. **Liste tous les fichiers `docs/`** pour reconstituer la chronologie par timestamp.
3. **Lis `docs/priorites/priorites-dev-20-06-2026-10h17.md`** — c'est le document racine qui décrit l'ensemble des 7 missions.
4. **Lis `docs/specs/spec-sidebar-workflow-20-06-2026-10h17.md`** — la décision sur l'ordre de navigation.
5. **Lis `docs/audit/synthese-20-06-2026-10h17.md`** — la synthèse de l'audit, état des lieux de chaque page.
5. **Vérifie dans le code** ce qui est vraiment implémenté :

   - Ouvre chaque service listé dans les missions :
     - `src/services/template-library.ts`
     - `src/services/prompt-manager.ts`
     - `src/services/version-handler.ts`
     - `src/services/identity-resolver.ts`
     - `composables/usePromptSystem.ts`
     - Les pages (`pages/*.vue`)
     - Les composants (`components/*.vue`)
   
   - Cherche les `Map` en RAM (indice : `new Map<`) — si elles sont encore là, la mission n'est PAS faite.
   - Cherche les `data/*.json` — s'ils n'existent pas, la persistance n'est PAS faite.
   - Cherche les `createMockTemplate()` / `createMockContext()` — s'ils sont encore appelés, le cleanup n'est PAS fait.
   - Regarde les tests existants (`src/test/`) — sont-ils encore verts ?

6. **Exécute les tests** (`npm test`) et le typecheck (`npm run typecheck`) pour vérifier ce qui casse.

7. **Contacte le binôme** :
   > "Voici mon diagnostic : [tel fichier] est encore en RAM, [tel test] passe toujours, [telle mission] semble à moitié faite. Peux-tu confirmer ou infirmer ? Peux-tu lancer le projet et vérifier ce que tu vois dans le navigateur ?"

### Phase 2 — Validation avec le binôme

Le binôme (humain) peut :
- Lancer le projet (`npm run dev`)
- Naviguer dans chaque page et te dire ce qu'il voit
- Confirmer ou infirmer tes hypothèses
- T'aider à prioriser ce qui doit être fait

**Tu ne dois PAS décider seul de ce qui est vrai ou faux.**  
Tu donnes ton analyse, le binôme valide.

### Phase 3 — Correction / Reprise du développement

Une fois le diagnostic validé :
1. Choisir la mission à attaquer (en fonction de la priorité et de ce qui reste)
2. Ouvrir le `dev-plan-mission-X-...` correspondant
3. Suivre les tâches une par une
4. Valider chaque tâche par typecheck + tests
5. À la fin de la mission, demander au binôme de vérifier dans le navigateur

---

## 5. Principes importants

### 5.1 — "Peut-être" n'existe pas

Si tu arrives sur une reprise et que tu n'es pas certain de l'état d'une feature :
- **Tu vérifies par le code** (lecture des fichiers, pas des docs)
- **Tu vérifies par les tests** (npm test, npm run typecheck)
- **Tu demandes au binôme** (il peut lancer le projet et naviguer)
- **Tu ne supposes jamais.** Si tu n'as pas de certitude, tu t'arrêtes et tu demandes.

### 5.2 — Les docs ne sont pas la source de vérité

Les fichiers dans `docs/` sont des **intentions**, des **plans**, des **constats à un instant T**.  
Ils peuvent être :
- **Périmés** — si une décision a été prise après leur création
- **Non implémentés** — un plan n'est pas une feature livrée
- **Contradictoires** — deux docs écrits à des dates différentes peuvent dire l'inverse

**La seule source de vérité, c'est le code source et les tests.**

### 5.3 — Hiérarchie des sources

```
1. Le code source (fichiers .ts, .vue)
2. Les tests (src/test/)
3. Le retour du binôme (navigation projet, analyse visuelle)
4. Les docs/ les plus récents (par timestamp)
5. Les docs/ plus anciens (historique seulement)
```

Si le code dit A et le doc dit B → **le code a raison**.

### 5.4 — Le binôme est ton allié

Tu n'es pas seul face au projet. Le binôme :
- Connaît le projet, l'historique des décisions
- Peut lancer le projet et naviguer pour constater l'état réel
- Peut confirmer/infirmer tes hypothèses
- Peut te dire "non, on avait changé d'avis sur ça"

**N'hésite pas à le solliciter** avec des questions précises :
- "Peux-tu ouvrir la page /prompts et me dire si tu vois une liste de templates ?"
- "J'ai trouvé une Map dans le service X, est-ce que la persistance fichier a été implémentée ?"
- "Le test Y échoue, est-ce que c'est un problème connu ?"

---

## 6. Résumé des 7 missions (pour orientation rapide)

| # | Mission | Effort | Dépend de | Statut probable |
|---|---------|--------|-----------|----------------|
| 01 | Persistance templates | Faible | — | ❌ À faire |
| 02 | Connexion templates → générateur | Moyen | Mission 01 | ❌ À faire |
| 03 | Persistance prompts | Faible | — | ❌ À faire |
| 04 | Persistance versions | Moyen | — | ❌ À faire |
| 05 | Détection agents LLM | Moyen | — | ❌ À faire |
| 06 | Refonte stockage transverse | Lourd | Missions 01-04 | ❌ À faire |
| 07 | Backend authentification | Lourd | Mission 06 | ❌ À faire |

**Tout est probablement à faire** — ce fichier a été créé au moment de la planification, avant le début de l'implémentation.

---

## 7. Commandes utiles

```bash
npm run dev          # Lancer le serveur de développement
npm run typecheck    # Vérifier les types TypeScript
npm test             # Lancer les tests
npm test -- --reporter=verbose  # Tests détaillés
```

---

*Document généré le 20/06/2026 à 10h17. À mettre à jour si les conventions ou la structure changent.*
