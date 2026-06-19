// Context-related models and interfaces

export interface WorkFolderInfo {
  path: string;
  name: string;
  type: 'project' | 'workspace' | 'folder';
  technologies: string[];
  lastModified: Date;
}

export interface FlowInfo {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
}

export interface ToolInfo {
  name: string;
  version: string;
  isAvailable: boolean;
  capabilities: string[];
  configuration?: Record<string, unknown>;
}

export interface ProjectState {
  phase: 'planning' | 'development' | 'testing' | 'deployment' | 'maintenance';
  completionPercentage: number;
  activeFeatures: string[];
  blockers: ProjectBlocker[];
}

export interface ProjectBlocker {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
}

export interface TechEcosystem {
  framework: string;
  language: string;
  runtime: string;
  dependencies: TechDependency[];
  buildTools: string[];
}

export interface TechDependency {
  name: string;
  version: string;
  type: 'runtime' | 'dev' | 'peer';
  isOutdated: boolean;
}

export interface ProjectContext {
  workFolder: WorkFolderInfo;
  activeFlows: FlowInfo[];
  availableTools: ToolInfo[];
  projectState: ProjectState;
  technicalEcosystem: TechEcosystem;
}

export interface EnrichedContext extends ProjectContext {
  recommendations: ContextRecommendation[];
  warnings: ContextWarning[];
  opportunities: ContextOpportunity[];
}

export interface ContextRecommendation {
  type: 'optimization' | 'security' | 'performance' | 'maintainability';
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
}

export interface ContextWarning {
  type: 'deprecated' | 'security' | 'compatibility' | 'performance';
  message: string;
  severity: 'info' | 'warning' | 'error';
  source: string;
}

export interface ContextOpportunity {
  type: 'feature' | 'optimization' | 'automation' | 'integration';
  description: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  effort: 'minimal' | 'moderate' | 'significant';
}

export interface ContextChange {
  type: 'file' | 'flow' | 'tool' | 'state';
  action: 'added' | 'modified' | 'removed';
  target: string;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
}

// Flow state model
export interface FlowState {
  currentFlows: FlowInfo[];
  completedFlows: FlowInfo[];
  queuedFlows: FlowInfo[];
  totalFlowCount: number;
  activeFlowCount: number;
  flowHistory: FlowHistoryEntry[];
}

export interface FlowHistoryEntry {
  flowId: string;
  action: 'started' | 'paused' | 'resumed' | 'completed' | 'failed';
  timestamp: Date;
  duration?: number;
  reason?: string;
}

// Context validation interfaces
export interface ContextValidationResult {
  isValid: boolean;
  errors: ContextValidationError[];
  warnings: ContextValidationWarning[];
}

export interface ContextValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ContextValidationWarning {
  field: string;
  message: string;
  code: string;
}

// Class implementations for structure tests
export class ProjectContextClass {
  constructor(public _data: ProjectContext) {}

  validate(): ContextValidationResult {
    return ContextValidator.validateProjectContext(this._data);
  }

  enrich(): EnrichedContext {
    return ContextEnricher.enrichContext(this._data);
  }
}

