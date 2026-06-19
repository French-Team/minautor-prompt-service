// @deprecated — Utiliser le composant Nuxt <AnalyticsDashboard /> (components/AnalyticsDashboard.vue)

export interface AnalyticsDashboardProps {
  timeRange: 'day' | 'week' | 'month';
}

export class AnalyticsDashboardComponent {
  constructor(private _props: AnalyticsDashboardProps) {}

  render(): string {
    return `<div>Analytics Dashboard - ${this._props.timeRange}</div>`;
  }
}
