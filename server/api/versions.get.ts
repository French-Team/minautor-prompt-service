// GET /api/versions
//
// Returns the complete version-store snapshot: 3 Maps serialised as JSON-friendly
// records. Backed by the persistent `runtime/versions.json` file (see server/utils/versionService.ts).

import { defineEventHandler, setResponseStatus } from 'h3';

import { getVersionService } from '../utils/versionService';

/**
 * Cycle JSON avec replacer Date → ISO. Garantit que tous les `Date` (et sous-objets)
 * sont sérialisés en ISO strings, compatibles front.
 */
function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, v) => (v instanceof Date ? v.toISOString() : v))) as T;
}

export default defineEventHandler(async (event) => {
  try {
    const service = await getVersionService();
    const snapshot = service.listVersionsAll();
    return serialize(snapshot);
  } catch (error: unknown) {
    setResponseStatus(event, 500);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
