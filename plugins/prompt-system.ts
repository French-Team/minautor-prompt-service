// Plugin universel qui initialise le système de prompts (DI container) et l'expose
// sur l'instance Nuxt sous `$promptSystem`.
// S'exécute côté serveur (SSR) et côté client.
// - Côté serveur : injecte le vrai module `node:fs` pour que ContextAnalyzer lise le FS réel
// - Côté client : aucun fs, ContextAnalyzer utilise son fallback

import { createPromptSystem, type FsLike } from '../src/index';

export default defineNuxtPlugin({
  name: 'prompt-system',
  enforce: 'pre',
  async setup() {
    // Récupère le module fs côté serveur uniquement (tree-shaké côté client)
    const opts: { fs?: FsLike } = {};

    // import.meta.server est un booléen compile-time dans Nuxt :
    // le bundler élimine cette branche du bundle client automatiquement.
    // node:fs n'est importé que côté serveur.
    if (import.meta.server) {
      const fsMod = await import('node:fs');
      // node:fs a des overloads plus complexes que FsLike, mais les méthodes utilisées
      // par ContextAnalyzer (existsSync, readFileSync, statSync, readdirSync) sont compatibles
      opts.fs = (fsMod.default || fsMod) as FsLike;
    }

    const system = createPromptSystem(undefined, opts);

    // Pré-charge les services principaux pour éviter d'attendre au premier usage.
    const services = {
      identityResolver: await system.container.resolve('identityResolver'),
      contextAnalyzer: await system.container.resolve('contextAnalyzer'),
      rulesIntegrationEngine: await system.container.resolve('rulesIntegrationEngine'),
      promptGenerator: await system.container.resolve('promptGenerator'),
      versionHandler: await system.container.resolve('versionHandler'),
      agentAdaptationInterface: await system.container.resolve('agentAdaptationInterface'),
      promptManager: await system.container.resolve('promptManager'),
    };

    return {
      provide: {
        promptSystem: system,
        ...services,
      },
    };
  },
});
