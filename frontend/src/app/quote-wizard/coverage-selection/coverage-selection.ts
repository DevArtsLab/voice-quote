import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Apollo } from 'apollo-angular';
import { COVERAGE_OPTIONS_QUERY } from '../../graphql/coverage-options.query';
import { QuoteStoreService } from '../../services/quote-store.service';
import { GenUIService } from '../../services/genui.service';

interface CoverageOption {
  id: string;
  name: string;
  description: string;
  monthlyPremium: number;
  recommended: boolean;
  lineOfBusiness: string;
}

@Component({
  selector: 'app-coverage-selection',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './coverage-selection.html',
  styleUrl: './coverage-selection.scss',
})
export class CoverageSelectionComponent implements OnInit {
  readonly store = inject(QuoteStoreService);
  readonly genui = inject(GenUIService);
  private readonly apollo = inject(Apollo);

  readonly coverages = signal<CoverageOption[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    const lob = this.store.formState().lineOfBusiness || undefined;
    this.apollo
      .watchQuery<{ coverageOptions: CoverageOption[] }>({
        query: COVERAGE_OPTIONS_QUERY,
        variables: { lineOfBusiness: lob },
      })
      .valueChanges.subscribe({
        next: ({ data, loading }) => {
          this.loading.set(loading);
          if (data?.coverageOptions) this.coverages.set(data.coverageOptions as CoverageOption[]);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  isSelected(id: string): boolean {
    return this.store.formState().selectedCoverageIds.includes(id);
  }

  isHighlighted(id: string): boolean {
    return this.genui.spec().highlight.includes(id);
  }

  totalPremium(): number {
    return this.coverages()
      .filter((c) => this.isSelected(c.id))
      .reduce((sum, c) => sum + c.monthlyPremium, 0);
  }

  next(): void {
    this.store.setStep('applicant-info');
  }
}
