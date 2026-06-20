# Nuxt 3 Migration Plan

## Required Changes for Nuxt 3 Stack

### 1. Install Nuxt 3 Dependencies
```bash
npm install nuxt@^3.0.0 @nuxt/devtools
npm install -D @nuxt/test-utils vitest @vitejs/plugin-vue
npm install @pinia/nuxt pinia @pinia-plugin-persistedstate/nuxt
npm install @nuxtjs/tailwindcss @unocss/nuxt
npm install @headlessui/vue @nuxtjs/color-mode
```

### 2. Create nuxt.config.ts
```typescript
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/tailwindcss',
    '@unocss/nuxt',
    '@nuxt/test-utils/module'
  ],
  css: ['~/assets/css/main.css'],
  typescript: {
    typeCheck: true
  }
})
```

### 3. Restructure Directories
```
├── components/          # Vue components
├── composables/         # Vue composables
├── layouts/            # Nuxt layouts
├── pages/              # Nuxt pages (auto-routing)
├── plugins/            # Nuxt plugins
├── server/             # Nuxt server API routes
│   └── api/           # Your current backend logic here
├── stores/             # Pinia stores
└── types/              # TypeScript types
```

### 4. Update package.json Scripts
```json
{
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "test": "vitest",
    "lint": "eslint .",
    "typecheck": "nuxt typecheck"
  }
}
```

### 5. Update Vitest Config for Nuxt
```typescript
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // Any custom Vitest config
})
```