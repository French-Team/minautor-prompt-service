// Application configuration

export interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
  database: {
    url: string;
    maxConnections: number;
    timeout: number;
  };
  cache: {
    provider: 'redis' | 'memory';
    ttl: number;
    maxSize: number;
  };
  agents: {
    defaultTimeout: number;
    maxRetries: number;
    fallbackAgent: string;
  };
  prompts: {
    maxVersions: number;
    autoOptimize: boolean;
    cacheEnabled: boolean;
  };
  security: {
    encryptionKey: string;
    jwtSecret: string;
    sessionTimeout: number;
  };
}

export const defaultConfig: AppConfig = {
  app: {
    name: 'Identity-Based Prompts System',
    version: '1.0.0',
    environment: 'development',
  },
  database: {
    url:
      (typeof globalThis !== 'undefined' && globalThis.process?.env?.DATABASE_URL) || 'sqlite://./runtime/prompts.db',
    maxConnections: 10,
    timeout: 5000,
  },
  cache: {
    provider: 'memory',
    ttl: 3600, // 1 hour
    maxSize: 1000,
  },
  agents: {
    defaultTimeout: 30000, // 30 seconds
    maxRetries: 3,
    fallbackAgent: 'generic',
  },
  prompts: {
    maxVersions: 50,
    autoOptimize: true,
    cacheEnabled: true,
  },
  security: {
    encryptionKey:
      (typeof globalThis !== 'undefined' && globalThis.process?.env?.ENCRYPTION_KEY) ||
      'default-key-change-in-production',
    jwtSecret: (typeof globalThis !== 'undefined' && globalThis.process?.env?.JWT_SECRET) || 'default-jwt-secret',
    sessionTimeout: 86400, // 24 hours
  },
};
