import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { UISpec, DEFAULT_UI_SPEC } from '../genui/ui-spec.interface';
import { LiquidGlassThemeService, LineOfBusiness } from './liquid-glass-theme.service';

export interface GenUIContext {
  lineOfBusiness: LineOfBusiness;
  priorClaims?: boolean;
  commuteDistance?: number;
  vehicleAge?: number;
}

@Injectable({ providedIn: 'root' })
export class GenUIService {
  readonly spec = signal<UISpec>(DEFAULT_UI_SPEC);
  readonly loading = signal(false);

  private readonly apiBase = 'http://localhost:4000';

  constructor(
    private http: HttpClient,
    private themeService: LiquidGlassThemeService,
  ) {}

  // Call Claude via the backend to generate a personalised UI spec.
  // This is the core GenUI call — the AI decides layout, steps, highlights, and copy.
  async generateSpec(context: GenUIContext): Promise<void> {
    this.loading.set(true);
    try {
      const spec = await firstValueFrom(
        this.http.post<UISpec>(`${this.apiBase}/api/generate-ui`, context)
      );
      this.spec.set(spec);

      // Sync theme service with whatever LOB Claude inferred
      if (context.lineOfBusiness) {
        this.themeService.setLob(context.lineOfBusiness);
      }
    } catch (err) {
      console.error('GenUI spec fetch failed, using default:', err);
      this.spec.set(DEFAULT_UI_SPEC);
    } finally {
      this.loading.set(false);
    }
  }

  // Merge a partial spec update — used when Vapi changes the LOB mid-conversation
  patchSpec(partial: Partial<UISpec>): void {
    this.spec.set({ ...this.spec(), ...partial });
  }

  // Highlight a specific coverage ID (called by Vapi highlight_coverage tool)
  addHighlight(coverageId: string): void {
    const current = this.spec();
    if (!current.highlight.includes(coverageId)) {
      this.patchSpec({ highlight: [...current.highlight, coverageId] });
    }
  }
}
