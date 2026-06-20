# Constat — Composant `TemplateLibrary`

**Fichier :** `components/TemplateLibrary.vue`
**Utilisé par :** `pages/templates.vue`

## État des lieux

### Interface utilisateur
- ✅ Grille de templates avec carte (nom, description, catégorie, identités, contenu, usage)
- ✅ Champ de recherche textuelle
- ✅ Filtre par catégorie (dropdown)
- ✅ Formulaire de création (nom, description, catégorie, identités, contenu)
- ✅ Bouton suppression par template
- ✅ Compteur "X template(s)"
- ✅ Badges catégorie + identités

### Données
- ❌ **Liste démarre vide** : `templates.value = ref<TemplateEntry[]>([])` — aucun seed data
- ❌ **`createMockTemplate()` utilisé** : le helper factice est appelé pour générer l'ID, la version et les variables du nouveau template
- ❌ **Stockage local `ref` seulement** : les templates créés vivent dans un tableau réactif Vue — **perdus au refresh navigateur**
- ❌ **`TemplateLibraryService` jamais utilisé** : le vrai service backend (`src/services/template-library.ts`) n'est pas importé ni appelé par le composant

### Comportement
- La création de template remplit un objet `draft`, appelle `addTemplate()` qui pousse dans `templates.value`
- La suppression retire du tableau local via `filter()`
- La recherche/filtre est côté client, fonctionnel
- Aucun appel API, aucune persistance, aucune initialisation

## Problèmes identifiés

1. **Aucune persistance** : refresh = tout perdu (pas même de localStorage)
2. **`createMockTemplate()` utilisé** : les nouveaux templates reçoivent des valeurs factices (version "1.0.0", variables vides, etc.)
3. **`TemplateLibraryService` non connecté** : le service existe avec `storeTemplate()`, `getTemplate()`, `searchTemplates()` mais n'est pas utilisé
4. **Pas de seed data** : la bibliothèque démarre vide à chaque visite
5. **Pas d'appel API** : rien n'est chargé depuis le serveur

## Recommandations

1. Remplacer `createMockTemplate()` par `TemplateLibraryService.storeTemplate()`
2. Charger les templates au montage via `TemplateLibraryService.searchTemplates()`
3. Ajouter une persistance (JSON fichier, localStorage ou base de données)
4. Prévoir un jeu de templates par défaut pré-chargés
5. Connecter le sélecteur de template de la page `/prompts` à cette bibliothèque
