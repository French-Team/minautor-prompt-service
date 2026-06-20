# Sidebar — Refonte en workflow

## Contexte

La sidebar actuelle liste les pages sans ordre logique métier. L'objectif est de la réorganiser pour qu'elle représente un **workflow naturel** : l'utilisateur suit l'ordre des boutons pour configurer et utiliser le système de façon optimale.

## Ordre actuel

1. Projet
2. Dashboard
3. Prompts
4. Templates
5. Identités
6. Versions

## Réflexion : ordre « workflow »

Le système « Minautor Prompts Service » suit une logique en几 étapes :

1. **Projet** — Définir le projet cible (sélection du dossier). C'est la première chose à faire.
2. **Identités** — Configurer les identités (qui utilise le système, quels rôles/permissions).
3. **Templates** — Choisir ou créer les templates de prompts.
4. **Prompts** — Générer les prompts à partir des identités + templates + contexte.
5. **Versions** — Suivre l'historique des modifications.
6. **Dashboard** — Vue d'ensemble une fois que tout est en place.

Ou alternativement, Dashboard en 2e position (après Projet) pour donner une vue d'ensemble immédiate :

1. Projet
2. Dashboard ← vue d'ensemble après sélection du projet
3. Identités
4. Templates
5. Prompts
6. Versions

## Principes

- **Projet** reste en première position (c'est la porte d'entrée)
- L'ordre suit la chronique d'utilisation : on sélectionne → on configure → on génère → on suit
- **Dashboard** peut être soit en position 2 (vue d'ensemble), soit en position 6 (bilan)
- Les libellés doivent être clairs et orientés action si possible

## Décision (validée)

**Ordre retenu :** Projet → Identités → Templates → Prompts → Versions → Dashboard

Appliqué dans `layouts/default.vue` le 20/06/2026.
