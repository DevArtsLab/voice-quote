import { Injectable, signal, effect } from '@angular/core';

export type LineOfBusiness = 'auto' | 'home' | 'life' | 'default';

export interface LobTheme {
  primaryColor: string;
  secondaryColor: string;
  orb1: string;
  orb2: string;
  orb3: string;
  orb4: string;
  label: string;
}

const LOB_THEMES: Record<LineOfBusiness, LobTheme> = {
  auto: {
    primaryColor: '#3B82F6',
    secondaryColor: '#6366F1',
    orb1: 'rgba(59,130,246,0.75)',
    orb2: 'rgba(99,102,241,0.65)',
    orb3: 'rgba(139,92,246,0.55)',
    orb4: 'rgba(6,182,212,0.5)',
    label: 'Auto Insurance',
  },
  home: {
    primaryColor: '#10B981',
    secondaryColor: '#14B8A6',
    orb1: 'rgba(16,185,129,0.75)',
    orb2: 'rgba(20,184,166,0.65)',
    orb3: 'rgba(245,158,11,0.5)',
    orb4: 'rgba(6,182,212,0.45)',
    label: 'Home Insurance',
  },
  life: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#EC4899',
    orb1: 'rgba(139,92,246,0.75)',
    orb2: 'rgba(236,72,153,0.65)',
    orb3: 'rgba(99,102,241,0.55)',
    orb4: 'rgba(244,63,94,0.45)',
    label: 'Life Insurance',
  },
  default: {
    primaryColor: '#64748B',
    secondaryColor: '#475569',
    orb1: 'rgba(100,116,139,0.6)',
    orb2: 'rgba(71,85,105,0.5)',
    orb3: 'rgba(51,65,85,0.45)',
    orb4: 'rgba(30,27,75,0.4)',
    label: 'Insurance Quote',
  },
};

@Injectable({ providedIn: 'root' })
export class LiquidGlassThemeService {
  readonly lob = signal<LineOfBusiness>('default');
  readonly theme = signal<LobTheme>(LOB_THEMES['default']);

  constructor() {
    // Reactively update CSS variables whenever LOB changes
    effect(() => {
      const t = this.theme();
      const root = document.documentElement;
      root.style.setProperty('--lob-primary', t.primaryColor);
      root.style.setProperty('--lob-secondary', t.secondaryColor);
      root.style.setProperty('--lob-orb1', t.orb1);
      root.style.setProperty('--lob-orb2', t.orb2);
      root.style.setProperty('--lob-orb3', t.orb3);
      root.style.setProperty('--lob-orb4', t.orb4);
    });
  }

  setLob(lob: LineOfBusiness): void {
    this.lob.set(lob);
    this.theme.set(LOB_THEMES[lob] ?? LOB_THEMES['default']);
  }

  getTheme(): LobTheme {
    return this.theme();
  }

  allThemes(): Record<LineOfBusiness, LobTheme> {
    return LOB_THEMES;
  }
}
