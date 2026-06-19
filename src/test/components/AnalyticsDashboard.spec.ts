// Integration tests for AnalyticsDashboard.vue (Nuxt auto-imported component)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

// Mock usePromptSystem before importing the component
const mockIdentityResolver = {
  getCurrentIdentity: vi.fn(),
  setCurrentIdentity: vi.fn(),
};

const mockContextAnalyzer = {
  analyzeProjectContext: vi.fn(),
};

vi.mock('~/composables/usePromptSystem', () => ({
  usePromptSystem: () => ({
    identityResolver: mockIdentityResolver,
    contextAnalyzer: mockContextAnalyzer,
    versionHandler: { getVersionHistory: vi.fn() },
  }),
  createMockContext: () => ({
    workFolder: { name: 'test', path: '/test', type: 'project', technologies: [], lastModified: new Date() },
    activeFlows: [{ id: 'f1', name: 'Test Flow', status: 'active', progress: 50, currentStep: 'Test' }],
    availableTools: [{ name: 'Nuxt', version: '3.0', isAvailable: true, capabilities: ['SSR'] }],
    projectState: { phase: 'development', completionPercentage: 50, activeFeatures: [], blockers: [] },
    technicalEcosystem: {
      framework: 'nuxt',
      language: 'typescript',
      runtime: 'node',
      dependencies: [],
      buildTools: [],
    },
  }),
  createDefaultIdentity: vi.fn(),
  createMockTemplate: vi.fn(),
}));

const STUBS = { NuxtLink: { template: '<a><slot /></a>' } };

import AnalyticsDashboard from '~/components/AnalyticsDashboard.vue';

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentityResolver.getCurrentIdentity.mockResolvedValue({
      type: 'Superviseur',
      permissions: [
        { action: 'read', resource: 'prompts' },
        { action: 'optimize', resource: 'prompts' },
      ],
    });
    mockContextAnalyzer.analyzeProjectContext.mockResolvedValue({
      workFolder: { name: 'project', path: '/p', type: 'project', technologies: [], lastModified: new Date() },
      activeFlows: [
        { id: 'f1', name: 'Flow 1', status: 'active', progress: 50, currentStep: 'Step' },
        { id: 'f2', name: 'Flow 2', status: 'paused', progress: 30, currentStep: 'Step' },
      ],
      availableTools: [
        { name: 'Nuxt', version: '3.0', isAvailable: true, capabilities: ['SSR'] },
        { name: 'Vitest', version: '1.0', isAvailable: true, capabilities: ['testing'] },
        { name: 'ESLint', version: '8.0', isAvailable: false, capabilities: ['linting'] },
      ],
      projectState: { phase: 'testing', completionPercentage: 75, activeFeatures: ['auth', 'dashboard'], blockers: [] },
      technicalEcosystem: {
        framework: 'nuxt',
        language: 'typescript',
        runtime: 'node',
        dependencies: [],
        buildTools: [],
      },
    });
  });

  it('should show loading state then render KPI cards', async () => {
    // Keep loading by delaying resolution
    let resolveIdentity!: (v: unknown) => void;
    let resolveContext!: (v: unknown) => void;
    mockIdentityResolver.getCurrentIdentity.mockReturnValue(
      new Promise((r) => {
        resolveIdentity = r;
      }),
    );
    mockContextAnalyzer.analyzeProjectContext.mockReturnValue(
      new Promise((r) => {
        resolveContext = r;
      }),
    );

    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });

    // Should show spinner while promises are pending
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
    expect(wrapper.text()).toContain('Chargement');

    // Resolve promises
    resolveIdentity({ type: 'User', permissions: [] });
    resolveContext({
      workFolder: { name: 'p', path: '/p', type: 'project', technologies: [], lastModified: new Date() },
      activeFlows: [],
      availableTools: [],
      projectState: { phase: 'dev', completionPercentage: 0, activeFeatures: [], blockers: [] },
      technicalEcosystem: { framework: 'node', language: 'ts', runtime: 'node', dependencies: [], buildTools: [] },
    });

    await flushPromises();
    await nextTick();

    // Loading should be gone, cards should show
    expect(wrapper.find('.animate-spin').exists()).toBe(false);
    expect(wrapper.findAll('.stat-label')).toHaveLength(4);
  });

  it('should display identity type and permissions count', async () => {
    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('Superviseur');
    expect(wrapper.text()).toContain('2 permissions');
  });

  it('should display flow count and project phase', async () => {
    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('testing');
  });

  it('should display available tool count', async () => {
    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('3');
    expect(wrapper.text()).toContain('détectés');
  });

  it('should display agent count (4 supported)', async () => {
    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('4');
    expect(wrapper.text()).toContain('supportés');
  });

  it('should handle identity and context fetch failures gracefully', async () => {
    // The component uses .catch(() => null) on each promise individually,
    // so rejections are handled without setting the outer error state.
    mockIdentityResolver.getCurrentIdentity.mockRejectedValue(new Error('Erreur réseau'));

    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    // Identity resolves to null → shows '—'; context resolves (mocked in beforeEach)
    expect(wrapper.text()).toContain('—');
    expect(wrapper.findAll('.stat-label')).toHaveLength(4);
  });

  it('should render 3 quick action NuxtLinks', async () => {
    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    const links = wrapper.findAll('a');
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links[0].text()).toContain('Générer');
    expect(links[1].text()).toContain('Gérer');
    expect(links[2].text()).toContain('Voir');
  });

  it('should handle missing identity gracefully (null)', async () => {
    mockIdentityResolver.getCurrentIdentity.mockResolvedValue(null);

    const wrapper = mount(AnalyticsDashboard, { global: { stubs: STUBS } });
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('—');
  });
});
