import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteStoreService } from '../services/quote-store.service';
import { GenUIService } from '../services/genui.service';
import { LiquidGlassThemeService } from '../services/liquid-glass-theme.service';
import { AnimatedBackgroundComponent } from '../components/animated-background/animated-background';
import { VoiceMicButtonComponent } from '../components/voice-mic-button/voice-mic-button';
import { LobSelectComponent } from './lob-select/lob-select';
import { CoverageSelectionComponent } from './coverage-selection/coverage-selection';
import { ApplicantInfoComponent } from './applicant-info/applicant-info';
import { QuoteSummaryComponent } from './quote-summary/quote-summary';

@Component({
  selector: 'app-quote-wizard',
  standalone: true,
  imports: [
    CommonModule,
    AnimatedBackgroundComponent,
    VoiceMicButtonComponent,
    LobSelectComponent,
    CoverageSelectionComponent,
    ApplicantInfoComponent,
    QuoteSummaryComponent,
  ],
  templateUrl: './quote-wizard.html',
  styleUrl: './quote-wizard.scss',
})
export class QuoteWizardComponent {
  readonly store = inject(QuoteStoreService);
  readonly genui = inject(GenUIService);
  readonly theme = inject(LiquidGlassThemeService);

  // Derive the ordered steps from the AI spec so Claude controls the wizard flow
  readonly steps = computed(() => this.genui.spec().steps);

  readonly currentStepIndex = computed(() => {
    const idx = this.steps().indexOf(this.store.currentStep() as any);
    return idx >= 0 ? idx : 0;
  });

  readonly progressPct = computed(() => {
    const total = this.steps().length;
    return total > 1 ? ((this.currentStepIndex() / (total - 1)) * 100).toFixed(0) : '0';
  });
}
