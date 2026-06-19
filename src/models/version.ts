// Version-related models and interfaces

// Version-related models and interfaces

export interface PromptVersion {
  id: string;
  promptId: string;
  version: string;
  content: string;
  changes: VersionChange[];
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  metadata: VersionMetadata;
}

export interface VersionChange {
  type: 'content' | 'metadata' | 'rules' | 'personalization';
  description: string;
  diff: string;
  impact: 'minor' | 'major' | 'breaking';
}

export interface VersionMetadata {
  changeReason: string;
  performanceMetrics?: PerformanceMetrics;
  qualityScore?: number;
  userFeedback?: UserFeedback[];
  rollbackInfo?: RollbackInfo;
}

export interface PerformanceMetrics {
  responseTime: number;
  successRate: number;
  errorRate: number;
  userSatisfaction: number;
  usageFrequency: number;
}

export interface UserFeedback {
  userId: string;
  rating: number;
  comment?: string;
  timestamp: Date;
  helpful: boolean;
}

export interface RollbackInfo {
  canRollback: boolean;
  previousVersion?: string;
  rollbackReason?: string;
  rollbackAt?: Date;
}

export interface VersionComparison {
  oldVersion: PromptVersion;
  newVersion: PromptVersion;
  differences: VersionDifference[];
  recommendation: 'upgrade' | 'keep' | 'rollback';
}

export interface VersionDifference {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface VersionHistory {
  promptId: string;
  versions: PromptVersion[];
  currentVersion: string;
  totalVersions: number;
  createdAt: Date;
  lastModified: Date;
}
