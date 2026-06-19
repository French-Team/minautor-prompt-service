// Context Analyzer Service - Full implementation for project context analysis

import type { IContextAnalyzer } from '../config/di-container';
import type {
  ProjectContext,
  FlowState,
  ContextChange,
  EnrichedContext,
  WorkFolderInfo,
  FlowInfo,
  ToolInfo,
  ProjectState,
  TechEcosystem,
  FlowHistoryEntry,
  TechDependency,
} from '../models/context';
import { loggingService } from './error-handling';

// Browser-compatible path utilities (replaces Node.js 'path' module)
function joinPath(...parts: string[]): string {
  return parts
    .map((p) =>
      String(p)
        .replace(/[/\\]$/, '')
        .replace(/\\/g, '/'),
    )
    .filter(Boolean)
    .join('/');
}

function basenamePath(p: string): string {
  return String(p).replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
}

/**
 * Retourne le chemin du répertoire de travail courant de façon sécurisée.
 * Côté client (navigateur), process.cwd() n'existe pas — on retourne '.'
 * Le try/catch est inutile car typeof ne throw jamais.
 */
export function safeCwd(): string {
  if (typeof process !== 'undefined' && typeof (process as { cwd?: () => string }).cwd === 'function') {
    return (process as { cwd: () => string }).cwd();
  }
  return '.';
}

// Browser-compatible minimal FileSystem interface (replaces Node.js 'fs' module)
interface FileSystem {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding?: string): string;
  statSync(path: string): { mtime: Date };
  readdirSync(path: string, options?: { withFileTypes?: boolean }): { name: string; isDirectory: () => boolean }[];
}

// Observable pattern implementation for context changes
export interface ContextObserver {
  update(_change: ContextChange): void;
}

export class ContextChangeObservable {
  private observers: ContextObserver[] = [];
  private changeHistory: ContextChange[] = [];

  subscribe(observer: ContextObserver): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  notify(change: ContextChange): void {
    this.changeHistory.push(change);
    // Keep only last 100 changes to prevent memory leaks
    if (this.changeHistory.length > 100) {
      this.changeHistory.shift();
    }

    this.observers.forEach((observer) => observer.update(change));
  }

  getChangeHistory(): ContextChange[] {
    return [...this.changeHistory];
  }
}

export class ContextAnalyzer implements IContextAnalyzer {
  private changeObservable = new ContextChangeObservable();
  private lastAnalyzedContext: ProjectContext | null = null;
  private contextCache: Map<string, { context: ProjectContext; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private fs: FileSystem;
  private _degradedMode = false;
  private _workFolderOverride: string | null = null;

  constructor(fs?: FileSystem) {
    this.fs = fs ?? this.createFallbackFs();
    this._degradedMode = !this.hasFileSystemAccess();
  }

  /**
   * Vide le cache de contexte pour forcer une analyse fraîche au prochain appel.
   */
  clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Valide qu'un dossier existe sur le filesystem.
   * Côté client (mode dégradé), on ne peut pas vérifier les chemins serveur → retourne true.
   */
  async validateFolder(path: string): Promise<boolean> {
    if (this._degradedMode) return true;
    try {
      return this.fs.existsSync(path);
    } catch {
      return false;
    }
  }

  /**
   * Surcharge le dossier de travail (utile côté client quand process.cwd() n'est pas disponible).
   */
  setWorkFolder(path: string): void {
    this._workFolderOverride = path;
    this.contextCache.clear();
  }

  /**
   * Retourne le CWD : surcharge utilisateur si définie, sinon safeCwd().
   */
  private getCwd(): string {
    return this._workFolderOverride ?? safeCwd();
  }

  /**
   * Indique si l'analyseur fonctionne en mode dégradé (côté client, sans FS réel).
   */
  isDegradedMode(): boolean {
    return this._degradedMode;
  }

  /**
   * Détecte si on est côté serveur avec un vrai filesystem.
   * safeCwd() retourne '.' quand process.cwd() n'est pas disponible (côté client).
   */
  private hasFileSystemAccess(): boolean {
    return safeCwd() !== '.';
  }

  private createFallbackFs(): FileSystem {
    return {
      existsSync: () => false,
      readFileSync: () => {
        throw new Error('fs not available in browser context');
      },
      statSync: () => {
        throw new Error('fs not available in browser context');
      },
      readdirSync: () => {
        throw new Error('fs not available in browser context');
      },
    };
  }

  /**
   * Analyzes the current project context by examining files, configuration, and project state
   * Requirements: 4.1, 4.2, 4.3
   */
  async analyzeProjectContext(): Promise<ProjectContext> {
    const cacheKey = 'current-project';
    const cached = this.contextCache.get(cacheKey);

    // Return cached context if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.context;
    }

    try {
      const workFolder = await this.analyzeWorkFolder();
      const activeFlows = await this.analyzeActiveFlows();
      const availableTools = await this.analyzeAvailableTools();
      const projectState = await this.analyzeProjectState();
      const technicalEcosystem = await this.analyzeTechnicalEcosystem();

      const context: ProjectContext = {
        workFolder,
        activeFlows,
        availableTools,
        projectState,
        technicalEcosystem,
      };

      // Cache the context
      this.contextCache.set(cacheKey, { context, timestamp: Date.now() });

      // Detect changes if we have a previous context
      if (this.lastAnalyzedContext) {
        this.detectAndNotifyChanges(this.lastAnalyzedContext, context);
      }

      this.lastAnalyzedContext = context;
      return context;
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error analyzing project context:', { error });
      // Return fallback context
      return this.getFallbackContext();
    }
  }

