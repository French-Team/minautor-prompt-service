// Agent error handler with adaptation fallbacks

import type { Result } from '../../models/result';
import { success, failure } from '../../models/result';
import type { SystemError, RecoveryResult, ErrorHandlingOptions, AgentError } from '../../models/errors';
import { ErrorCategory } from '../../models/errors';
import { ErrorHandler } from './error-handler-chain';
import type { AgentType, AgentSpecialization } from '../../models/agent';

export interface AgentRecoveryContext {
  targetAgent?: AgentType;
  promptContent?: string;
  requiredCapabilities?: AgentSpecialization[];
  availableAgents?: AgentType[];
  requestedOperation: string;
}

export class AgentErrorHandler extends ErrorHandler<AgentRecoveryContext> {
  // Generic prompt adaptations that work with any agent
  private readonly genericAdaptations = {
    conversational: (content: string) => `Please respond in a conversational manner: ${content}`,
    technical: (content: string) => `Technical analysis required: ${content}`,
    coordination: (content: string) => `Coordination task: ${content}`,
    fallback: (content: string) => `${content}`,
  };

  // Agent capability matrix for fallback selection
  private readonly agentCapabilities: Record<AgentType, AgentSpecialization[]> = {
    ollama: ['conversation'],
    'lm-studio': ['coordination'],
    codestral: ['technical'],
    generic: ['conversation'],
  };

  protected canHandle(error: SystemError): boolean {
    return error.category === ErrorCategory.AGENT;
  }

