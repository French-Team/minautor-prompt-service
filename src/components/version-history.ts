// @deprecated — Utiliser le composant Nuxt <VersionHistory /> (components/VersionHistory.vue)

export interface VersionHistoryProps {
  promptId: string;
  onRevert: (_version: string) => void;
}

export class VersionHistoryComponent {
  constructor(private _props: VersionHistoryProps) {}

  render(): string {
    return `<div>Version History for ${this._props.promptId}</div>`;
  }
}
