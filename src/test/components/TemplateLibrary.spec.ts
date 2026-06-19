// Integration tests for TemplateLibrary.vue (Nuxt auto-imported component)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

const STUBS = { NuxtLink: { template: '<a><slot /></a>' } };

import TemplateLibrary from '~/components/TemplateLibrary.vue';

describe('TemplateLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start with empty template list', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });

    await nextTick();

    expect(wrapper.text()).toContain('Aucun template');
    expect(wrapper.find('.card-header h3').exists()).toBe(false);
  });

  it('should display 0 template count initially', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });
    await nextTick();

    expect(wrapper.text()).toContain('0 template');
  });

  it('should show create form when clicking Nouveau', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });
    await nextTick();

    const newBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Nouveau'));
    await newBtn[0].trigger('click');

    expect(wrapper.text()).toContain('Nouveau template');
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.exists()).toBe(true);
  });

  it('should create a new template and emit created event', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });
    await nextTick();

    // Ouvrir le formulaire de création
    const newBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Nouveau'));
    await newBtn[0].trigger('click');

    // Remplir les champs
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('Mon Template');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Contenu du template avec {{variable}}');

    // Créer
    const createBtns = wrapper.findAll('button').filter((b: any) => b.text().includes('Créer'));
    await createBtns[0].trigger('click');
    await nextTick();

    // Vérifier qu'un template a été ajouté
    const cards = wrapper.findAll('.card-header h3');
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain('Mon Template');

    // Vérifier l'événement
    expect(wrapper.emitted('created')).toBeTruthy();
    expect(wrapper.emitted('created')![0][0]).toMatchObject({
      name: 'Mon Template',
    });
  });

  it('should show validation error for empty name on creation', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });
    await nextTick();

    const newBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Nouveau'));
    await newBtn[0].trigger('click');

    const createBtns = wrapper.findAll('button').filter((b: any) => b.text().includes('Créer'));
    await createBtns[0].trigger('click');

    expect(wrapper.text()).toContain('obligatoires');
  });

  it('should delete a template and emit deleted event', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });
    await nextTick();

    // Créer un template d'abord
    const newBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Nouveau'));
    await newBtn[0].trigger('click');

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('À supprimer');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Contenu à supprimer');

    const createBtns = wrapper.findAll('button').filter((b: any) => b.text().includes('Créer'));
    await createBtns[0].trigger('click');
    await nextTick();

    // Maintenant supprimer
    const deleteBtns = wrapper.findAll('button').filter((b: any) => b.text().includes('Supprimer'));
    expect(deleteBtns).toHaveLength(1);

    await deleteBtns[0].trigger('click');
    await nextTick();

    // Plus aucun template
    const cards = wrapper.findAll('.card-header h3');
    expect(cards).toHaveLength(0);

    expect(wrapper.emitted('deleted')).toBeTruthy();
  });

  it('should emit selected event when clicking a template card', async () => {
    const wrapper = mount(TemplateLibrary, { global: { stubs: STUBS } });
    await nextTick();

    // Créer un template pour pouvoir cliquer dessus
    const newBtn = wrapper.findAll('button').filter((b: any) => b.text().includes('Nouveau'));
    await newBtn[0].trigger('click');

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('Template cliquable');
    const textareas = wrapper.findAll('textarea');
    await textareas[0].setValue('Contenu cliquable');

    const createBtns = wrapper.findAll('button').filter((b: any) => b.text().includes('Créer'));
    await createBtns[0].trigger('click');
    await nextTick();

    // Cliquer sur le template créé
    const cards = wrapper.findAll('.card');
    await cards[0].trigger('click');

    expect(wrapper.emitted('selected')).toBeTruthy();
  });

  // Le test 'should start with empty template list' vérifie déjà l'état vide
});
