// Source de vérité partagée pour les sous-catégories de templates, indexées
// par identité enrichie (`Architecte`, `Developpeur`, `TesteurQA`, etc.).
//
// Le sélecteur "Catégorie" de la page /prompts sert désormais à picker la
// sous-catégorie de l'identité courante. La cascade est : identité → sous-
// catégorie → templates filtrés (template.category === sousCategorie).
//
// L'`id` de la sous-catégorie correspond conventionnellement à la valeur du
// champ `category` du template. Cela permet d'éviter une table de mapping
// supplémentaire tout en gardant la possibilité de renommer les libellés
// affichés sans toucher aux templates.
//
// Note design : la compatibilité "identité" reste un warning visuel séparé
// (variable `identityCompatible` côté page) — elle n'entre PAS dans le filtre
// principal des templates. Cela évite une cascade trop restrictive (un template
// utile pourrait disparaître alors que l'utilisateur n'a fait que changer
// d'identité). Le warning reste visible col 2 dans /prompts.

import rawByIdentity from '~/config/identity-subcategories.json';

/**
 * Forme typée d'une sous-catégorie affichable dans le sélecteur.
 * `id` matche `template.category` (string libre, voir runtime/templates.seed.json).
 */
export interface IdentitySubcategory {
  id: string;
  label: string;
  description?: string;
}

/**
 * Type du JSON complet. `byIdentity` indexe par rich id d'identité :
 * `'User' | 'Superviseur' | 'Responsable' | 'Architecte' | …`
 * (cf. config/identities.json).
 *
 * Le `metadata` du JSON est volontairement non typé ici : il est consommé
 * côté data-pipeline / éditeur de seed, pas côté runtime UI.
 */
interface RawRoot {
  byIdentity: Record<string, ReadonlyArray<IdentitySubcategory>>;
}

/** Map figée, exposée aux consommateurs. La clé = rich id d'identité. */
export const SUB_CATEGORIES_BY_IDENTITY: Readonly<Record<string, ReadonlyArray<IdentitySubcategory>>> = (
  rawByIdentity as unknown as RawRoot
).byIdentity;

/**
 * Renvoie les sous-catégories disponibles pour une identité donnée.
 * Renvoie un tableau vide si l'identité n'a pas de mapping (défensif :
 * ne devrait jamais arriver avec le catalogue actuel).
 */
export function getSubcategoriesForIdentity(identityId: string): ReadonlyArray<IdentitySubcategory> {
  return SUB_CATEGORIES_BY_IDENTITY[identityId] ?? [];
}
