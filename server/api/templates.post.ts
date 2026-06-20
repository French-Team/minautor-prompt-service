// POST /api/templates
//
// Creates a new template via TemplateLibraryService.storeTemplate() and
// persists it through the disk-backed adapter.

import { defineEventHandler, readBody, setResponseStatus } from 'h3';

import { getTemplateService } from '../utils/templateService';
import type { PromptTemplate, TemplateCategory } from '../../src/models/template';

// v3 : taxonomie 10 piliers orthogonaux (orthogonalite durcie).
// `optimization` a ete scinde en `refactoring` (clean code local / dette technique)
// et `performance` (perf / observabilite / monitoring cloud).
const VALID_CATEGORIES: TemplateCategory[] = [
  'general',
  'technical',
  'architecture',
  'refactoring',
  'quality',
  'security',
  'documentation',
  'devops',
  'management',
  'performance',
];
const VALID_IDENTITIES = ['User', 'Superviseur', 'Responsable'] as const;

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<Partial<PromptTemplate>>(event);

    if (!body || typeof body !== 'object') {
      setResponseStatus(event, 400);
      return { error: 'INVALID_BODY', message: 'Request body must be a template object.' };
    }
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      setResponseStatus(event, 400);
      return { error: 'INVALID_NAME', message: 'Field "name" is required.' };
    }
    if (!body.template || typeof body.template !== 'string' || !body.template.trim()) {
      setResponseStatus(event, 400);
      return { error: 'INVALID_TEMPLATE', message: 'Field "template" is required.' };
    }
    if (!body.category || !VALID_CATEGORIES.includes(body.category)) {
      setResponseStatus(event, 400);
      return {
        error: 'INVALID_CATEGORY',
        message: `Field "category" must be one of: ${VALID_CATEGORIES.join(', ')}`,
      };
    }
    const identities = Array.isArray(body.identities) ? body.identities : ['User'];
    const filteredIdentities = identities.filter((i): i is 'User' | 'Superviseur' | 'Responsable' =>
      VALID_IDENTITIES.includes(i as (typeof VALID_IDENTITIES)[number]),
    );
    if (filteredIdentities.length === 0) {
      setResponseStatus(event, 400);
      return { error: 'INVALID_IDENTITIES', message: 'At least one valid identity is required.' };
    }

    const now = new Date();
    // ID stable: crypto.randomUUID si dispo (Node 19+) sinon timestamp + suffixe aléatoire
    const id =
      body.id && typeof body.id === 'string' && body.id.trim()
        ? body.id.trim()
        : `tpl-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;

    const descriptionValue = (body.description ?? '').toString().trim();

    const newTemplate: PromptTemplate = {
      id,
      name: body.name.trim(),
      description: descriptionValue || body.name.trim(),
      category: body.category,
      identities: filteredIdentities,
      template: body.template,
      variables: Array.isArray(body.variables) ? body.variables : [],
      constraints: Array.isArray(body.constraints) ? body.constraints : [],
      version: body.version ?? '1.0.0',
      isPublic: body.isPublic ?? true,
      author: body.author ?? 'user',
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    const service = await getTemplateService();
    const result = await service.storeTemplate(newTemplate);

    if (!result.success) {
      const status = result._error.code === 'DUPLICATE_TEMPLATE_ID' ? 409 : 400;
      setResponseStatus(event, status);
      return { error: result._error.code, message: result._error.message };
    }

    setResponseStatus(event, 201);
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString(),
      updatedAt: newTemplate.updatedAt.toISOString(),
    };
  } catch (error: unknown) {
    setResponseStatus(event, 500);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