  /**
   * Gets the current flow state including active, completed, and queued flows
   * Requirements: 4.1, 4.2
   */
  async getFlowState(): Promise<FlowState> {
    try {
      const activeFlows = await this.analyzeActiveFlows();
      const completedFlows = await this.getCompletedFlows();
      const queuedFlows = await this.getQueuedFlows();
      const flowHistory = await this.getFlowHistory();

      return {
        currentFlows: activeFlows,
        completedFlows,
        queuedFlows,
        totalFlowCount: activeFlows.length + completedFlows.length + queuedFlows.length,
        activeFlowCount: activeFlows.filter((f) => f.status === 'active').length,
        flowHistory,
      };
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error getting flow state:', { error });
      return {
        currentFlows: [],
        completedFlows: [],
        queuedFlows: [],
        totalFlowCount: 0,
        activeFlowCount: 0,
        flowHistory: [],
      };
    }
  }

  /**
   * Detects context changes using Observable pattern
   * Requirements: 4.3
   */
  detectContextChanges(): ContextChangeObservable {
    return this.changeObservable;
  }

  /**
   * Enriches context with recommendations, warnings, and opportunities
   * Integrates flow state and tool availability for comprehensive analysis
   * Requirements: 4.4
   */
  async enrichContext(baseContext: ProjectContext): Promise<EnrichedContext> {
    try {
      // Get current flow state for enrichment
      const flowState = await this.getFlowState();

      // Perform base enrichment using ContextEnricher
      const { ContextEnricher } = await import('../models/context');
      const enrichedContext = ContextEnricher.enrichContext(baseContext);

      // Add flow state integration enrichments
      const flowEnrichments = await this.enrichWithFlowState(baseContext, flowState);

      // Add tool availability enrichments
      const toolEnrichments = await this.enrichWithToolAvailability(baseContext);

      // Add project-specific enrichments
      const projectEnrichments = await this.enrichWithProjectAnalysis(baseContext);

      // Merge all enrichments
      return {
        ...enrichedContext,
        recommendations: [
          ...enrichedContext.recommendations,
          ...(flowEnrichments.recommendations || []),
          ...(toolEnrichments.recommendations || []),
          ...(projectEnrichments.recommendations || []),
        ],
        warnings: [
          ...enrichedContext.warnings,
          ...(flowEnrichments.warnings || []),
          ...(toolEnrichments.warnings || []),
          ...(projectEnrichments.warnings || []),
        ],
        opportunities: [
          ...enrichedContext.opportunities,
          ...(flowEnrichments.opportunities || []),
          ...(toolEnrichments.opportunities || []),
          ...(projectEnrichments.opportunities || []),
        ],
      };
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error enriching context:', { error });
      // Return base context with empty enrichment data
      return {
        ...baseContext,
        recommendations: [],
        warnings: [],
        opportunities: [],
      };
    }
  }

