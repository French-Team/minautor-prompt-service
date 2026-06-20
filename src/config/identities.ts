// Source de vérité partagée pour les listes de sélection "Identité", regroupées
// par catégorie depuis l'enrichissement (config/identities.json v2+).
//
// Pourquoi le mapping `runtimeProfile` ?
// Le runtime (IdentityResolver + IdentityStrategy) n'expose que 3 profils
// concrets (`User | Superviseur | Responsable`) car c'est ce qui est codé.
// Plutôt que de dupliquer une IdentityStrategy par nouveau rôle riche, chaque
// option d'identité est mappée à l'un de ces 3 profils via `runtimeProfile`.
// Côté UI on distingue 9 rôles visuels ; côté runtime on continue d'utiliser
// les 3 stratégies. Quand un profil dédié deviendra souhaitable (ex : vraie
// stratégie Architecte), il suffira d'ajouter la classe dans identity-strategies.ts
// et de renseigner `runtimeProfile: 'Architecte'` (ou étendre le type avec le
// nouveau littéral).

import rawCategories from '~/config/identities.json';
import type { UserIdentityType } from '~/src/models/identity';

/**
 * Forme typée d'une option d'identité affichable dans un sélecteur.
 * `id` est large (string) pour accepter les rôles enrichis.
 * `runtimeProfile` indique le profil concret à passer au resolver.
 */
export interface IdentityOption {
  id: string;
  label: string;
  description?: string;
  runtimeProfile: UserIdentityType;
}

/**
 * Catégorie regroupant plusieurs options d'identité partageant un domaine
 * (Standard / technique / business / etc.).
 */
export interface IdentityCategory {
  id: string;
  label: string;
  order: number;
  identities: ReadonlyArray<IdentityOption>;
}

/**
 * Cast large → typé. Le narrowing n'est pas perdu car `runtimeProfile` reste
 * contraint à `UserIdentityType` après l'assertion.
 */
interface RawRoot {
  metadata: { version: number; lastUpdated: string; comment?: string };
  categories: ReadonlyArray<{
    id: string;
    label: string;
    order: number;
    identities: ReadonlyArray<{
      id: string;
      label: string;
      description?: string;
      runtimeProfile: UserIdentityType;
    }>;
  }>;
}
const data = rawCategories as RawRoot;

/** Catégories triées par `order` croissant, exposées aux consommateurs. */
export const IDENTITY_CATEGORIES: ReadonlyArray<IdentityCategory> = [...data.categories].sort(
  (a, b) => a.order - b.order,
);

/** Liste plate de toutes les options, pratique pour lookup. */
export const IDENTITIES: ReadonlyArray<IdentityOption> = IDENTITY_CATEGORIES.flatMap((cat) => cat.identities);

/** Lookup d'une option par id (string large). */
export function findIdentity(id: string): IdentityOption | undefined {
  return IDENTITIES.find((opt) => opt.id === id);
}

/**
 * Résout le profil runtime (parmi les 3 historiques) à partir d'un id
 * d'identifié enrichi. Fallback `'User'` pour les ids inexistants — défensif
 * uniquement (ne devrait jamais arriver avec le catalogue actuel).
 */
export function resolveRuntimeProfile(id: string): UserIdentityType {
  return findIdentity(id)?.runtimeProfile ?? 'User';
}

/** Ids des identités de la catégorie "Standard" (les 3 historiques). */
export const STANDARD_IDS: ReadonlyArray<string> = IDENTITY_CATEGORIES.find((c) => c.id === 'standard')?.identities.map(
  (o) => o.id,
) ?? ['User', 'Superviseur', 'Responsable'];