// Context validation and enrichment class
export class ContextValidator {
  /**
   * Validates a ProjectContext object
   */
  static validateProjectContext(context: ProjectContext): ContextValidationResult {
    const errors: ContextValidationError[] = [];
    const warnings: ContextValidationWarning[] = [];

    // Validate work folder
    if (!context.workFolder) {
      errors.push({
        field: 'workFolder',
        message: 'Work folder information is required',
        code: 'MISSING_WORK_FOLDER',
      });
    } else {
      const workFolderErrors = this.validateWorkFolderInfo(context.workFolder);
      errors.push(...workFolderErrors);
    }

    // Validate active flows
    if (!Array.isArray(context.activeFlows)) {
      errors.push({
        field: 'activeFlows',
        message: 'Active flows must be an array',
        code: 'INVALID_ACTIVE_FLOWS_TYPE',
      });
    } else {
      context.activeFlows.forEach((flow, index) => {
        const flowErrors = this.validateFlowInfo(flow, `activeFlows[${index}]`);
        errors.push(...flowErrors);
      });

      // Check for too many active flows
      if (context.activeFlows.length > 10) {
        warnings.push({
          field: 'activeFlows',
          message: `High number of active flows (${context.activeFlows.length}). Consider consolidating or prioritizing.`,
          code: 'HIGH_ACTIVE_FLOW_COUNT',
        });
      }
    }

    // Validate available tools
    if (!Array.isArray(context.availableTools)) {
      errors.push({
        field: 'availableTools',
        message: 'Available tools must be an array',
        code: 'INVALID_AVAILABLE_TOOLS_TYPE',
      });
    } else {
      context.availableTools.forEach((tool, index) => {
        const toolErrors = this.validateToolInfo(tool, `availableTools[${index}]`);
        errors.push(...toolErrors);
      });
    }

    // Validate project state
    if (!context.projectState) {
      errors.push({
        field: 'projectState',
        message: 'Project state is required',
        code: 'MISSING_PROJECT_STATE',
      });
    } else {
      const stateErrors = this.validateProjectState(context.projectState);
      errors.push(...stateErrors);
    }

    // Validate technical ecosystem
    if (!context.technicalEcosystem) {
      errors.push({
        field: 'technicalEcosystem',
        message: 'Technical ecosystem information is required',
        code: 'MISSING_TECH_ECOSYSTEM',
      });
    } else {
      const ecosystemErrors = this.validateTechEcosystem(context.technicalEcosystem);
      errors.push(...ecosystemErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a FlowState object
   */
  static validateFlowState(flowState: FlowState): ContextValidationResult {
    const errors: ContextValidationError[] = [];
    const warnings: ContextValidationWarning[] = [];

    // Validate flow arrays
    if (!Array.isArray(flowState.currentFlows)) {
      errors.push({
        field: 'currentFlows',
        message: 'Current flows must be an array',
        code: 'INVALID_CURRENT_FLOWS_TYPE',
      });
    } else {
      flowState.currentFlows.forEach((flow, index) => {
        const flowErrors = this.validateFlowInfo(flow, `currentFlows[${index}]`);
        errors.push(...flowErrors);
      });
    }

    if (!Array.isArray(flowState.completedFlows)) {
      errors.push({
        field: 'completedFlows',
        message: 'Completed flows must be an array',
        code: 'INVALID_COMPLETED_FLOWS_TYPE',
      });
    }

    if (!Array.isArray(flowState.queuedFlows)) {
      errors.push({
        field: 'queuedFlows',
        message: 'Queued flows must be an array',
        code: 'INVALID_QUEUED_FLOWS_TYPE',
      });
    }

    // Validate numeric fields
    if (typeof flowState.totalFlowCount !== 'number' || flowState.totalFlowCount < 0) {
      errors.push({
        field: 'totalFlowCount',
        message: 'Total flow count must be a non-negative number',
        code: 'INVALID_TOTAL_FLOW_COUNT',
      });
    }

    if (typeof flowState.activeFlowCount !== 'number' || flowState.activeFlowCount < 0) {
      errors.push({
        field: 'activeFlowCount',
        message: 'Active flow count must be a non-negative number',
        code: 'INVALID_ACTIVE_FLOW_COUNT',
      });
    }

    // Validate consistency
    if (Array.isArray(flowState.currentFlows) && flowState.activeFlowCount !== undefined) {
      const actualActiveCount = flowState.currentFlows.filter((f) => f.status === 'active').length;
      if (actualActiveCount !== flowState.activeFlowCount) {
        warnings.push({
          field: 'activeFlowCount',
          message: `Active flow count (${flowState.activeFlowCount}) doesn't match actual active flows (${actualActiveCount})`,
          code: 'INCONSISTENT_ACTIVE_FLOW_COUNT',
        });
      }
    }

    // Validate flow history
    if (!Array.isArray(flowState.flowHistory)) {
      errors.push({
        field: 'flowHistory',
        message: 'Flow history must be an array',
        code: 'INVALID_FLOW_HISTORY_TYPE',
      });
    } else {
      flowState.flowHistory.forEach((entry, index) => {
        const historyErrors = this.validateFlowHistoryEntry(entry, `flowHistory[${index}]`);
        errors.push(...historyErrors);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates WorkFolderInfo object
   */
  private static validateWorkFolderInfo(workFolder: WorkFolderInfo): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!workFolder.path || typeof workFolder.path !== 'string') {
      errors.push({
        field: 'workFolder.path',
        message: 'Work folder path must be a non-empty string',
        code: 'INVALID_WORK_FOLDER_PATH',
      });
    }

    if (!workFolder.name || typeof workFolder.name !== 'string') {
      errors.push({
        field: 'workFolder.name',
        message: 'Work folder name must be a non-empty string',
        code: 'INVALID_WORK_FOLDER_NAME',
      });
    }

    if (!['project', 'workspace', 'folder'].includes(workFolder.type)) {
      errors.push({
        field: 'workFolder.type',
        message: 'Work folder type must be project, workspace, or folder',
        code: 'INVALID_WORK_FOLDER_TYPE',
      });
    }

    if (!Array.isArray(workFolder.technologies)) {
      errors.push({
        field: 'workFolder.technologies',
        message: 'Technologies must be an array',
        code: 'INVALID_TECHNOLOGIES_TYPE',
      });
    } else {
      workFolder.technologies.forEach((tech, index) => {
        if (typeof tech !== 'string' || tech.trim() === '') {
          errors.push({
            field: `workFolder.technologies[${index}]`,
            message: 'Each technology must be a non-empty string',
            code: 'INVALID_TECHNOLOGY',
          });
        }
      });
    }

    if (!(workFolder.lastModified instanceof Date) || isNaN(workFolder.lastModified.getTime())) {
      errors.push({
        field: 'workFolder.lastModified',
        message: 'Last modified must be a valid Date object',
        code: 'INVALID_LAST_MODIFIED',
      });
    }

    return errors;
  }

  /**
   * Validates FlowInfo object
   */
  private static validateFlowInfo(flow: FlowInfo, fieldPrefix: string): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!flow.id || typeof flow.id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Flow ID must be a non-empty string',
        code: 'INVALID_FLOW_ID',
      });
    }

    if (!flow.name || typeof flow.name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Flow name must be a non-empty string',
        code: 'INVALID_FLOW_NAME',
      });
    }