  /**
   * Enriches context based on flow state analysis
   */
  private async enrichWithFlowState(_context: ProjectContext, flowState: FlowState): Promise<Partial<EnrichedContext>> {
    const recommendations: EnrichedContext['recommendations'] = [];
    const warnings: EnrichedContext['warnings'] = [];
    const opportunities: EnrichedContext['opportunities'] = [];

    // Analyze flow efficiency
    if (flowState.activeFlowCount > 5) {
      recommendations.push({
        type: 'optimization',
        description: `Consider consolidating ${flowState.activeFlowCount} active flows to improve focus and reduce context switching`,
        priority: 'medium',
        actionable: true,
      });
    }

    // Check for stalled flows
    const stalledFlows = flowState.currentFlows.filter((f) => f.status === 'paused');
    if (stalledFlows.length > 0) {
      warnings.push({
        type: 'performance',
        message: `${stalledFlows.length} flows are paused: ${stalledFlows.map((f) => f.name).join(', ')}`,
        severity: 'warning',
        source: 'flow-analysis',
      });

      recommendations.push({
        type: 'maintainability',
        description: 'Review and resume paused flows or mark them as completed/cancelled',
        priority: 'medium',
        actionable: true,
      });
    }

    // Check for flow completion opportunities
    const nearCompletionFlows = flowState.currentFlows.filter((f) => f.progress > 80 && f.status === 'active');
    if (nearCompletionFlows.length > 0) {
      opportunities.push({
        type: 'optimization',
        description: `${nearCompletionFlows.length} flows are near completion and could be prioritized for quick wins`,
        estimatedImpact: 'medium',
        effort: 'minimal',
      });
    }

    // Analyze flow history for patterns
    if (flowState.flowHistory.length > 10) {
      const recentFailures = flowState.flowHistory.filter(
        (h) => h.action === 'failed' && Date.now() - h.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000,
      ); // Last 7 days

      if (recentFailures.length > 2) {
        warnings.push({
          type: 'performance',
          message: `${recentFailures.length} flow failures in the last week may indicate systemic issues`,
          severity: 'warning',
          source: 'flow-history',
        });
      }
    }

    return { recommendations, warnings, opportunities };
  }

  /**
   * Enriches context based on tool availability analysis
   */
  private async enrichWithToolAvailability(context: ProjectContext): Promise<Partial<EnrichedContext>> {
    const recommendations: EnrichedContext['recommendations'] = [];
    const warnings: EnrichedContext['warnings'] = [];
    const opportunities: EnrichedContext['opportunities'] = [];

    // Check for missing essential tools
    const essentialTools = ['git', 'node', 'npm'];
    const missingEssentialTools = essentialTools.filter(
      (toolName) => !context.availableTools.some((tool) => tool.name === toolName && tool.isAvailable),
    );

    if (missingEssentialTools.length > 0) {
      warnings.push({
        type: 'compatibility',
        message: `Essential tools not available: ${missingEssentialTools.join(', ')}`,
        severity: 'error',
        source: 'tool-availability',
      });

      recommendations.push({
        type: 'maintainability',
        description: `Install missing essential tools: ${missingEssentialTools.join(', ')}`,
        priority: 'high',
        actionable: true,
      });
    }

    // Check for development tools that could improve workflow
    const recommendedDevTools = [
      { name: 'typescript', description: 'Type safety and better IDE support' },
      { name: 'eslint', description: 'Code quality and consistency' },
      { name: 'vitest', description: 'Fast unit testing' },
    ];

    const missingDevTools = recommendedDevTools.filter(
      (tool) =>
        !context.availableTools.some((availableTool) => availableTool.name === tool.name && availableTool.isAvailable),
    );

    if (missingDevTools.length > 0) {
      opportunities.push({
        type: 'automation',
        description: `Consider adding development tools: ${missingDevTools.map((t) => t.name).join(', ')} for improved workflow`,
        estimatedImpact: 'medium',
        effort: 'minimal',
      });
    }

    // Check for tool version issues
    const outdatedTools = context.availableTools.filter(
      (tool) => tool.isAvailable && this.isToolVersionOutdated(tool.name, tool.version),
    );

    if (outdatedTools.length > 0) {
      recommendations.push({
        type: 'security',
        description: `Update outdated tools: ${outdatedTools.map((t) => `${t.name} (${t.version})`).join(', ')}`,
        priority: 'medium',
        actionable: true,
      });
    }

    // Check for tool integration opportunities
    const availableTools = context.availableTools.filter((tool) => tool.isAvailable);
    if (availableTools.length >= 3) {
      opportunities.push({
        type: 'integration',
        description: 'Consider setting up automated workflows with available tools for CI/CD pipeline',
        estimatedImpact: 'high',
        effort: 'moderate',
      });
    }

    return { recommendations, warnings, opportunities };
  }

