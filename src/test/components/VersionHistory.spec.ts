// Integration tests for VersionHistory.vue (Nuxt auto-imported component)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

const mockVersionHandler = {
  getVersionHistory: vi.fn(),
  createVersion: vi.fn(),
  rollbackToVersion: vi.fn(),
  getVersionMetrics: vi.fn(),
  getVersionAnalytics: vi.fn(),
};

vi.mock('~/composables/usePromptSystem', () => ({
  usePromptSystem: () => ({
    versionHandler: mockVersionHandler,
  }),
  createDefaultIdentity: vi.fn(),
  createMockContext: vi.fn(),
  createMockTemplate: vi.fn(),
}));

const STUBS = { NuxtLink: { template: '<a><slot /></a>' } };

import VersionHistory from '~/components/VersionHistory.vue';

describe('VersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVersionHandler.getVersionHistory.mockResolvedValue({
      versions: [],
      currentVersion: '',
      totalVersions: 0,
      createdAt: new Date(),
      lastModified: new Date(),
    });
    mockVersionHandler.createVersion.mockResolvedValue({
      id: 'v-new',
      version: '1.0.0',
      content: 'Test content',
      isActive: true,
      createdAt: new Date(),
      metadata: { changeReason: 'Test' },
    });
    mockVersionHandler.rollbackToVersion.mockResolvedValue({
      id: 'v-rolled',
      version: '1.0.0',
      isActive: true,
      metadata: { rollbackInfo: { canRollback: true } },
    });
  });

  it('should show empty state when no promptIds', async () => {
    const wrapper = mount(VersionHistory, {
      global: { stubs: STUBS },
    });

    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toContain('Aucun prompt suivi');
  });

  it('should show create version form by default', () => {
    const wrapper = mount(VersionHistory, {
      global: { stubs: STUBS },
    });

    expect(wrapper.find('h3').text()).toContain('Nouvelle version');
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.text()).toContain('Créer la version');
  });

  it('should hide create form when showCreate is false', () => {
    const wrapper = mount(VersionHistory, {
      props: { showCreate: false },
      global: { stubs: STUBS },
    });

    expect(wrapper.find('h3').exists()).toBe(false);
  });

  it('should validate empty promptId', async () => {
    const wrapper = mount(VersionHistory, {
      global: { stubs: STUBS },
    });
    await nextTick();

    const createBtn = wrapper.findAll('button').filter((b) => b.text().includes('Créer la version'));
    await createBtn[0].trigger('click');

    expect(wrapper.text()).toContain('Indique un promptId');
  });

  it('should validate empty content', async () => {
    const wrapper = mount(VersionHistory, {
      global: { stubs: STUBS },
    });
    await nextTick();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('test-prompt');

    const createBtn = wrapper.findAll('button').filter((b) => b.text().includes('Créer la version'));
    await createBtn[0].trigger('click');

    expect(wrapper.text()).toContain('contenu ne peut pas être vide');
  });

  it('should create version successfully', async () => {
    const wrapper = mount(VersionHistory, {
      global: { stubs: STUBS },
    });
    await nextTick();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('test-prompt');
    const textarea = wrapper.find('textarea');
    await textarea.setValue('New version content');

    const createBtn = wrapper.findAll('button').filter((b) => b.text().includes('Créer la version'));
    await createBtn[0].trigger('click');

    await nextTick();
    await flushPromises();

    expect(mockVersionHandler.createVersion).toHaveBeenCalledWith(
      'test-prompt',
      'New version content',
      expect.any(Object),
    );
  });

  it('should show version timeline when history exists', async () => {
    mockVersionHandler.getVersionHistory.mockResolvedValue({
      versions: [
        {
          id: 'v1',
          version: '1.0.0',
          content: 'Version 1 content',
          isActive: true,
          createdAt: new Date('2024-01-01'),
          metadata: { changeReason: 'Initial version', performanceMetrics: {} },
          changes: [],
          createdBy: 'system',
          promptId: 'test-prompt',
        },
        {
          id: 'v2',
          version: '1.0.1',
          content: 'Version 2 content',
          isActive: false,
          createdAt: new Date('2024-01-15'),
          metadata: { changeReason: 'Second version', performanceMetrics: {} },
          changes: [],
          createdBy: 'user',
          promptId: 'test-prompt',
        },
      ],
      currentVersion: '1.0.1',
      totalVersions: 2,
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-15'),
    });

    const wrapper = mount(VersionHistory, {
      props: { promptId: 'test-prompt' },
      global: { stubs: STUBS },
    });

    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toContain('1.0.0');
    expect(wrapper.text()).toContain('1.0.1');
    expect(wrapper.text()).toContain('Initial version');
    expect(wrapper.text()).toContain('Version 1 content');
  });

  it('should show error on version creation failure', async () => {
    mockVersionHandler.createVersion.mockRejectedValue(new Error('Erreur création'));

    const wrapper = mount(VersionHistory, {
      global: { stubs: STUBS },
    });
    await nextTick();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('test-prompt');
    const textarea = wrapper.find('textarea');
    await textarea.setValue('Content');

    const createBtn = wrapper.findAll('button').filter((b) => b.text().includes('Créer la version'));
    await createBtn[0].trigger('click');

    await nextTick();
    await flushPromises();

    expect(wrapper.text()).toContain('Erreur création');
  });

  it('should render revert button for old versions', async () => {
    mockVersionHandler.getVersionHistory.mockResolvedValue({
      versions: [
        {
          id: 'v1',
          version: '1.0.0',
          content: 'Old version',
          isActive: false,
          createdAt: new Date('2024-01-01'),
          metadata: { changeReason: 'First', performanceMetrics: {} },
          changes: [],
          createdBy: 'system',
          promptId: 'test-prompt',
        },
        {
          id: 'v2',
          version: '1.0.1',
          content: 'Current version',
          isActive: true,
          createdAt: new Date('2024-01-15'),
          metadata: { changeReason: 'Second', performanceMetrics: {} },
          changes: [],
          createdBy: 'user',
          promptId: 'test-prompt',
        },
      ],
      currentVersion: '1.0.1',
      totalVersions: 2,
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-15'),
    });

    const wrapper = mount(VersionHistory, {
      props: { promptId: 'test-prompt' },
      global: { stubs: STUBS },
    });

    await nextTick();
    await flushPromises();

    const restoreBtns = wrapper.findAll('button').filter((b) => b.text().includes('Restaurer'));
    expect(restoreBtns.length).toBeGreaterThanOrEqual(1);
  });
});