    if (!['active', 'paused', 'completed', 'failed'].includes(flow.status)) {
      errors.push({
        field: `${fieldPrefix}.status`,
        message: 'Flow status must be active, paused, completed, or failed',
        code: 'INVALID_FLOW_STATUS',
      });
    }

    if (typeof flow.progress !== 'number' || flow.progress < 0 || flow.progress > 100) {
      errors.push({
        field: `${fieldPrefix}.progress`,
        message: 'Flow progress must be a number between 0 and 100',
        code: 'INVALID_FLOW_PROGRESS',
      });
    }

    if (!flow.currentStep || typeof flow.currentStep !== 'string') {
      errors.push({
        field: `${fieldPrefix}.currentStep`,
        message: 'Current step must be a non-empty string',
        code: 'INVALID_CURRENT_STEP',
      });
    }

    return errors;
  }

  /**
   * Validates ToolInfo object
   */
  private static validateToolInfo(tool: ToolInfo, fieldPrefix: string): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!tool.name || typeof tool.name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Tool name must be a non-empty string',
        code: 'INVALID_TOOL_NAME',
      });
    }

    if (!tool.version || typeof tool.version !== 'string') {
      errors.push({
        field: `${fieldPrefix}.version`,
        message: 'Tool version must be a non-empty string',
        code: 'INVALID_TOOL_VERSION',
      });
    }

    if (typeof tool.isAvailable !== 'boolean') {
      errors.push({
        field: `${fieldPrefix}.isAvailable`,
        message: 'Tool availability must be a boolean',
        code: 'INVALID_TOOL_AVAILABILITY',
      });
    }

    if (!Array.isArray(tool.capabilities)) {
      errors.push({
        field: `${fieldPrefix}.capabilities`,
        message: 'Tool capabilities must be an array',
        code: 'INVALID_TOOL_CAPABILITIES_TYPE',
      });
    } else {
      tool.capabilities.forEach((capability, index) => {
        if (typeof capability !== 'string' || capability.trim() === '') {
          errors.push({
            field: `${fieldPrefix}.capabilities[${index}]`,
            message: 'Each capability must be a non-empty string',
            code: 'INVALID_TOOL_CAPABILITY',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validates ProjectState object
   */
  private static validateProjectState(state: ProjectState): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!['planning', 'development', 'testing', 'deployment', 'maintenance'].includes(state.phase)) {
      errors.push({
        field: 'projectState.phase',
        message: 'Project phase must be planning, development, testing, deployment, or maintenance',
        code: 'INVALID_PROJECT_PHASE',
      });
    }

    if (
      typeof state.completionPercentage !== 'number' ||
      state.completionPercentage < 0 ||
      state.completionPercentage > 100
    ) {
      errors.push({
        field: 'projectState.completionPercentage',
        message: 'Completion percentage must be a number between 0 and 100',
        code: 'INVALID_COMPLETION_PERCENTAGE',
      });
    }

    if (!Array.isArray(state.activeFeatures)) {
      errors.push({
        field: 'projectState.activeFeatures',
        message: 'Active features must be an array',
        code: 'INVALID_ACTIVE_FEATURES_TYPE',
      });
    } else {
      state.activeFeatures.forEach((feature, index) => {
        if (typeof feature !== 'string' || feature.trim() === '') {
          errors.push({
            field: `projectState.activeFeatures[${index}]`,
            message: 'Each active feature must be a non-empty string',
            code: 'INVALID_ACTIVE_FEATURE',
          });
        }
      });
    }

    if (!Array.isArray(state.blockers)) {
      errors.push({
        field: 'projectState.blockers',
        message: 'Blockers must be an array',
        code: 'INVALID_BLOCKERS_TYPE',
      });
    } else {
      state.blockers.forEach((blocker, index) => {
        const blockerErrors = this.validateProjectBlocker(blocker, `projectState.blockers[${index}]`);
        errors.push(...blockerErrors);
      });
    }

    return errors;
  }

  /**
   * Validates ProjectBlocker object
   */
  private static validateProjectBlocker(blocker: ProjectBlocker, fieldPrefix: string): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!blocker.id || typeof blocker.id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Blocker ID must be a non-empty string',
        code: 'INVALID_BLOCKER_ID',
      });
    }

    if (!blocker.description || typeof blocker.description !== 'string') {
      errors.push({
        field: `${fieldPrefix}.description`,
        message: 'Blocker description must be a non-empty string',
        code: 'INVALID_BLOCKER_DESCRIPTION',
      });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(blocker.severity)) {
      errors.push({
        field: `${fieldPrefix}.severity`,
        message: 'Blocker severity must be low, medium, high, or critical',
        code: 'INVALID_BLOCKER_SEVERITY',
      });
    }

    if (blocker.assignee !== undefined && (typeof blocker.assignee !== 'string' || blocker.assignee.trim() === '')) {
      errors.push({
        field: `${fieldPrefix}.assignee`,
        message: 'Blocker assignee must be a non-empty string if provided',
        code: 'INVALID_BLOCKER_ASSIGNEE',
      });
    }

    return errors;
  }

  /**
   * Validates TechEcosystem object
   */
  private static validateTechEcosystem(ecosystem: TechEcosystem): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!ecosystem.framework || typeof ecosystem.framework !== 'string') {
      errors.push({
        field: 'technicalEcosystem.framework',
        message: 'Framework must be a non-empty string',
        code: 'INVALID_FRAMEWORK',
      });
    }

    if (!ecosystem.language || typeof ecosystem.language !== 'string') {
      errors.push({
        field: 'technicalEcosystem.language',
        message: 'Language must be a non-empty string',
        code: 'INVALID_LANGUAGE',
      });
    }

    if (!ecosystem.runtime || typeof ecosystem.runtime !== 'string') {
      errors.push({
        field: 'technicalEcosystem.runtime',
        message: 'Runtime must be a non-empty string',
        code: 'INVALID_RUNTIME',
      });
    }

    if (!Array.isArray(ecosystem.dependencies)) {
      errors.push({
        field: 'technicalEcosystem.dependencies',
        message: 'Dependencies must be an array',
        code: 'INVALID_DEPENDENCIES_TYPE',
      });
    } else {
      ecosystem.dependencies.forEach((dep, index) => {
        const depErrors = this.validateTechDependency(dep, `technicalEcosystem.dependencies[${index}]`);
        errors.push(...depErrors);
      });
    }

    if (!Array.isArray(ecosystem.buildTools)) {
      errors.push({
        field: 'technicalEcosystem.buildTools',
        message: 'Build tools must be an array',
        code: 'INVALID_BUILD_TOOLS_TYPE',
      });
    } else {
      ecosystem.buildTools.forEach((tool, index) => {
        if (typeof tool !== 'string' || tool.trim() === '') {
          errors.push({
            field: `technicalEcosystem.buildTools[${index}]`,
            message: 'Each build tool must be a non-empty string',
            code: 'INVALID_BUILD_TOOL',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validates TechDependency object
   */
  private static validateTechDependency(dependency: TechDependency, fieldPrefix: string): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!dependency.name || typeof dependency.name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Dependency name must be a non-empty string',
        code: 'INVALID_DEPENDENCY_NAME',
      });
    }

    if (!dependency.version || typeof dependency.version !== 'string') {
      errors.push({
        field: `${fieldPrefix}.version`,
        message: 'Dependency version must be a non-empty string',
        code: 'INVALID_DEPENDENCY_VERSION',
      });
    }

    if (!['runtime', 'dev', 'peer'].includes(dependency.type)) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: 'Dependency type must be runtime, dev, or peer',
        code: 'INVALID_DEPENDENCY_TYPE',
      });
    }

    if (typeof dependency.isOutdated !== 'boolean') {
      errors.push({
        field: `${fieldPrefix}.isOutdated`,
        message: 'Dependency outdated status must be a boolean',
        code: 'INVALID_DEPENDENCY_OUTDATED',
      });
    }

    return errors;
  }

  /**
   * Validates FlowHistoryEntry object
   */
  private static validateFlowHistoryEntry(entry: FlowHistoryEntry, fieldPrefix: string): ContextValidationError[] {
    const errors: ContextValidationError[] = [];

    if (!entry.flowId || typeof entry.flowId !== 'string') {
      errors.push({
        field: `${fieldPrefix}.flowId`,
        message: 'Flow ID must be a non-empty string',
        code: 'INVALID_FLOW_HISTORY_ID',
      });
    }

    if (!['started', 'paused', 'resumed', 'completed', 'failed'].includes(entry.action)) {
      errors.push({
        field: `${fieldPrefix}.action`,
        message: 'Flow action must be started, paused, resumed, completed, or failed',
        code: 'INVALID_FLOW_ACTION',
      });
    }

    if (!(entry.timestamp instanceof Date) || isNaN(entry.timestamp.getTime())) {
      errors.push({
        field: `${fieldPrefix}.timestamp`,
        message: 'Timestamp must be a valid Date object',
        code: 'INVALID_FLOW_TIMESTAMP',
      });
    }

    if (entry.duration !== undefined && (typeof entry.duration !== 'number' || entry.duration < 0)) {
      errors.push({
        field: `${fieldPrefix}.duration`,
        message: 'Duration must be a non-negative number if provided',
        code: 'INVALID_FLOW_DURATION',
      });
    }

    if (entry.reason !== undefined && (typeof entry.reason !== 'string' || entry.reason.trim() === '')) {
      errors.push({
        field: `${fieldPrefix}.reason`,
        message: 'Reason must be a non-empty string if provided',
        code: 'INVALID_FLOW_REASON',
      });
    }

    return errors;
  }
}