  /**
   * Enriches context based on project-specific analysis
   */
  private async enrichWithProjectAnalysis(context: ProjectContext): Promise<Partial<EnrichedContext>> {
    const recommendations: EnrichedContext['recommendations'] = [];
    const warnings: EnrichedContext['warnings'] = [];
    const opportunities: EnrichedContext['opportunities'] = [];

    // Analyze project structure and suggest improvements
    if (context.workFolder.type === 'project') {
      // Check for documentation
      const hasReadme = this.fs.existsSync(joinPath(context.workFolder.path, 'README.md'));
      if (!hasReadme) {
        recommendations.push({
          type: 'maintainability',
          description: 'Add a README.md file to document your project',
          priority: 'medium',
          actionable: true,
        });
      }

      // Check for testing setup
      const hasTests = context.availableTools.some(
        (tool) => ['vitest', 'jest', 'mocha'].includes(tool.name) && tool.isAvailable,
      );
      if (!hasTests && context.projectState.phase === 'development') {
        opportunities.push({
          type: 'automation',
          description: 'Set up automated testing to improve code quality and catch issues early',
          estimatedImpact: 'high',
          effort: 'moderate',
        });
      }

      // Check for linting setup
      const hasLinting = context.availableTools.some((tool) => tool.name === 'eslint' && tool.isAvailable);
      if (!hasLinting) {
        recommendations.push({
          type: 'maintainability',
          description: 'Set up ESLint for consistent code style and quality',
          priority: 'medium',
          actionable: true,
        });
      }
    }

    // Analyze project phase and suggest next steps
    if (context.projectState.phase === 'development' && context.projectState.completionPercentage > 70) {
      opportunities.push({
        type: 'optimization',
        description: 'Project is well advanced - consider preparing for testing and deployment phases',
        estimatedImpact: 'medium',
        effort: 'moderate',
      });
    }

    // Check for technology stack consistency
    const hasTypeScript = context.technicalEcosystem.language === 'typescript';
    const hasTypeScriptTool = context.availableTools.some((tool) => tool.name === 'typescript' && tool.isAvailable);

    if (hasTypeScript && !hasTypeScriptTool) {
      warnings.push({
        type: 'compatibility',
        message: 'TypeScript is configured but TypeScript compiler is not available',
        severity: 'error',
        source: 'tech-stack-analysis',
      });
    }

    // Check for dependency management
    const hasDependencies = context.technicalEcosystem.dependencies.length > 0;
    const hasPackageManager = context.availableTools.some(
      (tool) => ['npm', 'yarn', 'pnpm'].includes(tool.name) && tool.isAvailable,
    );

    if (hasDependencies && !hasPackageManager) {
      warnings.push({
        type: 'compatibility',
        message: 'Project has dependencies but no package manager is available',
        severity: 'warning',
        source: 'dependency-analysis',
      });
    }

    return { recommendations, warnings, opportunities };
  }

  /**
   * Checks if a tool version is outdated (simplified implementation)
   */
  private isToolVersionOutdated(toolName: string, version: string): boolean {
    // Simplified version checking - in a real implementation, this would check against latest versions
    const knownOutdatedVersions: Record<string, string[]> = {
      node: ['14.', '12.', '10.'],
      npm: ['6.', '5.', '4.'],
      typescript: ['3.', '2.', '1.'],
    };

    const outdatedVersions = knownOutdatedVersions[toolName];
    if (!outdatedVersions) return false;

    return outdatedVersions.some((outdated) => version.startsWith(outdated));
  }

  // Private helper methods for context analysis

