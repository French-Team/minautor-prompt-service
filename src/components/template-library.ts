// @deprecated — Utiliser le composant Nuxt <TemplateLibrary /> (components/TemplateLibrary.vue)

export interface TemplateLibraryProps {
  onSelect: (_templateId: string) => void;
}

export class TemplateLibraryComponent {
  constructor(private _props: TemplateLibraryProps) {}

  render(): string {
    // Use props to avoid unused parameter warning
    return `<div>Template Library - ${typeof this._props.onSelect}</div>`;
  }
}
