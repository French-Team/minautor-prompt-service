// POST /api/versions
//
// Creates a new PromptVersion via VersionHandler.storePromptVersion() and persists it
// through the disk-backed adapter. The client provides the full PromptVersion object
// (id, promptId, version, content, metadata, isActive, etc.) — we don't auto-version
// server-side, we just persist what the client already produced.

import { defineEventHandler, readBody, setResponseStatus } from 'h3';

import { getVersionService } from '../utils/versionService';
import type { PromptVersion, VersionMetadata, RollbackInfo } from '../../src/models/version';

function reviveDate(v: unknown): Date | unknown {
  if (typeof v !== 'string') return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d;
}

/**
 * Valide la payload et reconstruit un PromptVersion conforme.
 */
function parseVersion(body: unknown): {
  version?: PromptVersion;
  error?: { code: string; message: string };
} {
  if (!body || typeof body !== 'object') {
    return { error: { code: 'INVALID_BODY', message: 'Request body must be a version object.' } };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.id !== 'string' || !b.id.trim()) {
    return { error: { code: 'INVALID_ID', message: 'Field "id" is required and must be a non-empty string.' } };
  }
  if (typeof b.promptId !== 'string' || !b.promptId.trim()) {
    return {
      error: { code: 'INVALID_PROMPT_ID', message: 'Field "promptId" is required and must be a non-empty string.' },
    };
  }
  if (typeof b.version !== 'string' || !b.version.trim()) {
    return { error: { code: 'INVALID_VERSION', message: 'Field "version" is required.' } };
  }
  if (typeof b.content !== 'string') {
    return { error: { code: 'INVALID_CONTENT', message: 'Field "content" must be a string.' } };
  }
  if (typeof b.isActive !== 'boolean') {
    return { error: { code: 'INVALID_IS_ACTIVE', message: 'Field "isActive" must be a boolean.' } };
  }
  if (typeof b.createdBy !== 'string') {
    return { error: { code: 'INVALID_CREATED_BY', message: 'Field "createdBy" must be a string.' } };
  }
  if (!b.metadata || typeof b.metadata !== 'object') {
    return { error: { code: 'INVALID_METADATA', message: 'Field "metadata" is required.' } };
  }

  const rawMeta = b.metadata as Record<string, unknown>;
  const metadata: VersionMetadata = {
    changeReason: typeof rawMeta.changeReason === 'string' ? rawMeta.changeReason : 'API submission',
    ...(rawMeta.performanceMetrics && typeof rawMeta.performanceMetrics === 'object'
      ? { performanceMetrics: rawMeta.performanceMetrics as VersionMetadata['performanceMetrics'] }
      : {}),
    ...(typeof rawMeta.qualityScore === 'number' ? { qualityScore: rawMeta.qualityScore } : {}),
    ...(rawMeta.rollbackInfo && typeof rawMeta.rollbackInfo === 'object'
      ? (() => {
          const ri = rawMeta.rollbackInfo as Partial<RollbackInfo>;
          return {
            rollbackInfo: {
              canRollback: typeof ri.canRollback === 'boolean' ? ri.canRollback : false,
              ...(typeof ri.previousVersion === 'string' ? { previousVersion: ri.previousVersion } : {}),
              ...(typeof ri.rollbackReason === 'string' ? { rollbackReason: ri.rollbackReason } : {}),
              ...(ri.rollbackAt ? { rollbackAt: reviveDate(ri.rollbackAt) as Date } : {}),
            } as RollbackInfo,
          };
        })()
      : {}),
  };

  const version: PromptVersion = {
    id: b.id.trim(),
    promptId: b.promptId.trim(),
    version: b.version.trim(),
    content: b.content,
    changes: Array.isArray(b.changes) ? (b.changes as PromptVersion['changes']) : [],
    createdAt: (reviveDate(b.createdAt) as Date) ?? new Date(),
    createdBy: b.createdBy,
    isActive: b.isActive,
    metadata,
  };

  return { version };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<unknown>(event);
    const parsed = parseVersion(body);
    if (parsed.error || !parsed.version) {
      setResponseStatus(event, 400);
      return {
        error: parsed.error?.code ?? 'INVALID_PAYLOAD',
        message: parsed.error?.message ?? 'Invalid version payload.',
      };
    }

    const service = await getVersionService();

    // 409 sur duplicate id (cohérent avec templates.post + prompts.post).
    if (service.hasVersionById(parsed.version.id)) {
      setResponseStatus(event, 409);
      return {
        error: 'DUPLICATE_VERSION_ID',
        message: `Version with id "${parsed.version.id}" already exists.`,
      };
    }

    const stored = await service.storePromptVersion(parsed.version);

    setResponseStatus(event, 201);
    return {
      id: stored.id,
      promptId: stored.promptId,
      version: stored.version,
      savedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    setResponseStatus(event, 500);
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