  protected async handleError(
    error: SystemError,
    context: AgentRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<AgentRecoveryContext>, SystemError>> {
    const agentError = error as AgentError;

    switch (agentError.code) {
      case 'AGENT_NOT_SUPPORTED':
        return this.handleUnsupportedAgent(agentError, context, options);

      case 'AGENT_ADAPTATION_FAILED':
        return this.handleAdaptationFailure(agentError, context, options);

      case 'AGENT_UNAVAILABLE':
        return this.handleUnavailableAgent(agentError, context, options);

      case 'AGENT_CAPABILITY_MISSING':
        return this.handleMissingCapability(agentError, context, options);

      default:
        return failure(agentError);
    }
  }

  private async handleUnsupportedAgent(
    error: AgentError,
    context: AgentRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<AgentRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Find a suitable fallback agent or use generic adaptation
    const fallbackAgent = this.findFallbackAgent(context.requiredCapabilities || [], context.availableAgents || []);

    let adaptedContent = context.promptContent || '';
    let recoveryStrategy = 'generic-adaptation';

    if (fallbackAgent) {
      adaptedContent = this.adaptForAgent(adaptedContent, fallbackAgent);
      recoveryStrategy = `fallback-agent-${fallbackAgent}`;
    } else {
      adaptedContent = this.genericAdaptations.fallback(adaptedContent);
    }

    const recoveryResult: RecoveryResult<AgentRecoveryContext> = {
      success: true,
      value: {
        ...context,
        targetAgent: fallbackAgent || 'generic',
        promptContent: adaptedContent,
      },
      fallbackUsed: true,
      recoveryStrategy,
      warnings: [
        `Agent '${context.targetAgent}' not supported, using ${fallbackAgent || 'generic'} adaptation`,
        'Some agent-specific features may not be available',
      ],
    };

    return success(recoveryResult);
  }

  private async handleAdaptationFailure(
    error: AgentError,
    context: AgentRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<AgentRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Use generic adaptation as fallback
    const genericContent = this.genericAdaptations.fallback(context.promptContent || '');

    const recoveryResult: RecoveryResult<AgentRecoveryContext> = {
      success: true,
      value: {
        ...context,
        promptContent: genericContent,
      },
      fallbackUsed: true,
      recoveryStrategy: 'generic-adaptation-fallback',
      warnings: [
        'Agent-specific adaptation failed, using generic format',
        'Prompt may not be optimized for the target agent',
      ],
    };

    return success(recoveryResult);
  }

  private async handleUnavailableAgent(
    error: AgentError,
    context: AgentRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<AgentRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Find an available alternative agent
    const alternativeAgent = this.findAlternativeAgent(context.targetAgent, context.availableAgents || []);

    if (alternativeAgent) {
      const adaptedContent = this.adaptForAgent(context.promptContent || '', alternativeAgent);

      const recoveryResult: RecoveryResult<AgentRecoveryContext> = {
        success: true,
        value: {
          ...context,
          targetAgent: alternativeAgent,
          promptContent: adaptedContent,
        },
        fallbackUsed: true,
        recoveryStrategy: `alternative-agent-${alternativeAgent}`,
        warnings: [
          `Agent '${context.targetAgent}' unavailable, using '${alternativeAgent}'`,
          'Response characteristics may differ from the original target agent',
        ],
      };

      return success(recoveryResult);
    }

    // No alternative available, use generic approach
    return this.handleAdaptationFailure(error, context, options);
  }

  private async handleMissingCapability(
    error: AgentError,
    context: AgentRecoveryContext,
    options: ErrorHandlingOptions,
  ): Promise<Result<RecoveryResult<AgentRecoveryContext>, SystemError>> {
    if (!options.enableFallback) {
      return failure(error);
    }

    // Simplify the prompt to work without the missing capability
    const simplifiedContent = this.simplifyPromptForCapabilities(
      context.promptContent || '',
      context.requiredCapabilities || [],
      this.agentCapabilities[context.targetAgent || 'generic'] || [],
    );

    const recoveryResult: RecoveryResult<AgentRecoveryContext> = {
      success: true,
      value: {
        ...context,
        promptContent: simplifiedContent,
      },
      fallbackUsed: true,
      recoveryStrategy: 'capability-simplification',
      warnings: ['Required capability missing, prompt simplified', 'Some advanced features may not be available'],
    };

    return success(recoveryResult);
  }

  private findFallbackAgent(
    requiredCapabilities: AgentSpecialization[],
    availableAgents: AgentType[],
  ): AgentType | null {
    // Score each available agent based on capability match
    let bestAgent: AgentType | null = null;
    let bestScore = 0;

    for (const agent of availableAgents) {
      const agentCapabilities = this.agentCapabilities[agent] || [];
      const score = requiredCapabilities.filter((cap) => agentCapabilities.includes(cap)).length;

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  private findAlternativeAgent(targetAgent?: AgentType, availableAgents: AgentType[] = []): AgentType | null {
    // Remove the target agent from available options
    const alternatives = availableAgents.filter((agent) => agent !== targetAgent);

    if (alternatives.length === 0) {
      return null;
    }

    // Prefer agents with similar capabilities
    if (targetAgent) {
      const targetCapabilities = this.agentCapabilities[targetAgent] || [];
      return this.findFallbackAgent(targetCapabilities, alternatives);
    }

    // Return the first available alternative
    return alternatives[0];
  }

  private adaptForAgent(content: string, agent: AgentType): string {
    const capabilities = this.agentCapabilities[agent] || [];

    if (capabilities.includes('conversation')) {
      return this.genericAdaptations.conversational(content);
    }

    if (capabilities.includes('technical')) {
      return this.genericAdaptations.technical(content);
    }

    if (capabilities.includes('coordination')) {
      return this.genericAdaptations.coordination(content);
    }

    return this.genericAdaptations.fallback(content);
  }

  private simplifyPromptForCapabilities(
    content: string,
    requiredCapabilities: AgentSpecialization[],
    availableCapabilities: AgentSpecialization[],
  ): string {
    // Remove requirements for missing capabilities
    let simplifiedContent = content;

    const missingCapabilities = requiredCapabilities.filter((cap) => !availableCapabilities.includes(cap));

    // Apply simplifications based on missing capabilities
    for (const missingCap of missingCapabilities) {
      switch (missingCap) {
        case 'technical':
          simplifiedContent = simplifiedContent.replace(/analyze.*code/gi, 'review');
          break;
        case 'coordination':
          simplifiedContent = simplifiedContent.replace(/technical.*details/gi, 'information');
          simplifiedContent = simplifiedContent.replace(/coordinate.*with/gi, 'work with');
          break;
        // Add more capability-specific simplifications as needed
      }
    }

    return simplifiedContent;
  }
}
