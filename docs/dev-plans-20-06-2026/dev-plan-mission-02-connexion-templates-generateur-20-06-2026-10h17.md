# Plan de développement — Mission 02 : Connexion templates → générateur

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 02/07 — Connexion templates → générateur  
**Effort estimé :** Moyen  
**Dépendances :** Mission 01 (persistance des templates) — à faire après

---

## Objectif

Permettre de sélectionner un template depuis la bibliothèque dans le formulaire de génération de prompts (`/prompts`). Actuellement, la page `/prompts` utilise une textarea de template brut. Il faut la remplacer par un sélecteur de template connecté à `TemplateLibraryService`.

---

## Tâches détaillées

### 2.1 — Analyser la page `/prompts` actuelle

**Description :** Lire le formulaire de génération existant pour comprendre comment le template est saisi, traité et envoyé au générateur.

**Sous-tâches :**
- [ ] Lire `pages/prompts.vue` (complet)
- [ ] Identifier où le template brut est saisi (textarea, variable, v-model)
- [ ] Comprendre comment les variables du template sont extraites
- [ ] Comprendre comment le template + variables → `PromptGenerator.generateComprehensivePrompt()`

**Fichiers impactés :**
- `pages/prompts.vue` (lecture seule pour l'analyse)

---

### 2.2 — Créer un composant TemplateSelector

**Description :** Créer un composant réutilisable qui liste les templates disponibles et permet d'en sélectionner un. Ce composant remplacera la textarea de template brut.

**Sous-tâches :**
- [ ] Créer `components/TemplateSelector.vue`
- [ ] Charger les templates depuis `TemplateLibraryService.searchTemplates()`
- [ ] Afficher une liste avec recherche / filtres (nom, catégorie)
- [ ] Mode "sélection unique" avec carte détaillée du template sélectionné
- [ ] Émettre un event `@select(template: PromptTemplate)`
- [ ] Ajouter un bouton "Actualiser" pour recharger la liste

**Fichiers impactés :**
- `components/TemplateSelector.vue` (nouveau)

---

### 2.3 — Remplacer la textarea de template par le sélecteur

**Description :** Intégrer `TemplateSelector` dans la page `/prompts` et gérer la sélection.

**Sous-tâches :**
- [ ] Remplacer la textarea par `<TemplateSelector @select="onTemplateSelect" />`
- [ ] Stocker le template sélectionné dans une variable réactive
- [ ] Afficher le contenu du template sélectionné en lecture seule (ou éditable ? voir note)
- [ ] Ajouter un bouton "Désélectionner" pour revenir à l'état initial

**Fichiers impactés :**
- `pages/prompts.vue`

---

### 2.4 — Afficher et lier les variables du template

**Description :** Une fois un template sélectionné, extraire ses variables (placeholder `{{variable}}`) et générer des champs de saisie dynamiques.

**Sous-tâches :**
- [ ] Extraire les variables du template sélectionné via regex `/\{\{(\w+)\}\}/g`
- [ ] Générer un champ `<input>` ou `<textarea>` par variable
- [ ] Afficher les champs dans un formulaire dédié en dessous du sélecteur
- [ ] Valider que tous les champs requis sont remplis avant de pouvoir générer
- [ ] Remplacer les `{{variable}}` par les valeurs saisies avant envoi au générateur

**Fichiers impactés :**
- `pages/prompts.vue`

---

### 2.5 — Adapter la génération pour utiliser le template + variables

**Description :** Modifier le flux de génération pour passer le template sélectionné et les variables résolues au lieu du texte brut.

**Sous-tâches :**
- [ ] Résoudre le template : remplacer `{{var}}` par les valeurs utilisateur
- [ ] Passer le template résolu à `PromptGenerator.generateComprehensivePrompt()`
- [ ] Conserver l'identité du template d'origine (ID, nom) dans les métadonnées du prompt généré
- [ ] Fallback : si aucun template sélectionné, utiliser la textarea libre comme avant

**Fichiers impactés :**
- `pages/prompts.vue`

---

## Critères d'acceptation

- [ ] La page `/prompts` affiche une liste de templates disponibles
- [ ] Sélectionner un template → ses variables sont affichées sous forme de champs
- [ ] Remplir les variables et cliquer "Générer" → le prompt est généré avec les valeurs saisies
- [ ] Si aucun template sélectionné → la textarea libre est toujours disponible
- [ ] Les templates viennent de `TemplateLibraryService` (persistés, mission 01)
- [ ] Les tests existants passent toujours

---

## Notes d'implémentation

- Regex d'extraction des variables : `/\{\{(\w+)\}\}/g` — capture les mots entre `{{ }}`.
- Certains templates peuvent avoir des variables avec des valeurs par défaut suggérées (ex: `{{sujet:marketing}}`). Prévoir le parsing avancé si nécessaire.
- Le composant `TemplateSelector` pourrait être réutilisé ailleurs (page templates en mode "sélection"). Penser à le rendre générique (`mode="picker"` vs `mode="full"`).
- L'ordre des variables dans le template peut être important pour l'UX. Les afficher dans l'ordre d'apparition.
