// DELETE /api/templates/:id
//
// Deletes a template by id via TemplateLibraryService.deleteTemplate()
// and persists the change through the disk-backed adapter.

import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';

import { getTemplateService } from '../../utils/templateService';

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    if (!id || !id.trim()) {
      setResponseStatus(event, 400);
      return { error: 'INVALID_ID', message: 'Template id is required.' };
    }

    const service = await getTemplateService();
    const result = await service.deleteTemplate(id.trim());

    if (!result.success) {
      const status = result._error.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400;
      setResponseStatus(event, status);
      return { error: result._error.code, message: result._error.message };
    }

    setResponseStatus(event, 200);
    return { id: id.trim(), deleted: true };
  } catch (error: unknown) {
    setResponseStatus(event, 500);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
