# Plan de développement — Mission 07 : Backend authentification

**Date :** 20/06/2026 — 10h17  
**Projet :** Minautor Prompts Service  
**Mission :** 07/07 — Backend authentification  
**Effort estimé :** Lourd  
**Dépendances :** Mission 06 (stockage transverse) — recommandée mais pas bloquante

---

## Objectif

Connecter les identités à un vrai service d'authentification. Actuellement, les trois rôles (User, Superviseur, Responsable) sont des objets JavaScript statiques en RAM, sans aucun backend ni persistance.

---

## Tâches détaillées

### 7.1 — Étude et choix du fournisseur d'authentification

**Description :** Évaluer les options disponibles et choisir le fournisseur le plus adapté au projet.

**Sous-tâches :**
- [ ] Définir les besoins :
  - Stockage des identités et profils
  - Gestion des rôles et permissions
  - Pas de SSO obligatoire (projet mono-utilisateur / petite équipe)
  - Idéalement auto-hébergeable ou gratuit pour usage local
- [ ] Évaluer les options :
  - **Auth0** : SaaS, généreux free tier (7k users), facile à intégrer
  - **Supabase Auth** : open source, auto-hébergeable, gratuit
  - **NextAuth.js / Nuxt Auth** : solution locale sans dépendance externe
  - **Solution custom** : JWT simple, users stockés dans `runtime/users.json`
- [ ] Faire une recommandation (via Gravity Index ou recherche web)
- [ ] Valider le choix avec l'utilisateur

**Fichiers impactés :**
- `docs/choix-auth-20-06-2026.md` (décision)

---

### 7.2 — Intégrer le fournisseur d'authentification

**Description :** Mettre en place le login/logout et la gestion de session.

**Sous-tâches :**
- [ ] Créer `server/api/auth/login.post.ts` (ou utiliser le module Nuxt Auth si applicable)
- [ ] Créer `server/api/auth/logout.post.ts`
- [ ] Créer `server/api/auth/me.get.ts` (retourne l'utilisateur connecté)
- [ ] Gérer les tokens JWT ou les sessions côté serveur
- [ ] Protéger les routes API sensibles avec un middleware d'auth
- [ ] Gérer le refresh token / expiration

**Fichiers impactés :**
- `server/api/auth/login.post.ts` (nouveau)
- `server/api/auth/logout.post.ts` (nouveau)
- `server/api/auth/me.get.ts` (nouveau)
- `server/middleware/auth.ts` (nouveau, si nécessaire)

---

### 7.3 — Créer un composable useAuth

**Description :** Exposer les informations d'authentification de manière réactive côté client.

**Sous-tâches :**
- [ ] Créer `composables/useAuth.ts`
- [ ] Exposer `user: Ref<User | null>`, `isAuthenticated: Ref<boolean>`, `isLoading: Ref<boolean>`
- [ ] Appeler `/api/auth/me` au chargement de l'application
- [ ] Méthodes `login(email, password)` et `logout()`
- [ ] Stocker le token JWT dans un cookie HttpOnly (côté serveur) ou localStorage (fallback)

**Fichiers impactés :**
- `composables/useAuth.ts` (nouveau)

---

### 7.4 — Adapter IdentityResolver

**Description :** Remplacer les identités en RAM par les utilisateurs authentifiés.

**Sous-tâches :**
- [ ] Modifier `IdentityResolver.getCurrentIdentity()` pour retourner l'utilisateur connecté
- [ ] Modifier `IdentityResolver.setCurrentIdentity()` pour appeler l'API d'auth
- [ ] Adapter `validateIdentityPermissions()` pour utiliser les rôles réels
- [ ] Stocker les préférences utilisateur (via `StorageService`, mission 06)
- [ ] Supprimer les identités mock (User/Superviseur/Responsable en dur)

**Fichiers impactés :**
- `src/services/identity-resolver.ts`

---

### 7.5 — Adapter l'UI

**Description :** Ajouter les éléments d'interface pour l'authentification.

**Sous-tâches :**
- [ ] Ajouter un bouton "Se connecter" / avatar utilisateur dans la sidebar (`layouts/default.vue`)
- [ ] Créer une modale de login (email + mot de passe) ou rediriger vers le fournisseur
- [ ] Afficher le nom et le rôle de l'utilisateur connecté
- [ ] Ajouter un bouton "Déconnexion"
- [ ] Adapter la page `/identities` pour afficher l'utilisateur connecté plutôt que les 3 rôles mock
- [ ] Gérer les accès non autorisés (redirection ou message)

**Fichiers impactés :**
- `layouts/default.vue`
- `pages/identities.vue`
- `components/LoginModal.vue` (nouveau)

---

### 7.6 — Ajouter une page de profil utilisateur (optionnel)

**Description :** Permettre à l'utilisateur de modifier ses préférences.

**Sous-tâches :**
- [ ] Créer `pages/profile.vue` (ou intégrer dans `/identities`)
- [ ] Afficher les informations du compte
- [ ] Permettre de modifier les préférences (thème, templates favoris, etc.)
- [ ] Sauvegarder les préférences via `IdentityResolver` + `StorageService`

**Fichiers impactés :**
- `pages/profile.vue` (nouveau)

---

### 7.7 — Ajouter des données de démonstration

**Description :** Si aucun fournisseur d'auth n'est configuré (mode développement), proposer un mode "démo" avec les 3 rôles actuels.

**Sous-tâches :**
- [ ] Détecter si l'auth est configurée (variable d'environnement)
- [ ] Si non : proposer un bouton "Mode démo" qui utilise les identités mock
- [ ] Ajouter un badge "Mode démo" dans l'interface
- [ ] Documenter comment configurer l'auth réelle

**Fichiers impactés :**
- `composables/useAuth.ts`
- `pages/identities.vue`

---

## Critères d'acceptation

- [ ] Un utilisateur peut se connecter avec email + mot de passe
- [ ] La session persiste après refresh de la page
- [ ] Les rôles et permissions sont synchronisés avec le fournisseur d'auth
- [ ] La page `/identities` affiche l'utilisateur connecté (plus les 3 rôles mock)
- [ ] La sidebar affiche l'utilisateur connecté
- [ ] La déconnexion fonctionne et nettoie la session
- [ ] Mode démo disponible si aucun fournisseur configuré
- [ ] Les tests existants passent toujours

---

## Notes d'implémentation

- **Recommandation** : Commencer par une solution **simple et auto-hébergée** (JWT custom avec `runtime/users.json`) plutôt que d'intégrer un fournisseur externe dès le départ. Cela permet de débloquer la mission rapidement et de migrer vers Auth0/Supabase plus tard.
- Les mots de passe doivent être hashés avec `bcrypt` (ou similaire) — jamais en clair dans le fichier JSON.
- Les routes API protégées doivent retourner 401 si le token est invalide ou expiré.
- Pour Nuxt, utiliser `useCookie()` côté client pour le token JWT avec `httpOnly: true` si possible (nécessite un proxy API).
- Le mode démo doit être clairement identifiable (badge, couleur différente) pour éviter toute confusion.
