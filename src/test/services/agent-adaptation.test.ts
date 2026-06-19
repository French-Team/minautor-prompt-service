// Unit tests for enhanced Agent Adaptation Interface

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentAdaptationInterface } from '../../services/agent-adaptation';
import type { GeneratedPrompt } from '../../models/prompt';
import type { UserIdentity } from '../../models/identity';
import type { ProjectContext } from '../../models/context';
import type { AdaptedPrompt } from '../../models/agent';

describe('AgentAdaptationInterface', () => {
  let agentAdapter: AgentAdaptationInterface;
  let mockPrompt: GeneratedPrompt;

  beforeEach(() => {
    agentAdapter = new AgentAdaptationInterface();

    const mockIdentity: UserIdentity = {
      type: 'User',
      permissions: [],
      preferences: {
        language: 'en',
        responseStyle: 'balanced',
        technicalLevel: 'intermediate',
      },
      customizations: [],
    };

    const mockContext: ProjectContext = {
      workFolder: {
        path: '/test/project',
        name: 'test-project',
        type: 'project',
        technologies: ['typescript'],
        lastModified: new Date(),
      },
      activeFlows: [
        { id: 'flow1', name: 'Development Flow', status: 'active', progress: 50, currentStep: 'Development' },
      ],
      availableTools: [{ name: 'ESLint', version: '8.0.0', isAvailable: true, capabilities: ['linting'] }],
      projectState: {
        phase: 'development',
        completionPercentage: 50,
        activeFeatures: ['authentication'],
        blockers: [],
      },
      technicalEcosystem: {
        framework: 'nuxt',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: ['vite', 'eslint'],
      },
    };

    mockPrompt = {
      id: 'test-prompt-1',
      identity: mockIdentity,
      content: 'Implement a new feature for user authentication.',
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'test-user',
        tags: ['authentication', 'feature'],
        usage: {
          totalUses: 5,
          successRate: 0.8,
          averageResponseTime: 1500,
          lastUsed: new Date(),
        },
      },
      version: '1.0.0',
      context: mockContext,
      appliedRules: [],
    };
  });

  describe('Basic functionality', () => {
    it('should return supported agents', () => {
      const supportedAgents = agentAdapter.getSupportedAgents();
      expect(supportedAgents).toEqual(['ollama', 'lm-studio', 'codestral', 'generic']);
    });

    it('should validate agent compatibility for supported agents', () => {
      expect(agentAdapter.validateAgentCompatibility(mockPrompt, 'ollama')).toBe(true);
      expect(agentAdapter.validateAgentCompatibility(mockPrompt, 'lm-studio')).toBe(true);
      expect(agentAdapter.validateAgentCompatibility(mockPrompt, 'generic')).toBe(true);
    });

    it('should reject unsupported agents', () => {
      expect(agentAdapter.validateAgentCompatibility(mockPrompt, 'unsupported-agent')).toBe(false);
    });

    it('should get agent capabilities', () => {
      const ollamaCapabilities = agentAdapter.getAgentCapabilities('ollama');
      expect(ollamaCapabilities).toBeDefined();
      expect(ollamaCapabilities?.maxTokens).toBe(8000);
      expect(ollamaCapabilities?.specializations).toContain('conversation');
    });
  });

  describe('Ollama adaptations', () => {
    it('should adapt prompt for Ollama with conversational tone', async () => {
      const adapted = (await agentAdapter.adaptPromptForAgent(mockPrompt, 'ollama')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('ollama');
      expect(adapted.content).toContain('Please help me');
      expect(adapted.optimizedFor).toContain('conversation');
      expect(adapted.adaptations).toHaveLength(1);
      expect(adapted.adaptations[0].type).toBe('style');
      expect(adapted.adaptations[0].reason).toContain('conversational');
    });

    it('should break down long content for Ollama', async () => {
      const longPrompt = {
        ...mockPrompt,
        content: 'This is a very long prompt. '.repeat(200), // Creates ~5000 character prompt
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(longPrompt, 'ollama')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('ollama');
      expect(adapted.adaptations.some((a) => a.type === 'structure')).toBe(true);
      expect(adapted.content).toContain('\n\n'); // Should have section breaks
    });

    it('should add role context for Superviseur identity', async () => {
      const superviseurPrompt = {
        ...mockPrompt,
        identity: { ...mockPrompt.identity, type: 'Superviseur' as const },
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(superviseurPrompt, 'ollama')) as AdaptedPrompt;

      expect(adapted.content).toContain('Context: You are assisting a Superviseur');
      expect(adapted.adaptations.some((a) => a.type === 'format' && a.description === 'Added role context')).toBe(true);
    });

    it('should handle content length validation', () => {
      const veryLongPrompt = {
        ...mockPrompt,
        content: 'x'.repeat(10000), // Exceeds Ollama's 8000 token limit
      };

      expect(agentAdapter.validateAgentCompatibility(veryLongPrompt, 'ollama')).toBe(false);
    });
  });

  describe('LM Studio adaptations', () => {
    it('should adapt prompt for LM Studio with coordination focus', async () => {
      const multiStepPrompt = {
        ...mockPrompt,
        content:
          'First, create the user model. Then, implement the authentication service. Finally, add the login endpoint.',
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(multiStepPrompt, 'lm-studio')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('lm-studio');
      expect(adapted.content).toContain('Task Coordination Instructions');
      expect(adapted.optimizedFor).toContain('coordination');
      expect(adapted.adaptations.some((a) => a.type === 'structure')).toBe(true);
    });

    it('should add workflow context when active flows exist', async () => {
      const adapted = (await agentAdapter.adaptPromptForAgent(mockPrompt, 'lm-studio')) as AdaptedPrompt;

      expect(adapted.content).toContain('Active Workflows: Development Flow');
      expect(adapted.adaptations.some((a) => a.description === 'Added workflow context')).toBe(true);
    });

    it('should add tool integration hints', async () => {
      const adapted = (await agentAdapter.adaptPromptForAgent(mockPrompt, 'lm-studio')) as AdaptedPrompt;

      expect(adapted.content).toContain('Available Tools: ESLint');
      expect(adapted.adaptations.some((a) => a.description === 'Added tool integration hints')).toBe(true);
    });

    it('should handle longer content than Ollama', () => {
      const longPrompt = {
        ...mockPrompt,
        content: 'x'.repeat(10000), // Within LM Studio's 12000 token limit
      };

      expect(agentAdapter.validateAgentCompatibility(longPrompt, 'lm-studio')).toBe(true);
    });
  });

  describe('Codestral adaptations', () => {
    it('should adapt prompt for Codestral with technical focus', async () => {
      const technicalPrompt = {
        ...mockPrompt,
        content: 'Implement a user authentication system with JWT tokens',
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(technicalPrompt, 'codestral')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('codestral');
      expect(adapted.content).toContain('Technical Implementation Request');
      expect(adapted.content).toContain('Code Quality Requirements');
      expect(adapted.optimizedFor).toContain('technical');
      expect(adapted.adaptations.some((a) => a.type === 'structure')).toBe(true);
    });

    it('should add testing requirements for Responsable identity', async () => {
      const responsablePrompt = {
        ...mockPrompt,
        identity: { ...mockPrompt.identity, type: 'Responsable' as const },
        content: 'Create a new API endpoint for user management',
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(responsablePrompt, 'codestral')) as AdaptedPrompt;

      expect(adapted.content).toContain('Testing Requirements');
      expect(adapted.content).toContain('unit tests');
      expect(adapted.adaptations.some((a) => a.description === 'Added testing requirements for Responsable')).toBe(
        true,
      );
    });

    it('should add tool compatibility instructions', async () => {
      const adapted = (await agentAdapter.adaptPromptForAgent(mockPrompt, 'codestral')) as AdaptedPrompt;

      expect(adapted.content).toContain('Technical Tools Available: ESLint');
      expect(adapted.adaptations.some((a) => a.description === 'Added tool compatibility instructions')).toBe(true);
    });

    it('should handle very long technical content', () => {
      const longTechnicalPrompt = {
        ...mockPrompt,
        content: 'Implement a complex microservices architecture. '.repeat(800), // ~32000 characters
      };

      expect(agentAdapter.validateAgentCompatibility(longTechnicalPrompt, 'codestral')).toBe(false);
    });

    it('should get Codestral capabilities', () => {
      const capabilities = agentAdapter.getAgentCapabilities('codestral');
      expect(capabilities).toBeDefined();
      expect(capabilities?.maxTokens).toBe(16000);
      expect(capabilities?.specializations).toContain('technical');
      expect(capabilities?.supportedFormats).toContain('code');
    });
  });

  describe('Agent detection', () => {
    it('should detect best agent for User identity', () => {
      const conversationalPrompt = {
        ...mockPrompt,
        content: 'Help me understand how to use this feature',
      };
      const bestAgent = agentAdapter.detectBestAgent(conversationalPrompt);
      expect(['ollama', 'codestral']).toContain(bestAgent); // Should prefer conversational agents
    });

    it('should detect best agent for Superviseur identity', () => {
      const superviseurPrompt = {
        ...mockPrompt,
        identity: { ...mockPrompt.identity, type: 'Superviseur' as const },
        content: 'Coordinate the team workflow and manage dependencies',
      };

      const bestAgent = agentAdapter.detectBestAgent(superviseurPrompt);
      expect(['lm-studio', 'codestral']).toContain(bestAgent); // Should prefer coordination agents
    });

    it('should detect best agent for complex content', () => {
      const complexPrompt = {
        ...mockPrompt,
        content: 'This is a complex multi-step task. '.repeat(100), // Long, complex content
        identity: { ...mockPrompt.identity, type: 'Responsable' as const },
      };

      const bestAgent = agentAdapter.detectBestAgent(complexPrompt);
      expect(['lm-studio', 'ollama']).toContain(bestAgent); // Should prefer agents that handle complexity
    });

    it('should detect Codestral for technical content', () => {
      const technicalPrompt = {
        ...mockPrompt,
        content: 'Implement a REST API with proper error handling and database integration',
        identity: { ...mockPrompt.identity, type: 'Responsable' as const },
      };

      const bestAgent = agentAdapter.detectBestAgent(technicalPrompt);
      expect(bestAgent).toBe('codestral'); // Codestral should be best for technical tasks
    });
  });

  describe('Enhanced fallback mechanisms', () => {
    it('should use technical-to-conversational fallback for Codestral', async () => {
      const technicalPrompt = {
        ...mockPrompt,
        content: 'Implement a complex algorithm for data processing',
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(technicalPrompt, 'unsupported-agent')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('generic');
      expect(adapted.content).toContain('I need help with the following task');
      expect(adapted.content).toContain('create'); // 'implement' should be replaced
      expect(adapted.adaptations.some((a) => a.type === 'style')).toBe(true);
    });

    it('should use coordination-to-simple fallback for coordination content', async () => {
      const coordinationPrompt = {
        ...mockPrompt,
        content: 'Coordinate multiple services to work in parallel with proper dependencies',
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(
        coordinationPrompt,
        'unsupported-agent',
      )) as AdaptedPrompt;

      expect(adapted.content).toContain('step by step');
      expect(adapted.content).toContain('organize'); // 'coordinate' should be replaced
      expect(adapted.content).toContain('one by one'); // 'in parallel' should be replaced
      expect(adapted.adaptations.some((a) => a.type === 'structure')).toBe(true);
    });

    it('should provide detailed compatibility validation', () => {
      const longPrompt = {
        ...mockPrompt,
        content: 'x'.repeat(9000), // Too long for Ollama (8000 limit)
      };

      const validation = agentAdapter.validateAgentCompatibilityDetailed(longPrompt, 'ollama');

      expect(validation.isCompatible).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect tool requirements in compatibility validation', () => {
      const toolPrompt = {
        ...mockPrompt,
        content: 'Run the test suite and compile the application',
      };

      const validation = agentAdapter.validateAgentCompatibilityDetailed(toolPrompt, 'ollama');

      expect(validation.isCompatible).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect complex formatting requirements', () => {
      const formattedPrompt = {
        ...mockPrompt,
        content: 'Create a table:\n| Name | Type | Description |\n|------|------|-------------|',
      };

      const validation = agentAdapter.validateAgentCompatibilityDetailed(formattedPrompt, 'generic');

      expect(validation.isCompatible).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback mechanisms', () => {
    it('should create fallback adaptation for unsupported agent', async () => {
      const adapted = (await agentAdapter.adaptPromptForAgent(mockPrompt, 'unsupported-agent')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('generic');
      expect(adapted.adaptations.length).toBeGreaterThan(0);
      // Should have either technical-to-conversational or generic fallback
      expect(
        adapted.adaptations.some(
          (a) =>
            a.description === 'Applied generic fallback adaptation' ||
            a.description === 'Converted technical request to conversational format',
        ),
      ).toBe(true);
    });

    it('should truncate content in fallback adaptation', async () => {
      const veryLongPrompt = {
        ...mockPrompt,
        content: 'x'.repeat(5000), // Too long for generic fallback
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(veryLongPrompt, 'unsupported-agent')) as AdaptedPrompt;

      expect(adapted.content.length).toBeLessThan(4000);
      expect(adapted.content).toContain('[Content truncated for compatibility]');
      expect(adapted.adaptations.some((a) => a.type === 'length')).toBe(true);
    });

    it('should handle adaptation errors gracefully', async () => {
      // Create a malformed prompt that might cause errors
      const malformedPrompt = {
        ...mockPrompt,
        content: null as unknown as string, // This should cause an error
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(malformedPrompt, 'ollama')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('generic');
      expect(adapted.adaptations.some((a) => a.description === 'Applied generic fallback adaptation')).toBe(true);
    });
  });

  describe('Validation edge cases', () => {
    it('should handle empty content', () => {
      const emptyPrompt = {
        ...mockPrompt,
        content: '',
      };

      expect(agentAdapter.validateAgentCompatibility(emptyPrompt, 'ollama')).toBe(true);
    });

    it('should handle missing context gracefully', async () => {
      const promptWithoutContext = {
        ...mockPrompt,
        context: {
          ...mockPrompt.context,
          activeFlows: [],
          availableTools: [],
        },
      };

      const adapted = (await agentAdapter.adaptPromptForAgent(promptWithoutContext, 'lm-studio')) as AdaptedPrompt;

      expect(adapted.agentType).toBe('lm-studio');
      // Should still work even without context
    });

    it('should handle invalid prompt object', () => {
      const invalidPrompt = { invalid: 'prompt' };

      expect(agentAdapter.validateAgentCompatibility(invalidPrompt, 'ollama')).toBe(false);
    });
  });
});
