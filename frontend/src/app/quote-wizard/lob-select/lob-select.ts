import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LiquidGlassThemeService, LineOfBusiness } from '../../services/liquid-glass-theme.service';
import { QuoteStoreService } from '../../services/quote-store.service';
import { GenUIService } from '../../services/genui.service';

interface LobOption {
  id: LineOfBusiness;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-lob-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-enter lob-select">
      <h1 class="headline">{{ genui.spec().copy.headline }}</h1>
      <p class="subheadline">{{ genui.spec().copy.subheadline }}</p>

      <div class="lob-grid">
        @for (opt of lobOptions; track opt.id) {
          <button
            class="glass-card lob-card"
            [class.selected]="store.formState().lineOfBusiness === opt.id"
            (click)="selectLob(opt.id)">
            <span class="lob-icon">{{ opt.icon }}</span>
            <span class="lob-label">{{ opt.label }}</span>
            <span class="lob-desc">{{ opt.description }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .lob-select {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2rem;
      padding: 2rem 0;
    }
    .headline {
      font-family: 'Sora', sans-serif;
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      line-height: 1.2;
    }
    .subheadline {
      font-size: 1rem;
      color: var(--text-secondary);
      margin: 0;
      max-width: 480px;
    }
    .lob-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.25rem;
      width: 100%;
      max-width: 640px;
    }
    .lob-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      padding: 2rem 1.25rem;
      cursor: pointer;
      border: 1px solid var(--glass-border);
      background: none;
      text-align: center;
      transition: all 0.25s ease;

      &.selected {
        border-color: var(--lob-primary) !important;
        box-shadow: 0 0 0 2px var(--lob-primary), var(--glass-shadow);
        background: rgba(255,255,255,0.12) !important;
      }
    }
    .lob-icon { font-size: 2.25rem; line-height: 1; }
    .lob-label {
      font-family: 'Sora', sans-serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .lob-desc {
      font-size: 0.78rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }
  `],
})
export class LobSelectComponent {
  readonly store = inject(QuoteStoreService);
  readonly genui = inject(GenUIService);
  private readonly theme = inject(LiquidGlassThemeService);

  readonly lobOptions: LobOption[] = [
    { id: 'auto', label: 'Auto',  description: 'Cars, trucks & motorcycles', icon: '🚗' },
    { id: 'home', label: 'Home',  description: 'Houses, condos & renters',    icon: '🏠' },
    { id: 'life', label: 'Life',  description: 'Term, whole & riders',        icon: '🛡️' },
  ];

  selectLob(lob: LineOfBusiness): void {
    this.store.patchField('lineOfBusiness', lob);
    this.theme.setLob(lob);
    // Trigger Claude to personalise the UI spec for this LOB
    this.genui.generateSpec({ lineOfBusiness: lob });
    // Advance to next step
    setTimeout(() => this.store.setStep('coverage-selection'), 300);
  }
}
