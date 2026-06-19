// @deprecated — Utiliser le composant Nuxt <PromptCustomization /> (components/PromptCustomization.vue)

export interface PromptCustomizationProps {
  promptId: string;
  onSave: (_customization: unknown) => void;
}

export class PromptCustomizationComponent {
  constructor(private _props: PromptCustomizationProps) {}

  render(): string {
    return `<div>Prompt Customization for ${this._props.promptId}</div>`;
  }
}
