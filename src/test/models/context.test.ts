import { describe, it, expect } from 'vitest';
import type { ProjectContext, FlowState, WorkFolderInfo, FlowInfo } from '../../models/context';
import { ContextValidator, ContextEnricher } from '../../models/context';

describe('ContextValidator', () => {
  // Helper function to create a valid ProjectContext
  const createValidProjectContext = (): ProjectContext => ({
    workFolder: {
      path: '/project/path',
      name: 'Test Project',
      type: 'project',
      technologies: ['TypeScript', 'Node.js'],
      lastModified: new Date('2024-01-01'),
    },
    activeFlows: [
      {
        id: 'flow-1',
        name: 'Development Flow',
        status: 'active',
        progress: 75,
        currentStep: 'Implementation',
      },
    ],
    availableTools: [
      {
        name: 'ESLint',
        version: '8.0.0',
        isAvailable: true,
        capabilities: ['linting', 'formatting'],
      },
    ],
    projectState: {
      phase: 'development',
      completionPercentage: 60,
      activeFeatures: ['authentication', 'user-management'],
      blockers: [],
    },
    technicalEcosystem: {
      framework: 'Node.js',
      language: 'TypeScript',
      runtime: 'Node.js 18',
      dependencies: [
        {
          name: 'express',
          version: '4.18.0',
          type: 'runtime',
          isOutdated: false,
        },
      ],
      buildTools: ['npm', 'tsc'],
    },
  });

  describe('validateProjectContext', () => {
    it('should validate a valid ProjectContext', () => {
      const validContext = createValidProjectContext();
      const result = ContextValidator.validateProjectContext(validContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing work folder', () => {
      const invalidContext = createValidProjectContext();
      invalidContext.workFolder = null as unknown as WorkFolderInfo;

      const result = ContextValidator.validateProjectContext(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'workFolder',
        message: 'Work folder information is required',
        code: 'MISSING_WORK_FOLDER',
      });
    });

    it('should validate work folder fields', () => {
      const invalidContext = createValidProjectContext();
      invalidContext.workFolder = {
        path: '',
        name: '',
        type: 'invalid' as unknown as 'project' | 'workspace' | 'folder',
        technologies: ['valid', ''],
        lastModified: new Date('invalid'),
      };

      const result = ContextValidator.validateProjectContext(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'workFolder.path',
        message: 'Work folder path must be a non-empty string',
        code: 'INVALID_WORK_FOLDER_PATH',
      });
      expect(result.errors).toContainEqual({
        field: 'workFolder.type',
        message: 'Work folder type must be project, workspace, or folder',
        code: 'INVALID_WORK_FOLDER_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'workFolder.technologies[1]',
        message: 'Each technology must be a non-empty string',
        code: 'INVALID_TECHNOLOGY',
      });
    });

    it('should warn about high number of active flows', () => {
      const contextWithManyFlows = createValidProjectContext();
      contextWithManyFlows.activeFlows = Array(12)
        .fill(null)
        .map((_, i) => ({
          id: `flow-${i}`,
          name: `Flow ${i}`,
          status: 'active' as const,
          progress: 50,
          currentStep: 'Step',
        }));

      const result = ContextValidator.validateProjectContext(contextWithManyFlows);

      expect(result.warnings).toContainEqual({
        field: 'activeFlows',
        message: 'High number of active flows (12). Consider consolidating or prioritizing.',
        code: 'HIGH_ACTIVE_FLOW_COUNT',
      });
    });

    it('should validate flow info fields', () => {
      const invalidContext = createValidProjectContext();
      invalidContext.activeFlows = [
        {
          id: '',
          name: '',
          status: 'invalid' as unknown as 'active' | 'paused' | 'completed' | 'failed',
          progress: 150,
          currentStep: '',
        },
      ];

      const result = ContextValidator.validateProjectContext(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'activeFlows[0].id',
        message: 'Flow ID must be a non-empty string',
        code: 'INVALID_FLOW_ID',
      });
      expect(result.errors).toContainEqual({
        field: 'activeFlows[0].status',
        message: 'Flow status must be active, paused, completed, or failed',
        code: 'INVALID_FLOW_STATUS',
      });
      expect(result.errors).toContainEqual({
        field: 'activeFlows[0].progress',
        message: 'Flow progress must be a number between 0 and 100',
        code: 'INVALID_FLOW_PROGRESS',
      });
    });

    it('should validate tool info fields', () => {
      const invalidContext = createValidProjectContext();
      invalidContext.availableTools = [
        {
          name: '',
          version: '',
          isAvailable: 'true' as unknown as boolean,
          capabilities: ['valid', ''],
        },
      ];

      const result = ContextValidator.validateProjectContext(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'availableTools[0].name',
        message: 'Tool name must be a non-empty string',
        code: 'INVALID_TOOL_NAME',
      });
      expect(result.errors).toContainEqual({
        field: 'availableTools[0].isAvailable',
        message: 'Tool availability must be a boolean',
        code: 'INVALID_TOOL_AVAILABILITY',
      });
      expect(result.errors).toContainEqual({
        field: 'availableTools[0].capabilities[1]',
        message: 'Each capability must be a non-empty string',
        code: 'INVALID_TOOL_CAPABILITY',
      });
    });

    it('should validate project state fields', () => {
      const invalidContext = createValidProjectContext();
      invalidContext.projectState = {
        phase: 'invalid' as unknown as 'planning' | 'development' | 'testing' | 'deployment' | 'maintenance',
        completionPercentage: 150,
        activeFeatures: ['valid', ''],
        blockers: [
          {
            id: '',
            description: '',
            severity: 'invalid' as unknown as 'low' | 'medium' | 'high' | 'critical',
            assignee: '',
          },
        ],
      };

      const result = ContextValidator.validateProjectContext(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'projectState.phase',
        message: 'Project phase must be planning, development, testing, deployment, or maintenance',
        code: 'INVALID_PROJECT_PHASE',
      });
      expect(result.errors).toContainEqual({
        field: 'projectState.completionPercentage',
        message: 'Completion percentage must be a number between 0 and 100',
        code: 'INVALID_COMPLETION_PERCENTAGE',
      });
      expect(result.errors).toContainEqual({
        field: 'projectState.blockers[0].severity',
        message: 'Blocker severity must be low, medium, high, or critical',
        code: 'INVALID_BLOCKER_SEVERITY',
      });
    });

    it('should validate technical ecosystem fields', () => {
      const invalidContext = createValidProjectContext();
      invalidContext.technicalEcosystem = {
        framework: '',
        language: '',
        runtime: '',
        dependencies: [
          {
            name: '',
            version: '',
            type: 'invalid' as unknown as 'runtime' | 'dev' | 'peer',
            isOutdated: 'false' as unknown as boolean,
          },
        ],
        buildTools: ['valid', ''],
      };

      const result = ContextValidator.validateProjectContext(invalidContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'technicalEcosystem.framework',
        message: 'Framework must be a non-empty string',
        code: 'INVALID_FRAMEWORK',
      });
      expect(result.errors).toContainEqual({
        field: 'technicalEcosystem.dependencies[0].type',
        message: 'Dependency type must be runtime, dev, or peer',
        code: 'INVALID_DEPENDENCY_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'technicalEcosystem.buildTools[1]',
        message: 'Each build tool must be a non-empty string',
        code: 'INVALID_BUILD_TOOL',
      });
    });
  });

  describe('validateFlowState', () => {
    const createValidFlowState = (): FlowState => ({
      currentFlows: [
        {
          id: 'flow-1',
          name: 'Active Flow',
          status: 'active',
          progress: 50,
          currentStep: 'Step 1',
        },
      ],
      completedFlows: [],
      queuedFlows: [],
      totalFlowCount: 1,
      activeFlowCount: 1,
      flowHistory: [
        {
          flowId: 'flow-1',
          action: 'started',
          timestamp: new Date('2024-01-01'),
          duration: 3600,
        },
      ],
    });

    it('should validate a valid FlowState', () => {
      const validFlowState = createValidFlowState();
      const result = ContextValidator.validateFlowState(validFlowState);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid flow arrays', () => {
      const invalidFlowState = createValidFlowState();
      invalidFlowState.currentFlows = 'not-an-array' as unknown as FlowInfo[];
      invalidFlowState.completedFlows = 'not-an-array' as unknown as FlowInfo[];

      const result = ContextValidator.validateFlowState(invalidFlowState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'currentFlows',
        message: 'Current flows must be an array',
        code: 'INVALID_CURRENT_FLOWS_TYPE',
      });
      expect(result.errors).toContainEqual({
        field: 'completedFlows',
        message: 'Completed flows must be an array',
        code: 'INVALID_COMPLETED_FLOWS_TYPE',
      });
    });

    it('should reject invalid numeric fields', () => {
      const invalidFlowState = createValidFlowState();
      invalidFlowState.totalFlowCount = -1;
      invalidFlowState.activeFlowCount = -1;

      const result = ContextValidator.validateFlowState(invalidFlowState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'totalFlowCount',
        message: 'Total flow count must be a non-negative number',
        code: 'INVALID_TOTAL_FLOW_COUNT',
      });
      expect(result.errors).toContainEqual({
        field: 'activeFlowCount',
        message: 'Active flow count must be a non-negative number',
        code: 'INVALID_ACTIVE_FLOW_COUNT',
      });
    });

    it('should warn about inconsistent active flow count', () => {
      const inconsistentFlowState = createValidFlowState();
      inconsistentFlowState.activeFlowCount = 5; // but only 1 active flow in array

      const result = ContextValidator.validateFlowState(inconsistentFlowState);

      expect(result.warnings).toContainEqual({
        field: 'activeFlowCount',
        message: "Active flow count (5) doesn't match actual active flows (1)",
        code: 'INCONSISTENT_ACTIVE_FLOW_COUNT',
      });
    });

    it('should validate flow history entries', () => {
      const invalidFlowState = createValidFlowState();
      invalidFlowState.flowHistory = [
        {
          flowId: '',
          action: 'invalid' as unknown as 'started' | 'paused' | 'resumed' | 'completed' | 'failed',
          timestamp: new Date('invalid'),
          duration: -1,
          reason: '',
        },
      ];

      const result = ContextValidator.validateFlowState(invalidFlowState);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'flowHistory[0].flowId',
        message: 'Flow ID must be a non-empty string',
        code: 'INVALID_FLOW_HISTORY_ID',
      });
      expect(result.errors).toContainEqual({
        field: 'flowHistory[0].action',
        message: 'Flow action must be started, paused, resumed, completed, or failed',
        code: 'INVALID_FLOW_ACTION',
      });
      expect(result.errors).toContainEqual({
        field: 'flowHistory[0].duration',
        message: 'Duration must be a non-negative number if provided',
        code: 'INVALID_FLOW_DURATION',
      });
    });
  });

  describe('ContextEnricher', () => {
    it('should enrich context with recommendations for outdated dependencies', () => {
      const context = createValidProjectContext();
      context.technicalEcosystem.dependencies = [
        {
          name: 'old-package',
          version: '1.0.0',
          type: 'runtime',
          isOutdated: true,
        },
      ];

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.recommendations).toContainEqual({
        type: 'security',
        description: 'Update 1 outdated dependencies to improve security and performance',
        priority: 'high',
        actionable: true,
      });
    });

    it('should enrich context with recommendations for many active flows', () => {
      const context = createValidProjectContext();
      context.activeFlows = Array(6)
        .fill(null)
        .map((_, i) => ({
          id: `flow-${i}`,
          name: `Flow ${i}`,
          status: 'active' as const,
          progress: 50,
          currentStep: 'Step',
        }));

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.recommendations).toContainEqual({
        type: 'optimization',
        description: 'Consider consolidating or prioritizing active flows to improve focus',
        priority: 'medium',
        actionable: true,
      });
    });

    it('should enrich context with warnings for unavailable tools', () => {
      const context = createValidProjectContext();
      context.availableTools = [
        {
          name: 'UnavailableTool',
          version: '1.0.0',
          isAvailable: false,
          capabilities: ['testing'],
        },
      ];

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.warnings).toContainEqual({
        type: 'compatibility',
        message: '1 tools are currently unavailable: UnavailableTool',
        severity: 'warning',
        source: 'tool-availability',
      });
    });

    it('should enrich context with warnings for paused flows', () => {
      const context = createValidProjectContext();
      context.activeFlows = [
        {
          id: 'flow-1',
          name: 'Paused Flow',
          status: 'paused',
          progress: 50,
          currentStep: 'Step',
        },
      ];

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.warnings).toContainEqual({
        type: 'performance',
        message: '1 flows are currently paused and may need attention',
        severity: 'info',
        source: 'flow-management',
      });
    });

    it('should enrich context with opportunities for automation', () => {
      const context = createValidProjectContext();
      context.activeFlows = Array(4)
        .fill(null)
        .map((_, i) => ({
          id: `flow-${i}`,
          name: `Flow ${i}`,
          status: 'active' as const,
          progress: 50,
          currentStep: 'Step',
        }));
      context.projectState.phase = 'development';

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.opportunities).toContainEqual({
        type: 'automation',
        description: 'Implement automated testing and CI/CD pipeline to streamline development flows',
        estimatedImpact: 'high',
        effort: 'moderate',
      });
    });

    it('should enrich context with opportunities for integration', () => {
      const context = createValidProjectContext();
      context.availableTools = Array(6)
        .fill(null)
        .map((_, i) => ({
          name: `Tool${i}`,
          version: '1.0.0',
          isAvailable: true,
          capabilities: ['capability'],
        }));

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.opportunities).toContainEqual({
        type: 'integration',
        description: 'Leverage available tools for better workflow integration and productivity',
        estimatedImpact: 'medium',
        effort: 'minimal',
      });
    });

    it('should enrich context with opportunities for optimization', () => {
      const context = createValidProjectContext();
      context.projectState.completionPercentage = 75;
      context.projectState.blockers = [];

      const enriched = ContextEnricher.enrichContext(context);

      expect(enriched.opportunities).toContainEqual({
        type: 'optimization',
        description: 'Optimize performance and code quality as project approaches completion',
        estimatedImpact: 'medium',
        effort: 'moderate',
      });
    });
  });
});
