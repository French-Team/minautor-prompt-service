// GET /api/prompts
//
// Returns all prompts currently stored in the PromptManager.
// Backed by the persistent `runtime/prompts.json` file (see server/utils/promptService.ts).

import { defineEventHandler, setResponseStatus } from 'h3';

import { getPromptService } from '../utils/promptService';

/**
 * Cycle JSON avec replacer Date → ISO. Garantit que tous les `Date` (et sous-objets)
 * sont sérialisés en ISO strings, compatibles front.
 */
function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v))) as T;
}

export default defineEventHandler(async (event) => {
  try {
    const service = await getPromptService();
    const prompts = service.listPrompts();
    return serialize(prompts);
  } catch (error: unknown) {
    setResponseStatus(event, 500);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
