// Prompt Manager Service - Central orchestrator for comprehensive prompt management

import type {
  IPromptManager,
  IIdentityResolver,
  IContextAnalyzer,
  IRulesIntegrationEngine,
  IPromptGenerator,
  IVersionHandler,
  IAgentAdaptationInterface,
} from '../config/di-container';
import type { UserIdentity } from '../models/identity';
import type { ProjectContext } from '../models/context';
import type {
  GeneratedPrompt,
  PromptUpdates,
  BasePrompt,
  PersonalizedPrompt as _PersonalizedPrompt,
  PromptMetadata,
  PromptUsageStats,
} from '../models/prompt';
import type { PromptTemplate, TemplateVariables } from '../models/template';
import type { PromptVersion as _PromptVersion, VersionHistory as _VersionHistory } from '../models/version';
import type { AgentType } from '../models/agent';

// Optimization criteria interface
export interface OptimizationCriteria {
  targetIdentity?: UserIdentity['type'];
  performanceThreshold?: number;
  usageThreshold?: number;
  timeRange?: { start: Date; end: Date };
  includeVersionAnalysis?: boolean;
  includeAgentOptimization?: boolean;
}

// Optimization results interface
export interface OptimizationResults {
  optimized: number;
  suggestions: PromptOptimizationSuggestion[];
  performanceImprovements: PerformanceImprovement[];
  versionRecommendations: VersionRecommendation[];
  agentRecommendations: AgentRecommendation[];
}

export interface PromptOptimizationSuggestion {
  type: 'content' | 'structure' | 'personalization' | 'rules' | 'agent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: string;
  implementation: string;
}

export interface PerformanceImprovement {
  promptId: string;
  currentPerformance: number;
  expectedPerformance: number;
  improvements: string[];
}

export interface VersionRecommendation {
  promptId: string;
  currentVersion: string;
  recommendedVersion: string;
  reason: string;
}

export interface AgentRecommendation {
  promptId: string;
  currentAgent?: AgentType;
  recommendedAgent: AgentType;
  reason: string;
  expectedImprovement: string;
}

// Prompt lifecycle management interface
export interface PromptLifecycleManager {
  createPrompt(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt>;
  updatePrompt(promptId: string, updates: PromptUpdates): Promise<GeneratedPrompt>;
  deletePrompt(promptId: string): Promise<boolean>;
  archivePrompt(promptId: string): Promise<boolean>;
  restorePrompt(promptId: string): Promise<GeneratedPrompt>;
}

// Prompt analytics interface
export interface PromptAnalytics {
  getUsageStatistics(promptId: string): Promise<PromptUsageStats>;
  getPerformanceMetrics(promptId: string): Promise<PromptManagerPerformanceMetrics>;
  getOptimizationInsights(promptId: string): Promise<OptimizationInsights>;
}

export interface PromptManagerPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  userSatisfaction: number;
  errorRate: number;
  usageFrequency: number;
}

export interface OptimizationInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  potentialImprovements: string[];
}

/**
 * Central orchestrator for comprehensive prompt management
 * Coordinates all prompt-related services and provides unified interface
 * Requirements: All requirements integration
 */
export class PromptManager implements IPromptManager, PromptLifecycleManager, PromptAnalytics {
  private promptStore = new Map<string, GeneratedPrompt>();
  private promptCache = new Map<string, { prompt: GeneratedPrompt; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private identityResolver: IIdentityResolver,
    private contextAnalyzer: IContextAnalyzer,
    private rulesEngine: IRulesIntegrationEngine,
    private promptGenerator: IPromptGenerator,
    private versionHandler: IVersionHandler,
    private agentAdapter: IAgentAdaptationInterface,
  ) {}