// Context enrichment class
export class ContextEnricher {
  /**
   * Enriches a ProjectContext with recommendations, warnings, and opportunities
   */
  static enrichContext(context: ProjectContext): EnrichedContext {
    const recommendations = this.generateRecommendations(context);
    const warnings = this.generateWarnings(context);
    const opportunities = this.generateOpportunities(context);

    return {
      ...context,
      recommendations,
      warnings,
      opportunities,
    };
  }

  /**
   * Generates context-based recommendations
   */
  private static generateRecommendations(context: ProjectContext): ContextRecommendation[] {
    const recommendations: ContextRecommendation[] = [];

    // Check for outdated dependencies
    const outdatedDeps = context.technicalEcosystem.dependencies.filter((dep) => dep.isOutdated);
    if (outdatedDeps.length > 0) {
      recommendations.push({
        type: 'security',
        description: `Update ${outdatedDeps.length} outdated dependencies to improve security and performance`,
        priority: 'high',
        actionable: true,
      });
    }

    // Check for high number of active flows
    if (context.activeFlows.length > 5) {
      recommendations.push({
        type: 'optimization',
        description: 'Consider consolidating or prioritizing active flows to improve focus',
        priority: 'medium',
        actionable: true,
      });
    }

    // Check for critical blockers
    const criticalBlockers = context.projectState.blockers.filter((b) => b.severity === 'critical');
    if (criticalBlockers.length > 0) {
      recommendations.push({
        type: 'maintainability',
        description: `Address ${criticalBlockers.length} critical blockers immediately`,
        priority: 'high',
        actionable: true,
      });
    }

    // Check project phase and completion
    if (context.projectState.phase === 'development' && context.projectState.completionPercentage > 80) {
      recommendations.push({
        type: 'optimization',
        description: 'Consider transitioning to testing phase as development is nearly complete',
        priority: 'medium',
        actionable: true,
      });
    }

    return recommendations;
  }

