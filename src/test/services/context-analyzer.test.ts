// Unit tests for Context Analyzer service
// Uses dependency injection for fs module instead of vi.mock('fs')

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextAnalyzer, ContextChangeObservable, type ContextObserver } from '../../services/context-analyzer';
import type { ProjectContext, ContextChange } from '../../models/context';

// Mock child_process to prevent actual command execution in tests
vi.mock('child_process', () => ({
  execSync: vi.fn().mockImplementation(() => {
    throw new Error('Command not found');
  }),
}));

function createMockFs(): any {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
    readdirSync: vi.fn(),
    promises: {},
    constants: {},
  };
}

describe('ContextAnalyzer', () => {
  let contextAnalyzer: ContextAnalyzer;
  let mockFs: ReturnType<typeof createMockFs>;
  let mockProcessCwd: string;

  beforeEach(() => {
    mockFs = createMockFs();
    contextAnalyzer = new ContextAnalyzer(mockFs);
    mockProcessCwd = '/test-project';
    vi.clearAllMocks();
    vi.spyOn(globalThis.process, 'cwd').mockReturnValue(mockProcessCwd);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeProjectContext', () => {
    it('should analyze a basic Node.js project context', async () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        const p = String(path).replace(/\\/g, '/');
        if (p.includes('package.json')) return true;
        if (p.includes('tsconfig.json')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (String(path).replace(/\\/g, '/').includes('package.json')) {
          return JSON.stringify({
            name: 'test-project',
            dependencies: { express: '^4.18.0' },
            devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
            scripts: { build: 'tsc', test: 'vitest' },
          });
        }
        return '';
      });
      mockFs.statSync.mockReturnValue({ mtime: new Date('2024-01-01') });

      const context = await contextAnalyzer.analyzeProjectContext();

      expect(context).toBeDefined();
      expect(context.workFolder.name).toBe('test-project');
      expect(context.workFolder.type).toBe('project');
      expect(context.workFolder.technologies).toContain('typescript');
      expect(context.technicalEcosystem.framework).toBe('node');
      expect(context.technicalEcosystem.language).toBe('typescript');
    });

    it('should handle Nuxt.js project detection', async () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        const p = String(path).replace(/\\/g, '/');
        if (p.includes('package.json')) return true;
        return false;
      });
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (String(path).replace(/\\/g, '/').includes('package.json')) {
          return JSON.stringify({
            name: 'nuxt-project',
            dependencies: { nuxt: '^3.8.0' },
          });
        }
        return '';
      });
      mockFs.statSync.mockReturnValue({ mtime: new Date('2024-01-01') });

      const context = await contextAnalyzer.analyzeProjectContext();

      expect(context.workFolder.technologies).toContain('nuxt');
      expect(context.technicalEcosystem.framework).toBe('nuxt');
    });

    it('should return fallback context on error', async () => {
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });
      const context = await contextAnalyzer.analyzeProjectContext();
      expect(context).toBeDefined();
      expect(context.workFolder.type).toBe('folder');
      expect(context.activeFlows).toEqual([]);
      expect(context.availableTools.every((tool) => !tool.isAvailable)).toBe(true);
    });

    it('should cache context results', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.statSync.mockReturnValue({ mtime: new Date() });
      vi.clearAllMocks();
      const context1 = await contextAnalyzer.analyzeProjectContext();
      const firstCallCount = mockFs.existsSync.mock.calls.length;
      const context2 = await contextAnalyzer.analyzeProjectContext();
      const secondCallCount = mockFs.existsSync.mock.calls.length;
      expect(context1).toBe(context2);
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('getFlowState', () => {
    it('should analyze active flows from Kiro specs', async () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        const p = String(path).replace(/\\/g, '/');
        if (p.includes('.kiro/specs')) return true;
        if (p.includes('01-test-spec')) return true;
        if (p.includes('02-another-spec')) return true;
        return false;
      });
      mockFs.readdirSync.mockReturnValue([
        { name: '01-test-spec', isDirectory: () => true },
        { name: '02-another-spec', isDirectory: () => true },
      ]);
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (path.includes('01-test-spec')) {
          return '# Implementation Plan\n\n- [x] 1. Completed task\n- [-] 2. In progress task\n- [ ] 3. Pending task\n- [ ] 4. Another pending task';
        }
        if (path.includes('02-another-spec')) {
          return '# Implementation Plan\n\n- [x] 1. All done\n- [x] 2. Also done';
        }
        return '';
      });
      mockFs.statSync.mockReturnValue({ mtime: new Date() });

      const flowState = await contextAnalyzer.getFlowState();
      expect(flowState.currentFlows.length).toBe(2);

      const flow1 = flowState.currentFlows.find((f) => f.id === '01-test-spec');
      expect(flow1).toBeDefined();
      expect(flow1!.name).toBe('test spec');
      expect(flow1!.progress).toBe(25);
      expect(flow1!.status).toBe('active');

      const flow2 = flowState.currentFlows.find((f) => f.id === '02-another-spec');
      expect(flow2).toBeDefined();
      expect(flow2!.progress).toBe(100);
      expect(flow2!.status).toBe('completed');
    });

    it('should handle missing specs directory', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const flowState = await contextAnalyzer.getFlowState();
      expect(flowState.currentFlows).toEqual([]);
      expect(flowState.totalFlowCount).toBe(0);
      expect(flowState.activeFlowCount).toBe(0);
    });

    it('should handle malformed task files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([{ name: 'broken-spec', isDirectory: () => true }]);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      const flowState = await contextAnalyzer.getFlowState();
      expect(flowState.currentFlows).toEqual([]);
    });
  });

  describe('detectContextChanges', () => {
    it('should return observable for context changes', () => {
      const observable = contextAnalyzer.detectContextChanges();
      expect(observable).toBeInstanceOf(ContextChangeObservable);
    });

    it('should notify observers of context changes', () => {
      const observable = contextAnalyzer.detectContextChanges();
      const mockObserver: ContextObserver = { update: vi.fn() };
      const unsubscribe = observable.subscribe(mockObserver);
      const change: ContextChange = {
        type: 'flow',
        action: 'added',
        target: 'test-flow',
        timestamp: new Date(),
        impact: 'medium',
      };
      observable.notify(change);
      expect(mockObserver.update).toHaveBeenCalledWith(change);
      unsubscribe();
    });
  });

  describe('enrichContext', () => {
    let baseContext: ProjectContext;

    beforeEach(() => {
      baseContext = {
        workFolder: {
          path: '/test-project',
          name: 'test-project',
          type: 'project',
          technologies: ['typescript', 'node'],
          lastModified: new Date(),
        },
        activeFlows: [],
        availableTools: [
          { name: 'git', version: '2.40.0', isAvailable: true, capabilities: ['version-control'] },
          { name: 'node', version: '18.17.0', isAvailable: true, capabilities: ['javascript-runtime'] },
          { name: 'typescript', version: '3.9.0', isAvailable: true, capabilities: ['type-checking'] },
        ],
        projectState: {
          phase: 'development',
          completionPercentage: 50,
          activeFeatures: ['auth', 'api'],
          blockers: [],
        },
        technicalEcosystem: {
          framework: 'node',
          language: 'typescript',
          runtime: 'node',
          dependencies: [{ name: 'express', version: '^4.18.0', type: 'runtime', isOutdated: false }],
          buildTools: ['tsc'],
        },
      };
    });

    it('should enrich context with flow state integration', async () => {
      vi.spyOn(contextAnalyzer, 'getFlowState').mockResolvedValue({
        currentFlows: [
          { id: 'flow1', name: 'Flow 1', status: 'active', progress: 50, currentStep: 'Step 1' },
          { id: 'flow2', name: 'Flow 2', status: 'paused', progress: 30, currentStep: 'Step 2' },
          { id: 'flow3', name: 'Flow 3', status: 'active', progress: 85, currentStep: 'Step 3' },
        ],
        completedFlows: [],
        queuedFlows: [],
        totalFlowCount: 3,
        activeFlowCount: 2,
        flowHistory: [],
      });

      const enrichedContext = await contextAnalyzer.enrichContext(baseContext);
      expect(enrichedContext.recommendations).toBeDefined();
      expect(enrichedContext.warnings).toBeDefined();
      expect(enrichedContext.opportunities).toBeDefined();

      const pausedFlowWarning = enrichedContext.warnings.find((w) => w.message.includes('paused'));
      expect(pausedFlowWarning).toBeDefined();

      const completionOpportunity = enrichedContext.opportunities.find((o) =>
        o.description.includes('near completion'),
      );
      expect(completionOpportunity).toBeDefined();
    });

    it('should enrich context with tool availability analysis', async () => {
      vi.spyOn(contextAnalyzer, 'getFlowState').mockResolvedValue({
        currentFlows: [],
        completedFlows: [],
        queuedFlows: [],
        totalFlowCount: 0,
        activeFlowCount: 0,
        flowHistory: [],
      });
      const enrichedContext = await contextAnalyzer.enrichContext(baseContext);
      const outdatedRec = enrichedContext.recommendations.find((r) => r.description.includes('outdated tools'));
      expect(outdatedRec).toBeDefined();
    });

    it('should enrich context with project-specific analysis', async () => {
      vi.spyOn(contextAnalyzer, 'getFlowState').mockResolvedValue({
        currentFlows: [],
        completedFlows: [],
        queuedFlows: [],
        totalFlowCount: 0,
        activeFlowCount: 0,
        flowHistory: [],
      });
      mockFs.existsSync.mockImplementation((path: string) => {
        const p = String(path).replace(/\\/g, '/');
        if (p.includes('README.md')) return false;
        return true;
      });
      const enrichedContext = await contextAnalyzer.enrichContext(baseContext);
      const readmeRec = enrichedContext.recommendations.find((r) => r.description.includes('README.md'));
      expect(readmeRec).toBeDefined();
    });

    it('should handle enrichment errors gracefully', async () => {
      vi.spyOn(contextAnalyzer, 'getFlowState').mockRejectedValue(new Error('Flow state error'));
      const enrichedContext = await contextAnalyzer.enrichContext(baseContext);
      expect(enrichedContext).toBeDefined();
      expect(enrichedContext.recommendations).toEqual([]);
      expect(enrichedContext.warnings).toEqual([]);
      expect(enrichedContext.opportunities).toEqual([]);
    });
  });

  describe('ContextChangeObservable', () => {
    let observable: ContextChangeObservable;
    let mockObserver: ContextObserver;

    beforeEach(() => {
      observable = new ContextChangeObservable();
      mockObserver = { update: vi.fn() };
    });

    it('should allow subscribing and unsubscribing observers', () => {
      const unsubscribe = observable.subscribe(mockObserver);
      expect(typeof unsubscribe).toBe('function');
      const change: ContextChange = {
        type: 'flow',
        action: 'added',
        target: 'test-flow',
        timestamp: new Date(),
        impact: 'medium',
      };
      observable.notify(change);
      expect(mockObserver.update).toHaveBeenCalledWith(change);
      unsubscribe();
      vi.clearAllMocks();
      observable.notify(change);
      expect(mockObserver.update).not.toHaveBeenCalled();
    });

    it('should maintain change history', () => {
      const c1: ContextChange = {
        type: 'flow',
        action: 'added',
        target: 'flow1',
        timestamp: new Date(),
        impact: 'medium',
      };
      const c2: ContextChange = {
        type: 'tool',
        action: 'modified',
        target: 'git',
        timestamp: new Date(),
        impact: 'low',
      };
      observable.notify(c1);
      observable.notify(c2);
      const history = observable.getChangeHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(c1);
      expect(history[1]).toEqual(c2);
    });

    it('should limit change history to prevent memory leaks', () => {
      for (let i = 0; i < 105; i++) {
        observable.notify({
          type: 'flow',
          action: 'added',
          target: 'flow-' + i,
          timestamp: new Date(),
          impact: 'low',
        });
      }
      const history = observable.getChangeHistory();
      expect(history).toHaveLength(100);
      expect(history[0].target).toBe('flow-5');
    });

    it('should notify multiple observers', () => {
      const o2: ContextObserver = { update: vi.fn() };
      observable.subscribe(mockObserver);
      observable.subscribe(o2);
      const change: ContextChange = {
        type: 'file',
        action: 'modified',
        target: 'package.json',
        timestamp: new Date(),
        impact: 'high',
      };
      observable.notify(change);
      expect(mockObserver.update).toHaveBeenCalledWith(change);
      expect(o2.update).toHaveBeenCalledWith(change);
    });
  });

  describe('Integration Tests', () => {
    it('should perform complete context analysis workflow', async () => {
      vi.clearAllMocks();
      mockFs.existsSync.mockImplementation((path: string) => {
        const p = String(path).replace(/\\/g, '/');
        if (p.includes('package.json')) return true;
        if (p.includes('tsconfig.json')) return true;
        if (p.includes('README.md')) return false;
        return false;
      });
      mockFs.readFileSync.mockImplementation((path: string) => {
        if (String(path).replace(/\\/g, '/').includes('package.json')) {
          return JSON.stringify({
            name: 'integration-test-project',
            dependencies: { express: '^4.18.0' },
            devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0' },
            scripts: { build: 'tsc', test: 'vitest' },
          });
        }
        return '';
      });
      mockFs.statSync.mockReturnValue({ mtime: new Date() });

      const integrationAnalyzer = new ContextAnalyzer(mockFs);
      const context = await integrationAnalyzer.analyzeProjectContext();
      const enrichedContext = await integrationAnalyzer.enrichContext(context);

      expect(context.workFolder.type).toBe('project');
      expect(context.workFolder.technologies).toContain('typescript');
      expect(enrichedContext.recommendations.length).toBeGreaterThan(0);
      expect(enrichedContext.warnings).toBeDefined();
      expect(enrichedContext.opportunities).toBeDefined();

      const hasReadmeRec = enrichedContext.recommendations.some((r) => r.description.includes('README.md'));
      expect(hasReadmeRec).toBe(true);
    });
  });
});