  private async analyzeWorkFolder(): Promise<WorkFolderInfo> {
    const currentPath = this.getCwd();
    const folderName = basenamePath(currentPath);

    try {
      const stats = this.fs.statSync(currentPath);
      const technologies = await this.detectTechnologies(currentPath);

      return {
        path: currentPath,
        name: folderName,
        type: this.determineWorkFolderType(currentPath),
        technologies,
        lastModified: stats.mtime,
      };
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error analyzing work folder:', { error });
      return {
        path: currentPath,
        name: folderName,
        type: 'folder',
        technologies: [],
        lastModified: new Date(),
      };
    }
  }

  private async detectTechnologies(projectPath: string): Promise<string[]> {
    const technologies: string[] = [];

    try {
      // Check for package.json (Node.js/JavaScript/TypeScript)
      if (this.fs.existsSync(joinPath(projectPath, 'package.json'))) {
        technologies.push('node', 'javascript');

        const packageJson = JSON.parse(this.fs.readFileSync(joinPath(projectPath, 'package.json'), 'utf-8'));

        // Check for TypeScript
        if (
          packageJson.devDependencies?.typescript ||
          packageJson.dependencies?.typescript ||
          this.fs.existsSync(joinPath(projectPath, 'tsconfig.json'))
        ) {
          technologies.push('typescript');
        }

        // Check for specific frameworks
        if (packageJson.dependencies?.nuxt || packageJson.devDependencies?.nuxt) {
          technologies.push('nuxt');
        }
        if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
          technologies.push('vue');
        }
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          technologies.push('react');
        }
        if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
          technologies.push('nextjs');
        }
      }

      // Check for other technology indicators
      if (this.fs.existsSync(joinPath(projectPath, 'Cargo.toml'))) {
        technologies.push('rust');
      }
      if (this.fs.existsSync(joinPath(projectPath, 'go.mod'))) {
        technologies.push('go');
      }
      if (
        this.fs.existsSync(joinPath(projectPath, 'requirements.txt')) ||
        this.fs.existsSync(joinPath(projectPath, 'pyproject.toml'))
      ) {
        technologies.push('python');
      }
      if (this.fs.existsSync(joinPath(projectPath, 'Dockerfile'))) {
        technologies.push('docker');
      }
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error detecting technologies:', { error });
    }

    return Array.from(new Set(technologies)); // Remove duplicates
  }

  private determineWorkFolderType(projectPath: string): 'project' | 'workspace' | 'folder' {
    // Check for project indicators
    if (
      this.fs.existsSync(joinPath(projectPath, 'package.json')) ||
      this.fs.existsSync(joinPath(projectPath, 'Cargo.toml')) ||
      this.fs.existsSync(joinPath(projectPath, 'go.mod'))
    ) {
      return 'project';
    }

    // Check for workspace indicators
    if (
      this.fs.existsSync(joinPath(projectPath, '.kiro')) ||
      this.fs.existsSync(joinPath(projectPath, '.vscode')) ||
      this.fs.existsSync(joinPath(projectPath, '.git'))
    ) {
      return 'workspace';
    }

    return 'folder';
  }

  private async analyzeActiveFlows(): Promise<FlowInfo[]> {
    const flows: FlowInfo[] = [];

    try {
      // Check for Kiro specs (active flows)
      const kirosPath = joinPath(this.getCwd(), '.kiro', 'specs');
      if (this.fs.existsSync(kirosPath)) {
        const specDirs = this.fs
          .readdirSync(kirosPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory());

        for (const specDir of specDirs) {
          const tasksPath = joinPath(kirosPath, specDir.name, 'tasks.md');
          if (this.fs.existsSync(tasksPath)) {
            const flow = await this.analyzeSpecFlow(specDir.name, tasksPath);
            if (flow) flows.push(flow);
          }
        }
      }
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error analyzing active flows:', { error });
    }

    return flows;
  }

  private async analyzeSpecFlow(specName: string, tasksPath: string): Promise<FlowInfo | null> {
    try {
      const tasksContent = this.fs.readFileSync(tasksPath, 'utf-8');

      // Parse tasks to determine progress
      const taskLines = tasksContent.split('\n').filter((line) => line.trim().startsWith('- ['));
      const completedTasks = taskLines.filter((line) => line.includes('- [x]')).length;
      const totalTasks = taskLines.length;

      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Determine status based on progress
      let status: FlowInfo['status'] = 'active';
      if (progress === 100) {
        status = 'completed';
      } else if (progress === 0) {
        status = 'paused';
      }

      // Find current step
      const inProgressTask = taskLines.find((line) => line.includes('- [-]'));
      const currentStep = inProgressTask ? inProgressTask.replace(/- \[-\]\s*\d+\.?\d*\s*/, '').trim() : 'Not started';

      return {
        id: specName,
        name: specName.replace(/-/g, ' ').replace(/^\d+\s*/, ''),
        status,
        progress,
        currentStep,
      };
    } catch (error) {
      loggingService.logWarning('context-analyzer', `Error analyzing spec flow ${specName}:`, { error });
      return null;
    }
  }

  private async analyzeAvailableTools(): Promise<ToolInfo[]> {
    const tools: ToolInfo[] = [];

    try {
      // Check for common development tools
      const toolChecks = [
        { name: 'git', command: 'git --version' },
        { name: 'node', command: 'node --version' },
        { name: 'npm', command: 'npm --version' },
        { name: 'typescript', command: 'tsc --version' },
        { name: 'eslint', command: 'npx eslint --version' },
        { name: 'vitest', command: 'npx vitest --version' },
      ];

      for (const tool of toolChecks) {
        try {
          const { execSync } = await import('child_process');
          const version = execSync(tool.command, { encoding: 'utf-8', timeout: 5000 }).trim();

          tools.push({
            name: tool.name,
            version: version.replace(/^v/, ''),
            isAvailable: true,
            capabilities: this.getToolCapabilities(tool.name),
          });
        } catch {
          tools.push({
            name: tool.name,
            version: 'unknown',
            isAvailable: false,
            capabilities: [],
          });
        }
      }
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error analyzing available tools:', { error });
      // Return empty array on error to match test expectations
      return [];
    }

    return tools;
  }

  private getToolCapabilities(toolName: string): string[] {
    const capabilities: Record<string, string[]> = {
      git: ['version-control', 'branching', 'merging', 'history'],
      node: ['javascript-runtime', 'package-management', 'scripting'],
      npm: ['package-management', 'dependency-installation', 'script-running'],
      typescript: ['type-checking', 'compilation', 'static-analysis'],
      eslint: ['linting', 'code-quality', 'style-checking'],
      vitest: ['testing', 'unit-tests', 'coverage'],
    };

    return capabilities[toolName] || [];
  }

  private async analyzeProjectState(): Promise<ProjectState> {
    try {
      const packageJsonPath = joinPath(this.getCwd(), 'package.json');
      let phase: ProjectState['phase'] = 'development';
      let completionPercentage = 0;
      const activeFeatures: string[] = [];

      // Determine phase based on project structure and files
      if (this.fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(this.fs.readFileSync(packageJsonPath, 'utf-8'));

        // Check for testing setup
        if (packageJson.scripts?.test || packageJson.devDependencies?.vitest) {
          phase = 'testing';
          completionPercentage = 60;
        }

        // Check for deployment setup
        if (packageJson.scripts?.build && packageJson.scripts?.start) {
          phase = 'deployment';
          completionPercentage = 80;
        }

        // Extract active features from scripts or dependencies
        if (packageJson.scripts) {
          Object.keys(packageJson.scripts).forEach((script) => {
            if (!['start', 'build', 'test', 'dev'].includes(script)) {
              activeFeatures.push(script);
            }
          });
        }
      }

      return {
        phase,
        completionPercentage,
        activeFeatures,
        blockers: [], // Will be populated by analyzing issues, TODOs, etc.
      };
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error analyzing project state:', { error });
      return {
        phase: 'development',
        completionPercentage: 0,
        activeFeatures: [],
        blockers: [],
      };
    }
  }

  private async analyzeTechnicalEcosystem(): Promise<TechEcosystem> {
    try {
      const packageJsonPath = joinPath(this.getCwd(), 'package.json');

      if (this.fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(this.fs.readFileSync(packageJsonPath, 'utf-8'));

        const dependencies: TechDependency[] = [];

        // Process runtime dependencies
        if (packageJson.dependencies) {
          Object.entries(packageJson.dependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'runtime',
              isOutdated: false, // Would need npm outdated check for real implementation
            });
          });
        }

        // Process dev dependencies
        if (packageJson.devDependencies) {
          Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
            dependencies.push({
              name,
              version: version as string,
              type: 'dev',
              isOutdated: false,
            });
          });
        }

        // Determine framework and build tools
        const framework = this.determineFramework(packageJson);
        const buildTools = this.determineBuildTools(packageJson);

        return {
          framework,
          language: 'typescript', // Based on project setup
          runtime: 'node',
          dependencies,
          buildTools,
        };
      }
    } catch (error) {
      loggingService.logWarning('context-analyzer', 'Error analyzing technical ecosystem:', { error });
    }

    // Fallback ecosystem
    return {
      framework: 'node',
      language: 'typescript',
      runtime: 'node',
      dependencies: [],
      buildTools: ['tsc'],
    };
  }

  private determineFramework(packageJson: unknown): string {
    const pkg = packageJson as { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> };
    if (pkg.dependencies?.nuxt || pkg.devDependencies?.nuxt) return 'nuxt';
    if (pkg.dependencies?.next || pkg.devDependencies?.next) return 'nextjs';
    if (pkg.dependencies?.vue || pkg.devDependencies?.vue) return 'vue';
    if (pkg.dependencies?.react || pkg.devDependencies?.react) return 'react';
    return 'node';
  }

  private determineBuildTools(packageJson: unknown): string[] {
    const tools: string[] = [];
    const pkg = packageJson as { devDependencies?: Record<string, unknown> };

    if (pkg.devDependencies?.typescript || this.fs.existsSync(joinPath(this.getCwd(), 'tsconfig.json'))) {
      tools.push('tsc');
    }
    if (pkg.devDependencies?.vite) tools.push('vite');
    if (pkg.devDependencies?.webpack) tools.push('webpack');
    if (pkg.devDependencies?.rollup) tools.push('rollup');
    if (pkg.devDependencies?.eslint) tools.push('eslint');
    if (pkg.devDependencies?.vitest) tools.push('vitest');

    return tools.length > 0 ? tools : ['tsc'];
  }

  private async getCompletedFlows(): Promise<FlowInfo[]> {
    // In a real implementation, this would check completed specs or flow history
    return [];
  }

  private async getQueuedFlows(): Promise<FlowInfo[]> {
    // In a real implementation, this would check queued specs or planned flows
    return [];
  }

  private async getFlowHistory(): Promise<FlowHistoryEntry[]> {
    // In a real implementation, this would return flow execution history
    return [];
  }

  private detectAndNotifyChanges(oldContext: ProjectContext, newContext: ProjectContext): void {
    // Compare contexts and notify of changes
    const changes: ContextChange[] = [];

    // Check for flow changes
    const oldFlowIds = new Set(oldContext.activeFlows.map((f) => f.id));
    const newFlowIds = new Set(newContext.activeFlows.map((f) => f.id));

    // New flows
    newFlowIds.forEach((id) => {
      if (!oldFlowIds.has(id)) {
        changes.push({
          type: 'flow',
          action: 'added',
          target: id,
          timestamp: new Date(),
          impact: 'medium',
        });
      }
    });

    // Removed flows
    oldFlowIds.forEach((id) => {
      if (!newFlowIds.has(id)) {
        changes.push({
          type: 'flow',
          action: 'removed',
          target: id,
          timestamp: new Date(),
          impact: 'medium',
        });
      }
    });

    // Check for tool availability changes
    oldContext.availableTools.forEach((oldTool) => {
      const newTool = newContext.availableTools.find((t) => t.name === oldTool.name);
      if (newTool && oldTool.isAvailable !== newTool.isAvailable) {
        changes.push({
          type: 'tool',
          action: 'modified',
          target: oldTool.name,
          timestamp: new Date(),
          impact: newTool.isAvailable ? 'low' : 'high',
        });
      }
    });

    // Notify observers of changes
    changes.forEach((change) => this.changeObservable.notify(change));
  }

  private getFallbackContext(): ProjectContext {
    return {
      workFolder: {
        path: this.getCwd(),
        name: basenamePath(this.getCwd()),
        type: 'folder',
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
        framework: 'node',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: ['tsc'],
      },
    };
  }
}
