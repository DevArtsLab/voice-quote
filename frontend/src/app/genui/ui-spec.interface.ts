// UISpec — the JSON shape returned by Claude (via /api/generate-ui).
// This is the contract between the AI backend and the Angular GenUI renderer.
// The renderer reads this spec and dynamically chooses which components to show,
// what copy to display, and which coverages to highlight.

export type WizardStep =
  | 'lob-select'
  | 'vehicle-info'
  | 'home-info'
  | 'life-info'
  | 'coverage-selection'
  | 'driver-info'
  | 'applicant-info'
  | 'summary';

export interface UISpecCopy {
  headline: string;
  subheadline: string;
  coverageHint: string;
}

export interface UISpecTheme {
  primaryColor: string;
  accentColor: string;
}

export interface UISpec {
  layout: 'focused' | 'expanded';
  steps: WizardStep[];
  highlight: string[];         // coverage IDs to visually emphasize
  hiddenFields: string[];      // form field names to hide
  copy: UISpecCopy;
  theme: UISpecTheme;
}

// Default spec shown while Claude is loading
export const DEFAULT_UI_SPEC: UISpec = {
  layout: 'focused',
  steps: ['lob-select', 'coverage-selection', 'applicant-info', 'summary'],
  highlight: [],
  hiddenFields: [],
  copy: {
    headline: 'Get your personalized insurance quote',
    subheadline: 'Tell us what you need — we\'ll tailor the experience for you.',
    coverageHint: 'Select a line of business to see AI-recommended coverages.',
  },
  theme: { primaryColor: '#64748B', accentColor: '#475569' },
};
