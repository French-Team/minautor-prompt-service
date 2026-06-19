// Agent-related models and interfaces

import type { GeneratedPrompt } from './prompt';

export type AgentType = 'ollama' | 'lm-studio' | 'codestral' | 'generic';

export interface AgentCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportedFormats: string[];
  specializations: AgentSpecialization[];
}

export type AgentSpecialization = 'conversation' | 'coordination' | 'technical' | 'analysis';

export interface AgentConfiguration {
  type: AgentType;
  name: string;
  endpoint?: string;
  apiKey?: string;
  model: string;
  capabilities: AgentCapabilities;
  preferences: AgentPreferences;
}

export interface AgentPreferences {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
}

export interface AdaptedPrompt extends GeneratedPrompt {
  agentType: AgentType;
  adaptations: PromptAdaptation[];
  optimizedFor: AgentSpecialization[];
}

export interface PromptAdaptation {
  type: 'format' | 'length' | 'complexity' | 'style' | 'structure';
  description: string;
  originalValue: string;
  adaptedValue: string;
  reason: string;
}

export interface AgentResponse {
  agentType: AgentType;
  promptId: string;
  content: string;
  metadata: ResponseMetadata;
  performance: ResponsePerformance;
}

export interface ResponseMetadata {
  model: string;
  tokensUsed: number;
  responseTime: number;
  timestamp: Date;
  confidence?: number;
}

export interface ResponsePerformance {
  latency: number;
  throughput: number;
  errorRate: number;
  qualityScore: number;
}

export interface AgentAdaptationError {
  agentType: AgentType;
  promptId: string;
  error: string;
  fallbackUsed: boolean;
  timestamp: Date;
}

export interface AdaptationFallback {
  originalAgent: AgentType;
  fallbackAgent: AgentType;
  adaptedPrompt: GeneratedPrompt;
  limitations: string[];
}