  /**
   * Generates context-based warnings
   */
  private static generateWarnings(context: ProjectContext): ContextWarning[] {
    const warnings: ContextWarning[] = [];

    // Check for unavailable tools
    const unavailableTools = context.availableTools.filter((tool) => !tool.isAvailable);
    if (unavailableTools.length > 0) {
      warnings.push({
        type: 'compatibility',
        message: `${unavailableTools.length} tools are currently unavailable: ${unavailableTools.map((t) => t.name).join(', ')}`,
        severity: 'warning',
        source: 'tool-availability',
      });
    }

    // Check for stalled flows
    const stalledFlows = context.activeFlows.filter((flow) => flow.status === 'paused');
    if (stalledFlows.length > 0) {
      warnings.push({
        type: 'performance',
        message: `${stalledFlows.length} flows are currently paused and may need attention`,
        severity: 'info',
        source: 'flow-management',
      });
    }

    // Check for security dependencies
    const securityDeps = context.technicalEcosystem.dependencies.filter(
      (dep) => dep.isOutdated && dep.type === 'runtime',
    );
    if (securityDeps.length > 0) {
      warnings.push({
        type: 'security',
        message: `${securityDeps.length} runtime dependencies are outdated and may pose security risks`,
        severity: 'warning',
        source: 'dependency-analysis',
      });
    }

    return warnings;
  }

  /**
   * Generates context-based opportunities
   */
  private static generateOpportunities(context: ProjectContext): ContextOpportunity[] {
    const opportunities: ContextOpportunity[] = [];

    // Check for automation opportunities
    if (context.activeFlows.length > 3 && context.projectState.phase === 'development') {
      opportunities.push({
        type: 'automation',
        description: 'Implement automated testing and CI/CD pipeline to streamline development flows',
        estimatedImpact: 'high',
        effort: 'moderate',
      });
    }

    // Check for integration opportunities
    const availableTools = context.availableTools.filter((tool) => tool.isAvailable);
    if (availableTools.length > 5) {
      opportunities.push({
        type: 'integration',
        description: 'Leverage available tools for better workflow integration and productivity',
        estimatedImpact: 'medium',
        effort: 'minimal',
      });
    }

    // Check for optimization opportunities
    if (context.projectState.completionPercentage > 50 && context.projectState.blockers.length === 0) {
      opportunities.push({
        type: 'optimization',
        description: 'Optimize performance and code quality as project approaches completion',
        estimatedImpact: 'medium',
        effort: 'moderate',
      });
    }

    return opportunities;
  }
}
