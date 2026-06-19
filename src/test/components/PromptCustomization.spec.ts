// Integration tests for PromptCustomization.vue (Nuxt auto-imported component)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';

const mockIdentityResolver = {
  getCurrentIdentity: vi.fn(),
  setCurrentIdentity: vi.fn(),
};

vi.mock('~/composables/usePromptSystem', () => ({
  usePromptSystem: () => ({
    identityResolver: mockIdentityResolver,
  }),
  createDefaultIdentity: vi.fn(),
  createMockContext: vi.fn(),
  createMockTemplate: vi.fn(),
}));

const STUBS = { NuxtLink: { template: '<a><slot /></a>' } };

import PromptCustomization from '~/components/PromptCustomization.vue';

describe('PromptCustomization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentityResolver.getCurrentIdentity.mockResolvedValue({
      type: 'User',
      permissions: [{ action: 'read', resource: 'prompts' }],
      preferences: { language: 'fr', responseStyle: 'balanced', technicalLevel: 'intermediate' },
      customizations: [],
    });
    mockIdentityResolver.setCurrentIdentity.mockResolvedValue(undefined);
  });

  it('should render form with default values', () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    expect(wrapper.find('h2').text()).toContain('Personnalisation');
    expect(wrapper.find('select').element.value).toBe('fr');
    expect(wrapper.text()).toContain('Équilibré');
    expect(wrapper.text()).toContain('Intermédiaire');
  });

  it('should display the apply button', () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    // The save button is the last button in the card body (text: 'Appliquer les préférences')
    const buttons = wrapper.findAll('button');
    const saveBtn = buttons[buttons.length - 1];
    expect(saveBtn.text()).toContain('Appliquer');
  });

  it('should allow changing language', async () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const select = wrapper.find('select');
    await select.setValue('en');
    expect(select.element.value).toBe('en');
  });

  it('should allow selecting a response style', async () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const styleButtons = wrapper.findAll('button').filter((b: any) => b.text().includes('Détaillé'));
    await styleButtons[0].trigger('click');

    expect(styleButtons[0].classes()).toContain('border-ibm-60');
  });

  it('should allow selecting a technical level', async () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const advancedButtons = wrapper.findAll('button').filter((b: any) => b.text().includes('Avancé'));
    await advancedButtons[0].trigger('click');

    expect(advancedButtons[0].classes()).toContain('border-ibm-60');
  });

  it('should toggle includeExamples and includeReferences checkboxes', async () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);

    await checkboxes[0].setValue(true);
    await checkboxes[1].setValue(true);

    expect((checkboxes[0].element as HTMLInputElement).checked).toBe(true);
    expect((checkboxes[1].element as HTMLInputElement).checked).toBe(true);
  });

  it('should emit saved event when saving preferences', async () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const saveBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Appliquer'));
    await saveBtn[0].trigger('click');

    await flushPromises();
    await nextTick();

    expect(mockIdentityResolver.setCurrentIdentity).toHaveBeenCalled();
    expect(wrapper.emitted('saved')).toBeTruthy();
    expect(wrapper.emitted('saved')![0][0]).toMatchObject({
      language: 'fr',
      responseStyle: 'balanced',
      technicalLevel: 'intermediate',
    });
  });

  it('should show success message after save', async () => {
    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const saveBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Appliquer'));
    await saveBtn[0].trigger('click');

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('enregistrées');
  });

  it('should show error on save failure', async () => {
    mockIdentityResolver.setCurrentIdentity.mockRejectedValue(new Error('Échec de sauvegarde'));

    const wrapper = mount(PromptCustomization, { global: { stubs: STUBS } });

    const saveBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Appliquer'));
    await saveBtn[0].trigger('click');

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain('Échec de sauvegarde');
  });

  it('should render footer slot content', () => {
    const wrapper = mount(PromptCustomization, {
      global: { stubs: STUBS },
      slots: {
        footer: '<div class="footer-slot">Footer content</div>',
      },
    });

    expect(wrapper.find('.footer-slot').exists()).toBe(true);
    expect(wrapper.text()).toContain('Footer content');
  });
});
