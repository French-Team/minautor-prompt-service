// POST /api/prompts
//
// Creates a new prompt via PromptManager.storePrompt() and persists it through
// the disk-backed adapter. The client provides the full GeneratedPrompt object
// (id, content, identity, context, metadata, version, appliedRules) — we don't
// re-generate server-side, we just store what the client already produced.

import { defineEventHandler, readBody, setResponseStatus } from 'h3';

import { getPromptService } from '../utils/promptService';
import type { GeneratedPrompt } from '../../src/models/prompt';
import type { UserIdentity } from '../../src/models/identity';
import type { ProjectContext } from '../../src/models/context';
import type { PromptMetadata, AppliedRule } from '../../src/models/prompt';

const VALID_IDENTITY_TYPES = new Set(['User', 'Superviseur', 'Responsable']);

/**
 * Convertit une string ISO en Date si valide, sinon laisse la valeur inchangée.
 */
function reviveDate(v: unknown): Date | unknown {
  if (typeof v !== 'string') return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d;
}

/**
 * Valide la payload et reconstruit un GeneratedPrompt conforme.
 * Renvoie une erreur descriptive en cas de payload invalide.
 */
function parsePrompt(body: unknown): { prompt?: GeneratedPrompt; error?: { code: string; message: string } } {
  if (!body || typeof body !== 'object') {
    return { error: { code: 'INVALID_BODY', message: 'Request body must be a prompt object.' } };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.id !== 'string' || !b.id.trim()) {
    return { error: { code: 'INVALID_ID', message: 'Field "id" is required and must be a non-empty string.' } };
  }
  if (typeof b.content !== 'string') {
    return { error: { code: 'INVALID_CONTENT', message: 'Field "content" must be a string.' } };
  }
  if (typeof b.version !== 'string' || !b.version.trim()) {
    return { error: { code: 'INVALID_VERSION', message: 'Field "version" is required.' } };
  }
  if (!b.identity || typeof b.identity !== 'object') {
    return { error: { code: 'INVALID_IDENTITY', message: 'Field "identity" is required.' } };
  }
  const identity = b.identity as Partial<UserIdentity>;
  if (typeof identity.type !== 'string' || !VALID_IDENTITY_TYPES.has(identity.type)) {
    return {
      error: {
        code: 'INVALID_IDENTITY_TYPE',
        message: `identity.type must be one of: ${[...VALID_IDENTITY_TYPES].join(', ')}`,
      },
    };
  }
  if (!b.context || typeof b.context !== 'object') {
    return { error: { code: 'INVALID_CONTEXT', message: 'Field "context" is required.' } };
  }
  if (!b.metadata || typeof b.metadata !== 'object') {
    return { error: { code: 'INVALID_METADATA', message: 'Field "metadata" is required.' } };
  }

  const rawMeta = b.metadata as Partial<PromptMetadata> & Record<string, unknown>;
  const rawUsage = (rawMeta.usage ?? {}) as Record<string, unknown>;

  const metadata: PromptMetadata = {
    createdAt: reviveDate(rawMeta.createdAt) as Date,
    updatedAt: reviveDate(rawMeta.updatedAt) as Date,
    author: typeof rawMeta.author === 'string' ? rawMeta.author : 'user',
    tags: Array.isArray(rawMeta.tags) ? (rawMeta.tags as string[]) : [],
    usage: {
      totalUses: typeof rawUsage.totalUses === 'number' ? rawUsage.totalUses : 0,
      successRate: typeof rawUsage.successRate === 'number' ? rawUsage.successRate : 1.0,
      averageResponseTime: typeof rawUsage.averageResponseTime === 'number' ? rawUsage.averageResponseTime : 0,
      lastUsed: (reviveDate(rawUsage.lastUsed) as Date) ?? new Date(),
    },
  };

  const appliedRules: AppliedRule[] = Array.isArray(b.appliedRules)
    ? (b.appliedRules as AppliedRule[]).map((r) => ({
        ruleId: String(r.ruleId ?? ''),
        ruleName: String(r.ruleName ?? ''),
        impact: (['low', 'medium', 'high'] as const).includes(r.impact) ? r.impact : 'low',
        modifications: Array.isArray(r.modifications) ? (r.modifications as string[]) : [],
      }))
    : [];

  const prompt: GeneratedPrompt = {
    id: b.id.trim(),
    identity: identity as UserIdentity,
    content: b.content,
    metadata,
    version: b.version,
    context: b.context as ProjectContext,
    appliedRules,
  };

  return { prompt };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<unknown>(event);
    const parsed = parsePrompt(body);
    if (parsed.error || !parsed.prompt) {
      setResponseStatus(event, 400);
      return {
        error: parsed.error?.code ?? 'INVALID_PAYLOAD',
        message: parsed.error?.message ?? 'Invalid prompt payload.',
      };
    }

    const service = await getPromptService();

    // Cohérence avec templates.post : 409 sur duplicate (upsert explicite côté client via PUT futur).
    if (service.hasPrompt(parsed.prompt.id)) {
      setResponseStatus(event, 409);
      return {
        error: 'DUPLICATE_PROMPT_ID',
        message: `Prompt with id "${parsed.prompt.id}" already exists.`,
      };
    }

    const stored = await service.storePrompt(parsed.prompt);

    setResponseStatus(event, 201);
    return {
      id: stored.id,
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
