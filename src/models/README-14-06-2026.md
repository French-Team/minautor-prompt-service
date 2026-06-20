# Identity Models Architecture

This directory contains the refactored identity models with improved architecture following SOLID principles and modern TypeScript patterns.

## Architecture Overview

### Core Principles
- **Single Responsibility**: Each validator handles one specific type
- **Open/Closed**: Easy to extend with new validators without modifying existing code
- **Dependency Inversion**: Validators depend on abstractions, not concrete implementations
- **Type Safety**: Extensive use of branded types and const assertions

### Directory Structure

```
src/models/
├── identity.ts              # Main interfaces and legacy facade
├── types.ts                 # Centralized type definitions with branded types
├── result.ts                # Result pattern for better error handling
├── validators/              # Modular validation system
│   ├── index.ts            # Centralized exports and factory
│   ├── base-validator.ts   # Abstract base class with common utilities
│   ├── identity-validator.ts
│   ├── permission-validator.ts
│   ├── preferences-validator.ts
│   ├── customization-validator.ts
│   ├── profile-validators.ts
│   └── cached-validator.ts # Performance optimization wrapper
└── factories/
    └── identity-factory.ts  # Factory pattern for creating validated objects
```

## Key Improvements

### 1. **Modular Validation System**
- Replaced monolithic `IdentityValidator` class with specialized validators
- Each validator focuses on a single responsibility
- Easier to test, maintain, and extend

### 2. **Branded Types for Type Safety**
```typescript
type TemplateId = string & { readonly __brand: 'TemplateId' }
type UserId = string & { readonly __brand: 'UserId' }

// Type-safe factory functions
const templateId = createTemplateId('valid-template-id')
```

### 3. **Result Pattern for Error Handling**
```typescript
const result = IdentityFactory.createUserIdentity(params)
if (result.success) {
  // Use result.value
} else {
  // Handle result.error
}
```

### 4. **Performance Optimization**
- `CachedValidator` wrapper for frequently validated objects
- Configurable cache size and automatic cleanup

### 5. **Factory Pattern**
- Type-safe object creation with built-in validation
- Default profile factories for common use cases

## Usage Examples

### Basic Validation
```typescript
import { IdentityValidator } from './validators'

const validator = new IdentityValidator()
const result = validator.validate(userIdentity)

if (!result.isValid) {
  console.error('Validation errors:', result.errors)
}
```

### Using the Factory
```typescript
import { IdentityFactory } from './factories/identity-factory'

const result = IdentityFactory.createUserIdentity({
  type: 'User',
  permissions: [{ action: 'read', resource: 'documents' }],
  preferences: {
    language: 'en',
    responseStyle: 'balanced',
    technicalLevel: 'intermediate'
  }
})

if (result.success) {
  const identity = result.value
  // Use the validated identity
}
```

### Performance Optimization
```typescript
import { ValidatorFactory } from './validators'

// Create a cached validator for high-frequency validation
const validator = ValidatorFactory.createIdentityValidator(true)
```

## Migration Guide

### For Existing Code
The original `IdentityValidator` class is still available as a facade for backward compatibility, but methods are marked as deprecated:

```typescript
// Old way (still works, but deprecated)
const result = IdentityValidator.validateUserIdentity(identity)

// New way (recommended)
const validator = new IdentityValidator()
const result = validator.validate(identity)
```

### Benefits of Migration
1. **Better Type Safety**: Branded types prevent common mistakes
2. **Improved Performance**: Optional caching for frequently validated objects
3. **Better Error Messages**: More specific error codes and field paths
4. **Easier Testing**: Smaller, focused validators are easier to unit test
5. **Better Maintainability**: Clear separation of concerns

## Testing

Each validator has comprehensive unit tests in `src/test/validators/`. Run tests with:

```bash
npm test
```

## Future Enhancements

1. **Schema-based Validation**: Consider integrating with libraries like Zod or Joi
2. **Async Validation**: Support for validators that need to make async calls
3. **Custom Error Messages**: Allow customization of error messages per use case
4. **Validation Rules Engine**: More sophisticated rule-based validation system