# Minautor Prompts System
<p>
  <img src="assets/images/logo-minautor.png" alt="Minautor Prompts System" width="800" />
</p>

#### A TypeScript system for generating identity-specific prompts for LLM agents supporting User, Superviseur, and Responsable roles with contextual adaptation.

## Project Structure

```
src/
├── models/           # Core data models and interfaces
│   ├── identity.ts   # User identity and profile models
│   ├── prompt.ts     # Prompt generation models
│   ├── context.ts    # Project context models
│   ├── template.ts   # Template system models
│   ├── version.ts    # Version management models
│   ├── agent.ts      # Agent adaptation models
│   └── index.ts      # Model exports
├── services/         # Business logic services
│   └── index.ts      # Service exports (implementations in future tasks)
├── components/       # UI components
│   └── index.ts      # Component exports (implementations in future tasks)
├── config/           # Configuration and DI
│   ├── app.config.ts # Application configuration
│   ├── di-container.ts # Dependency injection container
│   └── index.ts      # Config exports
├── test/             # Test files
│   └── structure.test.ts # Basic structure tests
└── index.ts          # Main entry point
```

## Core Interfaces

### Identity System
- `UserIdentity`: Base identity with permissions and preferences
- `UserProfile`, `SuperviseurProfile`, `ResponsableProfile`: Role-specific profiles

### Prompt System
- `GeneratedPrompt`: Complete prompt with metadata and context
- `PromptTemplate`: Reusable prompt templates
- `PersonalizedPrompt`: User-customized prompts

### Context System
- `ProjectContext`: Current project state and environment
- `WorkFolderInfo`: Workspace information
- `FlowInfo`: Active workflow states

### Agent System
- `AgentConfiguration`: LLM agent settings
- `AdaptedPrompt`: Agent-specific prompt adaptations

## Getting Started

```bash
# Install dependencies
npm install

# Type check
npx tsc --noEmit

# Run tests
npm test

# Build
npm run build
```

## Next Steps

This foundation provides the core interfaces and project structure. Subsequent tasks will implement:

1. Identity resolution logic
2. Context analysis services
3. Rules integration engine
4. Prompt generation services
5. Version management
6. Agent adaptation interfaces
7. UI components and API layer