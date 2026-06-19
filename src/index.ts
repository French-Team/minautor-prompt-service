// Main entry point for identity-based prompts system

import { defaultConfig } from './config/app.config';
import { createDIContainer, type FsLike } from './config/di-container';

// Export all public interfaces and types
export * from './models';
export * from './config';

// Export services with specific naming to avoid conflicts
export { IdentityErrorHandler } from './services/identity-error-handler';

// Export main application factory
export function createPromptSystem(config = defaultConfig, options?: { fs?: FsLike }) {
  const container = createDIContainer(config, options);

  return {
    container,
    config,
    // Main services will be available once implemented
    getPromptManager: () => container.resolve('promptManager'),
    getIdentityResolver: () => container.resolve('identityResolver'),
    getContextAnalyzer: () => container.resolve('contextAnalyzer'),
  };
}

// Default export
export default createPromptSystem;