  /**
   * Core prompt generation with full orchestration
   * Requirements: All requirements integration
   */
  async generatePrompt(identity: unknown, context: unknown): Promise<unknown> {
    const userIdentity = identity as UserIdentity;
    const projectContext = context as ProjectContext;

    try {
      // Step 1: Validate identity and context
      await this.validateInputs(userIdentity, projectContext);

      // Step 2: Enrich context with current state
      const enrichedContext = await this.contextAnalyzer.enrichContext(projectContext);

      // Step 3: Create default template for backward compatibility
      const defaultTemplate: PromptTemplate = {
        id: `default-${userIdentity.type.toLowerCase()}`,
        name: `Default ${userIdentity.type} Template`,
        description: `Default template for ${userIdentity.type} identity`,
        category: 'general',
        template: this.getDefaultTemplateContent(userIdentity.type),
        variables: [],
        identities: [userIdentity.type],
        constraints: [],
        version: '1.0.0',
        isPublic: false,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
      };

      // Step 4: Generate comprehensive prompt
      const generatedPrompt = await this.createPrompt(defaultTemplate, {}, userIdentity, enrichedContext);

      // Step 5: Cache the result
      this.cachePrompt(generatedPrompt);

      return generatedPrompt;
    } catch (error) {
      throw new Error(`Prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        cause: error,
      });
    }
  }

  /**
   * Comprehensive prompt creation with full service orchestration
   */
  async createPrompt(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt> {
    // Step 1: Generate base prompt using prompt generator
    let basePrompt: GeneratedPrompt;
    const comprehensivePrompt = await this.promptGenerator.generateComprehensivePrompt(
      template,
      variables,
      identity,
      context,
    );

    if (comprehensivePrompt && typeof comprehensivePrompt === 'object' && 'id' in comprehensivePrompt) {
      basePrompt = comprehensivePrompt as GeneratedPrompt;
    } else {
      basePrompt = await this.generateFallbackPrompt(template, variables, identity, context);
    }

    // Step 2: Apply rules and constraints
    const enrichedPrompt = await this.rulesEngine.applyRules(basePrompt as unknown as BasePrompt, context);

    // Step 3: Create version
    const version = await this.versionHandler.createVersion(
      (basePrompt as GeneratedPrompt).id,
      enrichedPrompt.content,
      {
        changeReason: 'Initial creation',
        performanceMetrics: {
          responseTime: 0,
          successRate: 1.0,
          errorRate: 0,
          userSatisfaction: 0,
          usageFrequency: 0,
        },
      },
    );

    // Step 4: Create final generated prompt
    const generatedPrompt: GeneratedPrompt = {
      ...(basePrompt as GeneratedPrompt),
      content: enrichedPrompt.content,
      version: version.version,
      appliedRules: enrichedPrompt.appliedRules || [],
      identity,
      context,
    };

    // Step 5: Store prompt
    this.promptStore.set(generatedPrompt.id, generatedPrompt);

    return generatedPrompt;
  }

  /**
   * Update existing prompt with new content or metadata
   */
  async updatePrompt(promptId: string, updates: PromptUpdates): Promise<GeneratedPrompt> {
    const promptUpdates = updates;
    const existingPrompt = this.promptStore.get(promptId);

    if (!existingPrompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    // Create updated prompt
    const updatedPrompt: GeneratedPrompt = {
      ...existingPrompt,
      content: promptUpdates.content || existingPrompt.content,
      metadata: {
        ...existingPrompt.metadata,
        ...promptUpdates.metadata,
        updatedAt: new Date(),
      },
    };

    // Create new version if content changed
    if (promptUpdates.content && promptUpdates.content !== existingPrompt.content) {
      const version = await this.versionHandler.createVersion(promptId, promptUpdates.content, {
        changeReason: 'Content update',
        performanceMetrics: await this.calculatePerformanceMetrics(promptId),
      });
      updatedPrompt.version = version.version;
    }

    // Update store and clear cache
    this.promptStore.set(promptId, updatedPrompt);
    this.clearPromptCache(promptId);

    return updatedPrompt;
  }

  /**
   * Enhanced update method that returns the updated prompt
   */
  async updatePromptEnhanced(promptId: string, updates: PromptUpdates): Promise<GeneratedPrompt> {
    await this.updatePrompt(promptId, updates);
    const updatedPrompt = this.promptStore.get(promptId);
    if (!updatedPrompt) {
      throw new Error(`Failed to retrieve updated prompt ${promptId}`);
    }
    return updatedPrompt;
  }

  /**
   * Get version history for a prompt
   */
  async getPromptHistory(promptId: string): Promise<unknown[]> {
    try {
      const history = await this.versionHandler.getVersionHistory(promptId);
      return history.versions;
    } catch (_error) {
      // Return empty array if no history found
      return [];
    }
  }

  /**
   * Comprehensive prompt optimization based on usage patterns and analytics
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async optimizePrompts(criteria: unknown): Promise<unknown> {
    const optimizationCriteria = criteria as OptimizationCriteria;
    const results: OptimizationResults = {
      optimized: 0,
      suggestions: [],
      performanceImprovements: [],
      versionRecommendations: [],
      agentRecommendations: [],
    };

    try {
      // Get all prompts for optimization
      const promptsToOptimize = await this.getPromptsForOptimization(optimizationCriteria);

      for (const prompt of promptsToOptimize) {
        // Analyze current performance
        const currentMetrics = await this.getPerformanceMetrics(prompt.id);

        // Generate optimization suggestions
        const suggestions = await this.generateOptimizationSuggestions(prompt, currentMetrics);
        results.suggestions.push(...suggestions);

        // Analyze version performance
        if (optimizationCriteria.includeVersionAnalysis) {
          const versionRecommendation = await this.analyzeVersionPerformance(prompt.id);
          if (versionRecommendation) {
            results.versionRecommendations.push(versionRecommendation);
          }
        }

        // Analyze agent compatibility
        if (optimizationCriteria.includeAgentOptimization) {
          const agentRecommendation = await this.analyzeAgentOptimization(prompt);
          if (agentRecommendation) {
            results.agentRecommendations.push(agentRecommendation);
          }
        }

        // Apply automatic optimizations if criteria met
        if (await this.shouldAutoOptimize(prompt, currentMetrics, optimizationCriteria)) {
          await this.applyAutomaticOptimizations(prompt, suggestions);
          results.optimized++;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        cause: error,
      });
    }
  }

  /**
   * Delete a prompt and its associated data
   */
  async deletePrompt(promptId: string): Promise<boolean> {
    const prompt = this.promptStore.get(promptId);
    if (!prompt) {
      return false;
    }

    // Remove from store and cache
    this.promptStore.delete(promptId);
    this.clearPromptCache(promptId);

    return true;
  }

  /**
   * Archive a prompt (mark as inactive but keep data)
   */
  async archivePrompt(promptId: string): Promise<boolean> {
    const prompt = this.promptStore.get(promptId);
    if (!prompt) {
      return false;
    }

    // Update metadata to mark as archived
    prompt.metadata.tags = [...prompt.metadata.tags, 'archived'];
    prompt.metadata.updatedAt = new Date();

    this.promptStore.set(promptId, prompt);
    this.clearPromptCache(promptId);

    return true;
  }

  /**
   * Restore an archived prompt
   */
  async restorePrompt(promptId: string): Promise<GeneratedPrompt> {
    const prompt = this.promptStore.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    // Remove archived tag
    prompt.metadata.tags = prompt.metadata.tags.filter((tag) => tag !== 'archived');
    prompt.metadata.updatedAt = new Date();

    this.promptStore.set(promptId, prompt);
    this.clearPromptCache(promptId);

    return prompt;
  }

  /**
   * Get usage statistics for a prompt
   */
  async getUsageStatistics(promptId: string): Promise<PromptUsageStats> {
    const prompt = this.promptStore.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    return prompt.metadata.usage;
  }

  /**
   * Get performance metrics for a prompt
   */
  async getPerformanceMetrics(promptId: string): Promise<PromptManagerPerformanceMetrics> {
    try {
      const prompt = this.promptStore.get(promptId);
      if (!prompt) {
        throw new Error(`Prompt ${promptId} not found`);
      }

      // Get metrics from version handler
      const versionMetrics = await this.versionHandler.getVersionMetrics(promptId, prompt.version);

      return {
        averageResponseTime: versionMetrics.responseTime,
        successRate: versionMetrics.successRate,
        userSatisfaction: versionMetrics.userSatisfaction,
        errorRate: versionMetrics.errorRate,
        usageFrequency: versionMetrics.usageFrequency,
      };
    } catch (_error) {
      // Return default metrics if not found
      return {
        averageResponseTime: 0,
        successRate: 0,
        userSatisfaction: 0,
        errorRate: 0,
        usageFrequency: 0,
      };
    }
  }

  /**
   * Get optimization insights for a prompt
   */
  async getOptimizationInsights(promptId: string): Promise<OptimizationInsights> {
    const prompt = this.promptStore.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt ${promptId} not found`);
    }

    const metrics = await this.getPerformanceMetrics(promptId);

    const insights: OptimizationInsights = {
      strengths: [],
      weaknesses: [],
      recommendations: [],
      potentialImprovements: [],
    };

    // Analyze strengths
    if (metrics.successRate > 0.8) {
      insights.strengths.push('High success rate indicates effective prompt structure');
    }
    if (metrics.userSatisfaction > 4.0) {
      insights.strengths.push('High user satisfaction shows good content quality');
    }
    if (metrics.averageResponseTime < 2000) {
      insights.strengths.push('Fast response time indicates efficient processing');
    }

    // Analyze weaknesses
    if (metrics.successRate < 0.6) {
      insights.weaknesses.push('Low success rate suggests prompt clarity issues');
    }
    if (metrics.errorRate > 0.2) {
      insights.weaknesses.push('High error rate indicates potential structural problems');
    }
    if (metrics.usageFrequency < 0.1) {
      insights.weaknesses.push('Low usage frequency suggests limited utility');
    }

    // Generate recommendations
    if (metrics.successRate < 0.7) {
      insights.recommendations.push('Consider simplifying prompt language and structure');
    }
    if (metrics.userSatisfaction < 3.5) {
      insights.recommendations.push('Review content relevance and add more context');
    }
    if (metrics.averageResponseTime > 5000) {
      insights.recommendations.push('Optimize prompt length and complexity');
    }

    // Identify potential improvements
    insights.potentialImprovements.push('A/B test different prompt variations');
    insights.potentialImprovements.push('Analyze user feedback for content improvements');
    insights.potentialImprovements.push('Consider agent-specific optimizations');

    return insights;
  }

