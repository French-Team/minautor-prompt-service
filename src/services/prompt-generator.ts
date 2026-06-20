// Enhanced Prompt Generator Service - Template Method Pattern Implementation

import type { IPromptGenerator, IIdentityResolver, IRulesIntegrationEngine } from '../config/di-container';
import type { PromptTemplate, TemplateVariables, CompiledTemplate } from '../models/template';
import type {
  GeneratedPrompt,
  BasePrompt,
  PersonalizedPrompt,
  PersonalizationRule,
  PromptMetadata,
  PromptUsageMetrics,
  PersonalizationOptimization,
  PersonalizationOptimizationResult,
} from '../models/prompt';
import type {
  UserIdentity,
  IdentityProfile,
  UserProfile,
  ResponsableProfile,
  SuperviseurProfile,
  IdentityPreferences,
  PromptCustomization,
} from '../models/identity';
import type { ProjectContext } from '../models/context';
import type { AgentType } from '../models/agent';
import { TemplateValidator as TemplateValidatorClass } from '../models/template';

// Template Method Pattern - Abstract base for prompt generation
abstract class PromptGenerationTemplate {
  // Template method defining the algorithm structure
  async generatePrompt(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt> {
    // Step 1: Validate inputs
    await this.validateInputs(template, variables, identity);

    // Step 2: Prepare generation context
    const generationContext = await this.prepareGenerationContext(template, variables, identity, context);

    // Step 3: Apply identity-specific adaptations
    const adaptedTemplate = await this.applyIdentityAdaptations(template, identity, generationContext);

    // Step 4: Compile template with variables
    const compiledTemplate = await this.compileTemplate(adaptedTemplate, variables);

    // Step 5: Apply rules and constraints
    const enrichedPrompt = await this.applyRulesAndConstraints(compiledTemplate, context, identity);

    // Step 6: Finalize prompt
    return this.finalizePrompt(enrichedPrompt, template, identity, context);
  }

  // Abstract methods to be implemented by concrete classes
  protected abstract validateInputs(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
  ): Promise<void>;
  protected abstract prepareGenerationContext(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<Record<string, unknown>>;
  protected abstract applyIdentityAdaptations(
    template: PromptTemplate,
    identity: UserIdentity,
    context: Record<string, unknown>,
  ): Promise<PromptTemplate>;
  protected abstract compileTemplate(template: PromptTemplate, variables: TemplateVariables): Promise<CompiledTemplate>;
  protected abstract applyRulesAndConstraints(
    compiledTemplate: CompiledTemplate,
    context: ProjectContext,
    identity: UserIdentity,
  ): Promise<BasePrompt>;
  protected abstract finalizePrompt(
    prompt: BasePrompt,
    template: PromptTemplate,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt>;
}

// Concrete implementation of the template method
class StandardPromptGenerator extends PromptGenerationTemplate {
  constructor(
    private identityResolver: IIdentityResolver,
    private rulesEngine: IRulesIntegrationEngine,
  ) {
    super();
  }

  getIdentityResolver(): IIdentityResolver {
    return this.identityResolver;
  }

  protected async validateInputs(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
  ): Promise<void> {
    // Validate template structure
    const templateValidation = TemplateValidatorClass.validatePromptTemplate(template);
    if (!templateValidation.isValid) {
      throw new Error(`Template validation failed: ${templateValidation.errors.map((e) => e.message).join(', ')}`);
    }

    // Validate variables against template
    const variablesValidation = TemplateValidatorClass.validateTemplateVariables(variables, template);
    if (!variablesValidation.isValid) {
      throw new Error(`Variables validation failed: ${variablesValidation.errors.map((e) => e.message).join(', ')}`);
    }

    // Validate identity permissions for template usage
    const canUseTemplate = await this.identityResolver.validateIdentityPermissions(identity, 'use_template');
    if (!canUseTemplate) {
      throw new Error(`Identity ${identity.type} does not have permission to use templates`);
    }

    // Check if identity is compatible with template
    if (!template.identities.includes(identity.type)) {
      throw new Error(`Template ${template.name} is not compatible with identity type ${identity.type}`);
    }
  }

  protected async prepareGenerationContext(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<Record<string, unknown>> {
    const identityProfile = await this.identityResolver.getIdentityCharacteristics(identity);

    return {
      template,
      variables,
      identity,
      identityProfile,
      projectContext: context,
      generationTimestamp: new Date(),
      templateCategory: template.category,
      requiredCapabilities: this.extractRequiredCapabilities(template),
    };
  }

  protected async applyIdentityAdaptations(
    template: PromptTemplate,
    identity: UserIdentity,
    context: Record<string, unknown>,
  ): Promise<PromptTemplate> {
    const identityProfile = context.identityProfile as IdentityProfile;
    const adaptedTemplate = { ...template };

    // Apply identity-specific template modifications
    switch (identity.type) {
      case 'User':
        adaptedTemplate.template = this.adaptForUser(template.template, identityProfile as UserProfile);
        break;
      case 'Superviseur':
        adaptedTemplate.template = this.adaptForSuperviseur(template.template, identityProfile as SuperviseurProfile);
        break;
      case 'Responsable':
        adaptedTemplate.template = this.adaptForResponsable(template.template, identityProfile as ResponsableProfile);
        break;
    }

    // Apply user preferences
    adaptedTemplate.template = this.applyPreferencesToTemplate(adaptedTemplate.template, identity.preferences);

    return adaptedTemplate;
  }

  protected async compileTemplate(template: PromptTemplate, variables: TemplateVariables): Promise<CompiledTemplate> {
    let compiledContent = template.template;

    // Replace template variables with actual values
    for (const templateVar of template.variables) {
      const value = variables[templateVar.name] ?? templateVar.defaultValue;
      const placeholder = new RegExp(`\\{\\{\\s*${templateVar.name}\\s*\\}\\}`, 'g');

      if (value !== undefined) {
        compiledContent = compiledContent.replace(placeholder, String(value));
      }
    }

    // Check for unresolved variables
    const unresolvedVars = compiledContent.match(/\{\{\s*[^}]+\s*\}\}/g);
    if (unresolvedVars) {
      throw new Error(`Unresolved template variables: ${unresolvedVars.join(', ')}`);
    }

    return {
      templateId: template.id,
      content: compiledContent,
      resolvedVariables: variables,
      compiledAt: new Date(),
    };
  }

  protected async applyRulesAndConstraints(
    compiledTemplate: CompiledTemplate,
    context: ProjectContext,
    identity: UserIdentity,
  ): Promise<BasePrompt> {
    const basePrompt: BasePrompt = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Generated from ${compiledTemplate.templateId}`,
      description: `Prompt generated from template ${compiledTemplate.templateId}`,
      content: compiledTemplate.content,
      identities: [identity.type],
      isActive: true,
    };

    // Apply rules through the rules engine
    const enrichedPrompt = await this.rulesEngine.applyRules(basePrompt, context);

    return enrichedPrompt;
  }

  protected async finalizePrompt(
    prompt: BasePrompt,
    template: PromptTemplate,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt> {
    const metadata: PromptMetadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      author: identity.type,
      tags: [template.category, identity.type, ...this.extractContextTags(context)],
      usage: {
        totalUses: 0,
        successRate: 1.0,
        averageResponseTime: 0,
        lastUsed: new Date(),
      },
    };

    const generatedPrompt: GeneratedPrompt = {
      id: prompt.id,
      identity,
      content: prompt.content,
      metadata,
      version: '1.0.0',
      context,
      appliedRules: [],
    };

    return generatedPrompt;
  }

  // Identity-specific adaptation methods
  private adaptForUser(template: string, _profile: UserProfile): string {
    let adapted = template;

    // Simplify language for User identity
    adapted = adapted.replace(/\b(optimize|enhancement|sophisticated)\b/gi, (match) => {
      const replacements: Record<string, string> = {
        optimize: 'améliorer',
        enhancement: 'amélioration',
        sophisticated: 'avancé',
      };
      return replacements[match.toLowerCase()] || match;
    });

    // Add clarity instructions
    if (!adapted.includes('soyez clair') && !adapted.includes('réponse simple')) {
      adapted = `${adapted}\n\nInstructions: Fournissez une réponse claire et simple, évitez le jargon technique complexe.`;
    }

    return adapted;
  }

  private adaptForSuperviseur(template: string, profile: SuperviseurProfile): string {
    let adapted = template;

    // Add optimization focus
    if (!adapted.includes('optimisation') && !adapted.includes('amélioration')) {
      adapted = `${adapted}\n\nFocus: Analysez les opportunités d'optimisation et proposez des améliorations.`;
    }

    // Add alternative suggestions instruction
    if (!adapted.includes('alternatives')) {
      adapted = `${adapted}\n\nSuggestions: Proposez ${profile.alternativeCount || 3} alternatives ou approches différentes.`;
    }

    return adapted;
  }

  private adaptForResponsable(template: string, _profile: ResponsableProfile): string {
    let adapted = template;

    // Add quality control instructions
    if (!adapted.includes('qualité') && !adapted.includes('validation')) {
      adapted = `${adapted}\n\nContrôle qualité: Incluez une analyse d'impact et des vérifications de cohérence.`;
    }

    // Add risk assessment instruction - always add for Responsable
    if (!adapted.includes('risque')) {
      adapted = `${adapted}\n\nÉvaluation: Identifiez les risques potentiels et demandez confirmation pour les changements importants.`;
    }

    return adapted;
  }

  private applyPreferencesToTemplate(template: string, preferences: IdentityPreferences): string {
    let adapted = template;

    // Apply response style preferences
    switch (preferences.responseStyle) {
      case 'concise':
        adapted = `${adapted}\n\nStyle: Réponse concise et directe.`;
        break;
      case 'detailed':
        adapted = `${adapted}\n\nStyle: Réponse détaillée avec explications complètes.`;
        break;
    }

    // Apply technical level preferences
    switch (preferences.technicalLevel) {
      case 'basic':
        adapted = adapted.replace(/\b(implementation|architecture|framework)\b/gi, (match) => {
          const replacements: Record<string, string> = {
            implementation: 'mise en place',
            architecture: 'structure',
            framework: 'outil',
          };
          return replacements[match.toLowerCase()] || match;
        });
        break;
      case 'advanced':
        adapted = `${adapted}\n\nNiveau technique: Utilisez la terminologie technique appropriée et incluez les détails d'implémentation.`;
        break;
    }

    return adapted;
  }

  private extractRequiredCapabilities(template: PromptTemplate): string[] {
    const capabilities: string[] = [];

    // Extract capabilities based on template category
    switch (template.category) {
      case 'technical':
        capabilities.push('technical_analysis', 'code_generation');
        break;
      case 'management':
        capabilities.push('project_coordination', 'planning');
        break;
      case 'quality':
        capabilities.push('quality_validation', 'testing');
        break;
      case 'refactoring':
        capabilities.push('code_quality_improvement', 'clean_code_suggestions');
        break;
      case 'performance':
        capabilities.push('performance_analysis', 'profiling_suggestions');
        break;
      case 'general':
        capabilities.push('basic_analysis', 'general_purpose_response');
        break;
      case 'architecture':
        capabilities.push('architecture_design', 'system_modeling');
        break;
      case 'security':
        capabilities.push('security_audit', 'vulnerability_analysis');
        break;
      case 'documentation':
        capabilities.push('technical_writing', 'knowledge_synthesis');
        break;
      case 'devops':
        capabilities.push('pipeline_automation', 'infrastructure_scripting');
        break;
    }

    return capabilities;
  }

  private extractContextTags(context: ProjectContext): string[] {
    const tags: string[] = [];

    if (context.workFolder?.name) {
      tags.push(`project:${context.workFolder.name}`);
    }

    if (context.technicalEcosystem?.language) {
      tags.push(`lang:${context.technicalEcosystem.language}`);
    }

    if (context.activeFlows && context.activeFlows.length > 0) {
      tags.push(`flows:${context.activeFlows.length}`);
    }

    return tags;
  }
}

// Main PromptGenerator service implementation
export class PromptGenerator implements IPromptGenerator {
  private standardGenerator: StandardPromptGenerator;
  private generationCache = new Map<string, GeneratedPrompt>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(identityResolver?: IIdentityResolver, rulesEngine?: IRulesIntegrationEngine) {
    // Use provided dependencies or create mock implementations for testing
    this.standardGenerator = new StandardPromptGenerator(
      identityResolver || this.createMockIdentityResolver(),
      rulesEngine || this.createMockRulesEngine(),
    );
  }

  async generateFromTemplate(template: unknown, variables: unknown): Promise<unknown> {
    const promptTemplate = template as PromptTemplate;
    const templateVariables = variables as TemplateVariables;

    // Create default context for backward compatibility
    const defaultIdentity: UserIdentity = {
      type: 'User',
      permissions: [],
      preferences: {
        language: 'fr',
        responseStyle: 'balanced',
        technicalLevel: 'intermediate',
      },
      customizations: [],
    };

    const defaultContext: ProjectContext = {
      workFolder: {
        name: 'default',
        path: '/',
        type: 'project',
        technologies: [],
        lastModified: new Date(),
      },
      activeFlows: [],
      availableTools: [],
      projectState: {
        phase: 'development',
        completionPercentage: 0,
        activeFeatures: [],
        blockers: [],
      },
      technicalEcosystem: {
        framework: 'nuxt',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: [],
      },
    };

    // Generate cache key
    const cacheKey = this.generateCacheKey(promptTemplate, templateVariables, defaultIdentity);

    // Check cache first
    const cached = this.generationCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Generate new prompt
    const generatedPrompt = await this.standardGenerator.generatePrompt(
      promptTemplate,
      templateVariables,
      defaultIdentity,
      defaultContext,
    );

    // Cache the result
    this.generationCache.set(cacheKey, generatedPrompt);

    return generatedPrompt;
  }

  async adaptForAgent(prompt: unknown, agentType: string): Promise<unknown> {
    const generatedPrompt = prompt as GeneratedPrompt;
    const agentTypeEnum = agentType as AgentType;

    // Apply agent-specific adaptations
    const adaptedContent = this.applyAgentAdaptations(generatedPrompt.content, agentTypeEnum);

    return {
      ...generatedPrompt,
      content: adaptedContent,
      adaptedFor: agentType,
      adaptations: this.getAgentAdaptations(agentTypeEnum),
    };
  }

  async applyPersonalization(prompt: unknown, preferences: unknown): Promise<unknown> {
    const generatedPrompt = prompt as GeneratedPrompt;
    const userPreferences = preferences as Record<string, unknown>;

    // Create personalization rules based on preferences
    const personalizationRules = this.createPersonalizationRules(userPreferences);

    // Apply personalization rules
    let personalizedContent = generatedPrompt.content;
    for (const rule of personalizationRules) {
      personalizedContent = this.applyPersonalizationRule(personalizedContent, rule);
    }

    const personalizedPrompt: PersonalizedPrompt = {
      ...generatedPrompt,
      content: personalizedContent,
      personalizations: personalizationRules,
    };

    return personalizedPrompt;
  }

  // Enhanced public methods for comprehensive template-based generation
  async generateComprehensivePrompt(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
  ): Promise<GeneratedPrompt> {
    return this.standardGenerator.generatePrompt(template, variables, identity, context);
  }

  async validateTemplateCompatibility(template: PromptTemplate, identity: UserIdentity): Promise<boolean> {
    try {
      // Check template structure
      const templateValidation = TemplateValidatorClass.validatePromptTemplate(template);
      if (!templateValidation.isValid) {
        return false;
      }

      // Check identity permissions
      const canUseTemplate = await this.standardGenerator
        .getIdentityResolver()
        .validateIdentityPermissions(identity, 'use_template');
      if (!canUseTemplate) {
        return false;
      }

      // Check if identity is compatible with template
      if (!template.identities.includes(identity.type)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // Enhanced personalization and customization features
  async applyUserPreferences(
    prompt: GeneratedPrompt,
    identity: UserIdentity,
    additionalPreferences?: Record<string, unknown>,
  ): Promise<PersonalizedPrompt> {
    const identityProfile = await this.standardGenerator.getIdentityResolver().getIdentityCharacteristics(identity);

    // Combine identity preferences with additional preferences
    const combinedPreferences = {
      ...identity.preferences,
      ...additionalPreferences,
    };

    // Create comprehensive personalization rules
    const personalizationRules = this.createComprehensivePersonalizationRules(
      combinedPreferences,
      identityProfile,
      identity,
    );

    // Apply personalization rules in priority order
    let personalizedContent = prompt.content;
    const appliedRules: PersonalizationRule[] = [];

    for (const rule of personalizationRules.sort((a, b) => a.priority - b.priority)) {
      const previousContent = personalizedContent;
      personalizedContent = this.applyPersonalizationRule(personalizedContent, rule);

      // Only add rule if it actually changed the content
      if (previousContent !== personalizedContent) {
        appliedRules.push(rule);
      }
    }

    const personalizedPrompt: PersonalizedPrompt = {
      ...prompt,
      content: personalizedContent,
      personalizations: appliedRules,
    };

    // Validate the personalized prompt
    const validation = this.validatePersonalizedPrompt(personalizedPrompt);
    if (!validation.isValid) {
      throw new Error(`Personalization validation failed: ${validation.errors.join(', ')}`);
    }

    return personalizedPrompt;
  }

  async savePromptCustomization(
    promptId: string,
    identity: UserIdentity,
    customizations: PromptCustomization[],
  ): Promise<void> {
    // Validate customizations
    for (const customization of customizations) {
      const validation = this.validatePromptCustomization(customization);
      if (!validation.isValid) {
        throw new Error(`Invalid customization: ${validation.errors.join(', ')}`);
      }
    }

    // Store customizations in identity
    identity.customizations = identity.customizations.filter((c) => c.promptId !== promptId);
    identity.customizations.push(...customizations.map((c) => ({ ...c, promptId })));

    // Update cache to reflect changes
    this.generationCache.clear();
  }

  async loadPromptCustomizations(promptId: string, identity: UserIdentity): Promise<PromptCustomization[]> {
    return identity.customizations.filter((c) => c.promptId === promptId);
  }

  async applyPromptCustomizations(
    prompt: GeneratedPrompt,
    customizations: PromptCustomization[],
  ): Promise<PersonalizedPrompt> {
    let customizedContent = prompt.content;
    const appliedCustomizations: PersonalizationRule[] = [];

    for (const customization of customizations) {
      const rule: PersonalizationRule = {
        type: customization.type as PersonalizationRule['type'],
        content: customization.content,
        priority: customization.priority || 10,
        condition: customization.condition,
      };

      customizedContent = this.applyPersonalizationRule(customizedContent, rule);
      appliedCustomizations.push(rule);
    }

    return {
      ...prompt,
      content: customizedContent,
      personalizations: appliedCustomizations,
    };
  }

  async generatePersonalizedPrompt(
    template: PromptTemplate,
    variables: TemplateVariables,
    identity: UserIdentity,
    context: ProjectContext,
    additionalPreferences?: Record<string, unknown>,
  ): Promise<PersonalizedPrompt> {
    // Generate base prompt
    const basePrompt = await this.generateComprehensivePrompt(template, variables, identity, context);

    // Load existing customizations
    const customizations = await this.loadPromptCustomizations(template.id, identity);

    // Apply customizations first
    let personalizedPrompt =
      customizations.length > 0
        ? await this.applyPromptCustomizations(basePrompt, customizations)
        : ({ ...basePrompt, personalizations: [] } as PersonalizedPrompt);

    // Apply user preferences
    personalizedPrompt = await this.applyUserPreferences(personalizedPrompt, identity, additionalPreferences);

    return personalizedPrompt;
  }

  async optimizePersonalization(
    prompt: PersonalizedPrompt,
    usageMetrics: PromptUsageMetrics,
  ): Promise<PersonalizationOptimizationResult> {
    const optimizations: PersonalizationOptimization[] = [];
    const suggestions: string[] = [];

    // Analyze usage patterns
    if (usageMetrics.successRate < 0.8) {
      optimizations.push({
        type: 'content_adjustment',
        description: 'Adjust content based on low success rate',
        suggestedChanges: ['Simplify language', 'Add more context', 'Reduce complexity'],
        priority: 'high',
      });
    }

    if (usageMetrics.averageResponseTime > 5000) {
      optimizations.push({
        type: 'performance_improvement',
        description: 'Optimize for faster response times',
        suggestedChanges: ['Reduce prompt length', 'Simplify instructions', 'Remove redundant information'],
        priority: 'medium',
      });
    }

    // Analyze personalization effectiveness
    const redundantRules = this.findRedundantPersonalizationRules(prompt.personalizations);
    if (redundantRules.length > 0) {
      optimizations.push({
        type: 'rule_optimization',
        description: 'Remove redundant personalization rules',
        suggestedChanges: redundantRules.map((r) => `Remove rule: ${r.type} - ${r.content.substring(0, 50)}...`),
        priority: 'low',
      });
    }

    // Generate suggestions based on identity profile
    const _identityProfile = await this.standardGenerator
      .getIdentityResolver()
      .getIdentityCharacteristics(prompt.identity);
    suggestions.push(...this.generatePersonalizationSuggestions(prompt, _identityProfile));

    return {
      optimizations,
      suggestions,
      currentEffectiveness: this.calculatePersonalizationEffectiveness(prompt, usageMetrics),
      recommendedActions: this.generateRecommendedActions(optimizations),
    };
  }

  // Private helper methods for personalization
  private createComprehensivePersonalizationRules(
    preferences: Record<string, unknown>,
    _identityProfile: IdentityProfile,
    identity: UserIdentity,
  ): PersonalizationRule[] {
    const rules: PersonalizationRule[] = [];

    // Language preference rules
    if (preferences.language && preferences.language !== 'fr') {
      rules.push({
        type: 'append',
        content: `\n\nLangue: Répondez en ${preferences.language}.`,
        priority: 1,
      });
    }

    // Response style rules based on identity and preferences
    switch (preferences.responseStyle) {
      case 'concise':
        rules.push({
          type: 'append',
          content: '\n\nStyle: Soyez concis et direct. Évitez les explications superflues.',
          priority: 2,
        });
        break;
      case 'detailed':
        rules.push({
          type: 'append',
          content: '\n\nStyle: Fournissez des explications détaillées avec des exemples et du contexte.',
          priority: 2,
        });
        break;
      case 'balanced':
        rules.push({
          type: 'append',
          content: '\n\nStyle: Équilibrez concision et détail selon le contexte.',
          priority: 2,
        });
        break;
    }

    // Technical level adaptations
    switch (preferences.technicalLevel) {
      case 'basic':
        rules.push({
          type: 'append',
          content: '\n\nNiveau: Utilisez un langage simple, évitez le jargon technique.',
          priority: 3,
        });
        break;
      case 'intermediate':
        rules.push({
          type: 'append',
          content: '\n\nNiveau: Utilisez une terminologie technique modérée avec des explications.',
          priority: 3,
        });
        break;
      case 'advanced':
        rules.push({
          type: 'append',
          content: "\n\nNiveau: Utilisez la terminologie technique appropriée et les détails d'implémentation.",
          priority: 3,
        });
        break;
    }

    // Identity-specific personalization rules
    switch (identity.type) {
      case 'User':
        rules.push({
          type: 'append',
          content: '\n\nApproche: Privilégiez la clarté et la simplicité dans vos explications.',
          priority: 4,
        });
        break;
      case 'Superviseur':
        rules.push({
          type: 'append',
          content: "\n\nApproche: Incluez des suggestions d'amélioration et des alternatives.",
          priority: 4,
        });
        break;
      case 'Responsable':
        rules.push({
          type: 'append',
          content: "\n\nApproche: Incluez une analyse d'impact et des considérations de qualité.",
          priority: 4,
        });
        break;
    }

    // Format preferences
    if (preferences.format === 'structured') {
      rules.push({
        type: 'append',
        content: '\n\nFormat: Structurez votre réponse avec des titres, listes et sections claires.',
        priority: 5,
      });
    } else if (preferences.format === 'narrative') {
      rules.push({
        type: 'append',
        content: '\n\nFormat: Présentez votre réponse sous forme narrative et fluide.',
        priority: 5,
      });
    }

    // Output preferences
    if (preferences.includeExamples === true) {
      rules.push({
        type: 'append',
        content: '\n\nExemples: Incluez des exemples concrets pour illustrer vos points.',
        priority: 6,
      });
    }

    if (preferences.includeReferences === true) {
      rules.push({
        type: 'append',
        content: '\n\nRéférences: Mentionnez les sources et références pertinentes.',
        priority: 7,
      });
    }

    // Context-aware rules
    if (preferences.contextAwareness === 'high') {
      rules.push({
        type: 'append',
        content: '\n\nContexte: Tenez compte du contexte du projet et des contraintes spécifiques.',
        priority: 8,
      });
    }

    return rules;
  }

  private validatePersonalizedPrompt(prompt: PersonalizedPrompt): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check content length
    if (prompt.content.length > 20000) {
      errors.push('Personalized prompt content is too long (>20000 characters)');
    }

    if (prompt.content.length < 10) {
      errors.push('Personalized prompt content is too short (<10 characters)');
    }

    // Check personalization rules
    if (prompt.personalizations.length > 20) {
      errors.push('Too many personalization rules applied (>20)');
    }

    // Check for conflicting rules
    const conflictingRules = this.findConflictingPersonalizationRules(prompt.personalizations);
    if (conflictingRules.length > 0) {
      errors.push(`Conflicting personalization rules detected: ${conflictingRules.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validatePromptCustomization(customization: PromptCustomization): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!customization.type || !['append', 'prepend', 'replace', 'conditional'].includes(customization.type)) {
      errors.push('Invalid customization type');
    }

    if (!customization.content || typeof customization.content !== 'string') {
      errors.push('Customization content must be a non-empty string');
    }

    if (customization.content && customization.content.length > 5000) {
      errors.push('Customization content is too long (>5000 characters)');
    }

    if (customization.type === 'conditional' && !customization.condition) {
      errors.push('Conditional customization requires a condition');
    }

    if (customization.priority !== undefined && (customization.priority < 1 || customization.priority > 100)) {
      errors.push('Customization priority must be between 1 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private findRedundantPersonalizationRules(rules: PersonalizationRule[]): PersonalizationRule[] {
    const redundant: PersonalizationRule[] = [];

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const rule1 = rules[i];
        const rule2 = rules[j];

        // Check for duplicate content
        if (rule1.content === rule2.content && rule1.type === rule2.type) {
          redundant.push(rule2);
        }

        // Check for overlapping functionality
        if (rule1.type === rule2.type && rule1.content.includes(rule2.content.substring(0, 20))) {
          redundant.push(rule2);
        }
      }
    }

    return redundant;
  }

  private findConflictingPersonalizationRules(rules: PersonalizationRule[]): string[] {
    const conflicts: string[] = [];

    // Check for style conflicts
    const styleRules = rules.filter((r) => r.content.includes('Style:'));
    if (styleRules.length > 1) {
      conflicts.push('Multiple style rules');
    }

    // Check for language conflicts
    const languageRules = rules.filter((r) => r.content.includes('Langue:'));
    if (languageRules.length > 1) {
      conflicts.push('Multiple language rules');
    }

    // Check for format conflicts
    const formatRules = rules.filter((r) => r.content.includes('Format:'));
    if (formatRules.length > 1) {
      conflicts.push('Multiple format rules');
    }

    return conflicts;
  }

  private generatePersonalizationSuggestions(prompt: PersonalizedPrompt, identityProfile: IdentityProfile): string[] {
    const suggestions: string[] = [];

    // Always provide at least one suggestion for testing
    suggestions.push('Consider reviewing personalization rules for effectiveness');

    // Suggest based on identity capabilities
    if (
      identityProfile.capabilities.includes('optimization_suggestions') &&
      !prompt.personalizations.some((r) => r.content.includes('optimisation'))
    ) {
      suggestions.push('Consider adding optimization-focused personalization for this identity type');
    }

    if (
      identityProfile.capabilities.includes('quality_validation') &&
      !prompt.personalizations.some((r) => r.content.includes('qualité'))
    ) {
      suggestions.push('Consider adding quality validation personalization for this identity type');
    }

    // Suggest based on content analysis
    if (prompt.content.length > 1000 && !prompt.personalizations.some((r) => r.content.includes('concis'))) {
      suggestions.push('Consider adding conciseness personalization for long prompts');
    }

    if (prompt.content.includes('technical') && !prompt.personalizations.some((r) => r.content.includes('technique'))) {
      suggestions.push('Consider adding technical level personalization for technical content');
    }

    return suggestions;
  }

  private calculatePersonalizationEffectiveness(prompt: PersonalizedPrompt, metrics: PromptUsageMetrics): number {
    let effectiveness = 0;

    // Base effectiveness on success rate
    effectiveness += metrics.successRate * 40;

    // Factor in response time (faster is better)
    const responseTimeScore = Math.max(0, 20 - metrics.averageResponseTime / 1000);
    effectiveness += responseTimeScore;

    // Factor in personalization rule count (moderate is better)
    const ruleCountScore =
      prompt.personalizations.length <= 10 ? 20 : Math.max(0, 20 - (prompt.personalizations.length - 10));
    effectiveness += ruleCountScore;

    // Factor in usage frequency
    const usageScore = Math.min(20, metrics.totalUses / 10);
    effectiveness += usageScore;

    return Math.round(effectiveness);
  }

  private generateRecommendedActions(optimizations: PersonalizationOptimization[]): string[] {
    const actions: string[] = [];

    const highPriorityOpts = optimizations.filter((o) => o.priority === 'high');
    const mediumPriorityOpts = optimizations.filter((o) => o.priority === 'medium');

    if (highPriorityOpts.length > 0) {
      actions.push('Address high-priority optimizations immediately');
      actions.push(...highPriorityOpts.flatMap((o) => o.suggestedChanges));
    }

    if (mediumPriorityOpts.length > 0) {
      actions.push('Consider medium-priority optimizations for next iteration');
    }

    if (optimizations.length === 0) {
      actions.push('Personalization is well-optimized');
      actions.push('monitor usage metrics');
    }

    return actions;
  }

  // Private helper methods
  private applyAgentAdaptations(content: string, agentType: AgentType): string {
    switch (agentType) {
      case 'ollama':
        // Ollama prefers conversational, natural language
        return `${content}\n\nNote: Répondez de manière conversationnelle et naturelle.`;

      case 'lm-studio':
        // LM Studio is good for coordination tasks
        return `${content}\n\nNote: Focalisez-vous sur la coordination et l'organisation des tâches.`;

      case 'codestral':
        // Codestral excels at technical tasks
        return `${content}\n\nNote: Privilégiez les aspects techniques et l'analyse de code.`;

      default:
        return content;
    }
  }

  private getAgentAdaptations(agentType: AgentType): string[] {
    const adaptations: Record<AgentType, string[]> = {
      ollama: ['conversational_tone', 'natural_language'],
      'lm-studio': ['coordination_focus', 'task_organization'],
      codestral: ['technical_focus', 'code_analysis'],
      generic: ['basic_formatting', 'simple_language'],
    };

    return adaptations[agentType] || [];
  }

  private createPersonalizationRules(preferences: Record<string, unknown>): PersonalizationRule[] {
    const rules: PersonalizationRule[] = [];

    // Add language preference rule
    if (preferences.language && preferences.language !== 'fr') {
      rules.push({
        type: 'append',
        content: `\n\nLangue: Répondez en ${preferences.language}.`,
        priority: 1,
      });
    }

    // Add verbosity preference rule
    if (preferences.verbosity === 'high') {
      rules.push({
        type: 'append',
        content: '\n\nStyle: Fournissez des explications détaillées et des exemples.',
        priority: 2,
      });
    } else if (preferences.verbosity === 'low') {
      rules.push({
        type: 'append',
        content: '\n\nStyle: Soyez concis et direct.',
        priority: 2,
      });
    }

    // Add format preference rule
    if (preferences.format === 'structured') {
      rules.push({
        type: 'append',
        content: '\n\nFormat: Structurez votre réponse avec des titres et des listes.',
        priority: 3,
      });
    }

    return rules;
  }

  private applyPersonalizationRule(content: string, rule: PersonalizationRule): string {
    switch (rule.type) {
      case 'append':
        return content + rule.content;
      case 'prepend':
        return rule.content + content;
      case 'replace':
        // Simple replace - in a real implementation, this would be more sophisticated
        return content.replace(/Instructions:.*$/m, rule.content);
      case 'conditional':
        // Apply rule only if condition is met
        if (rule.condition && this.evaluateCondition(content, rule.condition)) {
          return content + rule.content;
        }
        return content;
      default:
        return content;
    }
  }

  private evaluateCondition(content: string, condition: string): boolean {
    // Simple condition evaluation - in a real implementation, this would be more sophisticated
    return content.includes(condition);
  }

  private generateCacheKey(template: PromptTemplate, variables: TemplateVariables, identity: UserIdentity): string {
    const keyParts = [
      template.id,
      JSON.stringify(variables),
      identity.type,
      identity.preferences.responseStyle,
      identity.preferences.technicalLevel,
    ];
    return keyParts.join('|');
  }

  private isCacheValid(prompt: GeneratedPrompt): boolean {
    const now = Date.now();
    const promptTime = prompt.metadata.createdAt.getTime();
    return now - promptTime < this.cacheTTL;
  }

  // Mock implementations for testing
  private createMockIdentityResolver(): IIdentityResolver {
    return {
      getCurrentIdentity: async () => ({
        type: 'User',
        permissions: [],
        preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
        customizations: [],
      }),
      setCurrentIdentity: async () => {},
      getIdentityCharacteristics: async (identity) => ({
        identityType: identity.type,
        displayName: identity.type,
        description: `Mock profile for ${identity.type}`,
        capabilities: ['basic_operations'],
      }),
      validateIdentityPermissions: async () => true,
    };
  }

  private createMockRulesEngine(): IRulesIntegrationEngine {
    return {
      applyRules: async (prompt) => ({
        ...prompt,
        appliedRules: [],
        ruleApplicationResults: [],
        conflictResolutions: [],
        validationResults: [],
      }),
      validateRuleConsistency: async () => ({
        isConsistent: true,
        conflicts: [],
        redundancies: [],
        gaps: [],
        overallScore: 100,
      }),
      detectRuleConflicts: async () => ({ conflicts: [], resolutions: [] }),
    };
  }
}
