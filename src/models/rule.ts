// Rule-related models and interfaces for the Rules Integration Engine

import type { UserIdentity } from './identity';
import type { ProjectContext } from './context';
import type { BasePrompt } from './prompt';

// Core rule interfaces
export interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  priority: RulePriority;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata: RuleMetadata;
}

export interface RuleCondition {
  type: 'identity' | 'context' | 'prompt' | 'custom';
  field: string;
  operator: ConditionOperator;
  value: unknown;
  negated?: boolean;
}

export interface RuleAction {
  type: 'modify' | 'append' | 'prepend' | 'replace' | 'validate' | 'warn';
  target: string;
  content?: string;
  parameters?: Record<string, unknown>;
}

export interface RuleMetadata {
  createdAt: Date;
  updatedAt: Date;
  author: string;
  version: string;
  tags: string[];
  usage: RuleUsageStats;
}

export interface RuleUsageStats {
  totalApplications: number;
  successfulApplications: number;
  failedApplications: number;
  lastApplied: Date;
  averageExecutionTime: number;
}

// Rule evaluation and application interfaces
export interface RuleEvaluationContext {
  identity: UserIdentity;
  projectContext: ProjectContext;
  prompt: BasePrompt;
  variables: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  isApplicable: boolean;
  conditionResults: ConditionResult[];
  confidence: number;
  executionTime: number;
}

export interface ConditionResult {
  conditionIndex: number;
  result: boolean;
  actualValue: unknown;
  expectedValue: unknown;
  operator: ConditionOperator;
}

export interface RuleApplicationResult {
  ruleId: string;
  success: boolean;
  modifications: RuleModification[];
  warnings: RuleWarning[];
  errors: RuleError[];
  executionTime: number;
}

export interface RuleModification {
  type: 'content' | 'metadata' | 'structure';
  field: string;
  oldValue: unknown;
  newValue: unknown;
  description: string;
}

export interface RuleWarning {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  field?: string;
}

export interface RuleError {
  code: string;
  message: string;
  field?: string;
  cause?: Error;
}

// Rule conflict detection interfaces
export interface RuleConflict {
  type: ConflictType;
  severity: ConflictSeverity;
  rules: ConflictingRule[];
  description: string;
  suggestedResolution?: ConflictResolution;
}

export interface ConflictingRule {
  ruleId: string;
  ruleName: string;
  conflictingAction: RuleAction;
  priority: RulePriority;
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  selectedRuleId?: string;
  mergedAction?: RuleAction;
  userInteractionRequired: boolean;
  description: string;
}

// Rule validation interfaces
export interface RuleValidationResult {
  isValid: boolean;
  errors: RuleValidationError[];
  warnings: RuleValidationWarning[];
  suggestions: RuleValidationSuggestion[];
}

export interface RuleValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

export interface RuleValidationWarning {
  field: string;
  message: string;
  code: string;
  impact: 'low' | 'medium' | 'high';
}

export interface RuleValidationSuggestion {
  field: string;
  message: string;
  suggestedValue?: unknown;
  rationale: string;
}

// Rule consistency checking interfaces
export interface ConsistencyCheckResult {
  isConsistent: boolean;
  conflicts: RuleConflict[];
  redundancies: RuleRedundancy[];
  gaps: RuleGap[];
  overallScore: number;
}

export interface RuleRedundancy {
  type: 'duplicate' | 'overlapping' | 'superseded';
  rules: string[];
  description: string;
  recommendation: string;
}

export interface RuleGap {
  category: RuleCategory;
  description: string;
  suggestedRules: string[];
  priority: 'low' | 'medium' | 'high';
}

// Enriched prompt with rule application
export interface RuleEnrichedPrompt extends BasePrompt {
  appliedRules: AppliedRuleInfo[];
  ruleApplicationResults: RuleApplicationResult[];
  conflictResolutions: ConflictResolution[];
  validationResults: RuleValidationResult[];
}

export interface AppliedRuleInfo {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  priority: RulePriority;
  impact: 'low' | 'medium' | 'high';
  modifications: string[];
  executionTime: number;
  success: boolean;
}

// Type definitions
export type RuleCategory =
  | 'identity-specific'
  | 'context-aware'
  | 'quality-assurance'
  | 'security'
  | 'performance'
  | 'formatting'
  | 'validation'
  | 'personalization';

export type RulePriority = 'low' | 'medium' | 'high' | 'critical';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'in_array'
  | 'not_in_array'
  | 'exists'
  | 'not_exists';

export type ConflictType =
  | 'action_conflict'
  | 'condition_conflict'
  | 'priority_conflict'
  | 'target_conflict'
  | 'logical_conflict';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ResolutionStrategy =
  | 'priority_based'
  | 'merge_actions'
  | 'user_choice'
  | 'skip_conflicting'
  | 'apply_all'
  | 'apply_first'
  | 'apply_last';

// Predicate-based rule engine interfaces
export interface RulePredicate {
  evaluate(_context: RuleEvaluationContext): boolean;
  getDescription(): string;
  getDependencies(): string[];
}

export interface CompositeRulePredicate extends RulePredicate {
  operator: 'AND' | 'OR' | 'NOT';
  predicates: RulePredicate[];
}

export interface SimpleRulePredicate extends RulePredicate {
  condition: RuleCondition;
}

// Rule engine configuration
export interface RuleEngineConfig {
  maxExecutionTime: number;
  enableConflictDetection: boolean;
  enablePerformanceMetrics: boolean;
  defaultResolutionStrategy: ResolutionStrategy;
  validationLevel: 'strict' | 'moderate' | 'lenient';
  cacheEnabled: boolean;
  cacheTtl: number;
}

// Factory interfaces for creating rules
export interface RuleFactory {
  createRule(_definition: RuleDefinition): Rule;
  createCondition(_type: string, _field: string, _operator: ConditionOperator, _value: unknown): RuleCondition;
  createAction(_type: string, _target: string, _content?: string, _parameters?: Record<string, unknown>): RuleAction;
  validateRuleDefinition(_definition: RuleDefinition): RuleValidationResult;
}

export interface RuleDefinition {
  name: string;
  description: string;
  category: RuleCategory;
  priority: RulePriority;
  conditions: RuleConditionDefinition[];
  actions: RuleActionDefinition[];
  metadata?: Partial<RuleMetadata>;
}

export interface RuleConditionDefinition {
  type: 'identity' | 'context' | 'prompt' | 'custom';
  field: string;
  operator: ConditionOperator;
  value: unknown;
  negated?: boolean;
}

export interface RuleActionDefinition {
  type: 'modify' | 'append' | 'prepend' | 'replace' | 'validate' | 'warn';
  target: string;
  content?: string;
  parameters?: Record<string, unknown>;
}