  // Private helper methods

  private async validateInputs(identity: UserIdentity, context: ProjectContext): Promise<void> {
    // Validate identity
    if (!identity || !identity.type) {
      throw new Error('Valid identity is required');
    }

    // Validate context
    if (!context || !context.workFolder) {
      throw new Error('Valid project context is required');
    }

    // Validate identity permissions
    const hasPermission = await this.identityResolver.validateIdentityPermissions(identity, 'generate_prompt');
    if (!hasPermission) {
      throw new Error(`Identity ${identity.type} does not have permission to generate prompts`);
    }
  }

  private getDefaultTemplateContent(identityType: UserIdentity['type']): string {
    const baseContent =
      "Vous êtes un assistant IA spécialisé. Aidez l'utilisateur avec sa demande en fournissant des réponses précises et utiles.";

    switch (identityType) {
      case 'User':
        return `${baseContent} Privilégiez la simplicité et la clarté dans vos explications.`;
      case 'Superviseur':
        return `${baseContent} Incluez des suggestions d'amélioration et des alternatives dans vos réponses.`;
      case 'Responsable':
        return `${baseContent} Fournissez une analyse d'impact et des considérations de qualité dans vos réponses.`;
      default:
        return baseContent;
    }
  }

  private async generateFallbackPrompt(
    template: PromptTemplate,
    _variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt> {
    // Fallback implementation when comprehensive generation is not available
    const metadata: PromptMetadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      author: identity.type,
      tags: [template.category, identity.type],
      usage: {
        totalUses: 0,
        successRate: 1.0,
        averageResponseTime: 0,
        lastUsed: new Date(),
      },
    };

    return {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      identity,
      content: template.template,
      metadata,
      version: '1.0.0',
      context,
      appliedRules: [],
    };
  }

