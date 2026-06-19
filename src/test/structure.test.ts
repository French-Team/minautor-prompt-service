// Basic structure validation test

import { describe, it, expect } from 'vitest';

describe('Project Structure', () => {
  it('should have core models defined', async () => {
    // Test that we can import core types
    const { UserIdentityClass, GeneratedPromptClass, ProjectContextClass } = await import('../models');

    expect(UserIdentityClass).toBeDefined();
    expect(GeneratedPromptClass).toBeDefined();
    expect(ProjectContextClass).toBeDefined();
  });

  it('should have DI container configured', async () => {
    const { createDIContainer, defaultConfig } = await import('../config');

    const container = createDIContainer(defaultConfig);
    expect(container).toBeDefined();
    expect(container.getConfig()).toEqual(defaultConfig);
  });

  it('should export main application factory', async () => {
    const { createPromptSystem } = await import('../index');

    expect(createPromptSystem).toBeDefined();
    expect(typeof createPromptSystem).toBe('function');
  });
});
