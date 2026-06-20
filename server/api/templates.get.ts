// GET /api/templates
//
// Returns all templates currently stored in the TemplateLibraryService.
// Backed by the persistent `runtime/templates.json` file (see server/utils/templateService.ts).

import { defineEventHandler, setResponseStatus } from 'h3';

import { getTemplateService } from '../utils/templateService';
import type { PromptTemplate } from '../../src/models/template';

export default defineEventHandler(async (event) => {
  try {
    const service = await getTemplateService();
    const result = await service.getAllTemplates(true);

    if (!result.success) {
      setResponseStatus(event, 500);
      return { error: result._error.code, message: result._error.message };
    }

    // Serialise les Date en ISO strings (compat front)
    return result._value.map((t: PromptTemplate) => ({
      ...t,
      createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
      updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
    }));
  } catch (error: unknown) {
    setResponseStatus(event, 500);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