  private cachePrompt(prompt: GeneratedPrompt): void {
    this.promptCache.set(prompt.id, {
      prompt,
      timestamp: Date.now(),
    });

    // Clean expired cache entries
    this.cleanExpiredCache();
  }

  private clearPromptCache(promptId: string): void {
    this.promptCache.delete(promptId);
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [id, entry] of this.promptCache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        this.promptCache.delete(id);
      }
    }
  }

  private async calculatePerformanceMetrics(promptId: string): Promise<import('../models/version').PerformanceMetrics> {
    try {
      const prompt = this.promptStore.get(promptId);
      if (!prompt) {
        throw new Error(`Prompt ${promptId} not found`);
      }

      return {
        responseTime: prompt.metadata.usage.averageResponseTime,
        successRate: prompt.metadata.usage.successRate,
        errorRate: 1 - prompt.metadata.usage.successRate,
        userSatisfaction: 0, // Would be calculated from feedback
        usageFrequency: prompt.metadata.usage.totalUses,
      };
    } catch {
      return {
        responseTime: 0,
        successRate: 0,
        errorRate: 0,
        userSatisfaction: 0,
        usageFrequency: 0,
      };
    }
  }

  private async getPromptsForOptimization(criteria: OptimizationCriteria): Promise<GeneratedPrompt[]> {
    const allPrompts = Array.from(this.promptStore.values());

    return allPrompts.filter((prompt) => {
      // Filter by identity type if specified
      if (criteria.targetIdentity && prompt.identity.type !== criteria.targetIdentity) {
        return false;
      }

      // Filter by performance threshold
      if (criteria.performanceThreshold) {
        const successRate = prompt.metadata.usage.successRate;
        if (successRate >= criteria.performanceThreshold) {
          return false;
        }
      }

      // Filter by usage threshold
      if (criteria.usageThreshold) {
        const totalUses = prompt.metadata.usage.totalUses;
        if (totalUses < criteria.usageThreshold) {
          return false;
        }
      }

      // Filter by time range
      if (criteria.timeRange) {
        const createdAt = prompt.metadata.createdAt;
        if (createdAt < criteria.timeRange.start || createdAt > criteria.timeRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  private async generateOptimizationSuggestions(
    prompt: GeneratedPrompt,
    metrics: PromptManagerPerformanceMetrics,
  ): Promise<PromptOptimizationSuggestion[]> {
    const suggestions: PromptOptimizationSuggestion[] = [];

    // Content optimization suggestions
    if (metrics.successRate < 0.7) {
      suggestions.push({
        type: 'content',
        priority: 'high',
        description: 'Low success rate indicates content clarity issues',
        expectedImpact: 'Improved user understanding and task completion',
        implementation: 'Simplify language, add examples, improve structure',
      });
    }

    // Performance optimization suggestions
    if (metrics.averageResponseTime > 5000) {
      suggestions.push({
        type: 'structure',
        priority: 'medium',
        description: 'High response time suggests prompt complexity',
        expectedImpact: 'Faster processing and better user experience',
        implementation: 'Reduce prompt length, simplify instructions',
      });
    }

    // Personalization suggestions
    if (metrics.userSatisfaction < 3.5) {
      suggestions.push({
        type: 'personalization',
        priority: 'medium',
        description: 'Low satisfaction suggests need for better personalization',
        expectedImpact: 'More relevant and engaging responses',
        implementation: 'Add identity-specific adaptations, improve context awareness',
      });
    }

    // Agent optimization suggestions
    const bestAgent = this.agentAdapter.detectBestAgent?.(prompt);
    if (bestAgent && bestAgent !== 'generic') {
      suggestions.push({
        type: 'agent',
        priority: 'low',
        description: `Prompt could benefit from ${bestAgent} agent optimization`,
        expectedImpact: 'Better agent-specific performance',
        implementation: `Adapt prompt for ${bestAgent} agent capabilities`,
      });
    }

    return suggestions;
  }

  private async analyzeVersionPerformance(promptId: string): Promise<VersionRecommendation | null> {
    try {
      const analytics = await this.versionHandler.getVersionAnalytics(promptId);

      if (analytics.mostUsedVersion !== analytics.activeVersion) {
        return {
          promptId,
          currentVersion: analytics.activeVersion,
          recommendedVersion: analytics.mostUsedVersion,
          reason: 'Most used version has better performance metrics',
        };
      }
    } catch {
      // Ignore errors and return null
    }

    return null;
  }

  private async analyzeAgentOptimization(prompt: GeneratedPrompt): Promise<AgentRecommendation | null> {
    try {
      const bestAgent = this.agentAdapter.detectBestAgent?.(prompt);

      if (bestAgent && bestAgent !== 'generic') {
        return {
          promptId: prompt.id,
          recommendedAgent: bestAgent as AgentType,
          reason: `Agent ${bestAgent} is better suited for this prompt type and identity`,
          expectedImprovement: 'Better response quality and performance',
        };
      }
    } catch {
      // Ignore errors and return null
    }

    return null;
  }

  private async shouldAutoOptimize(
    prompt: GeneratedPrompt,
    metrics: PromptManagerPerformanceMetrics,
    criteria: OptimizationCriteria,
  ): Promise<boolean> {
    // Auto-optimize if performance is below threshold and usage is high enough
    const performanceThreshold = criteria.performanceThreshold || 0.6;
    const usageThreshold = criteria.usageThreshold || 10;

    return metrics.successRate < performanceThreshold && prompt.metadata.usage.totalUses >= usageThreshold;
  }

  private async applyAutomaticOptimizations(
    prompt: GeneratedPrompt,
    suggestions: PromptOptimizationSuggestion[],
  ): Promise<void> {
    // Apply high-priority suggestions automatically
    const highPrioritySuggestions = suggestions.filter((s) => s.priority === 'high');

    for (const suggestion of highPrioritySuggestions) {
      if (suggestion.type === 'content') {
        // Apply content optimizations
        await this.applyContentOptimization(prompt, suggestion);
      }
    }
  }

  private async applyContentOptimization(
    prompt: GeneratedPrompt,
    _suggestion: PromptOptimizationSuggestion,
  ): Promise<void> {
    // Simple content optimization - in practice this would be more sophisticated
    let optimizedContent = prompt.content;

    // Simplify complex sentences
    optimizedContent = optimizedContent.replace(/\b(utilize|leverage)\b/gi, 'use');
    optimizedContent = optimizedContent.replace(/\b(implement)\b/gi, 'create');

    // Update the prompt if content changed
    if (optimizedContent !== prompt.content) {
      await this.updatePrompt(prompt.id, { content: optimizedContent });
    }
  }
}
