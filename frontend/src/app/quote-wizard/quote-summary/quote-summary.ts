import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Apollo } from 'apollo-angular';
import { Subscription } from 'rxjs';
import { CREATE_QUOTE_MUTATION, SUBMIT_QUOTE_MUTATION } from '../../graphql/create-quote.mutation';
import { QUOTE_STATUS_SUBSCRIPTION } from '../../graphql/quote-status.subscription';
import { QuoteStoreService } from '../../services/quote-store.service';
import { LiquidGlassThemeService } from '../../services/liquid-glass-theme.service';

type QuoteStatus = 'draft' | 'submitted' | 'approved' | 'declined';

interface QuoteResult {
  id: string;
  applicantName: string;
  applicantEmail: string;
  lineOfBusiness: string;
  totalMonthlyPremium: number;
  status: QuoteStatus;
  createdAt: string;
  selectedCoverages: { id: string; name: string; monthlyPremium: number }[];
}

@Component({
  selector: 'app-quote-summary',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './quote-summary.html',
  styleUrl: './quote-summary.scss',
})
export class QuoteSummaryComponent implements OnInit, OnDestroy {
  readonly store = inject(QuoteStoreService);
  readonly theme = inject(LiquidGlassThemeService);
  private readonly apollo = inject(Apollo);

  readonly quote = signal<QuoteResult | null>(null);
  readonly status = signal<QuoteStatus>('draft');
  readonly submitting = signal(false);
  readonly error = signal('');

  private submitSub?: Subscription;
  private statusSub?: Subscription;

  ngOnInit(): void {
    // Only pre-create the quote draft if coverages are already selected (manual path).
    // On the voice path, advance_step fires before submit_quote sets the IDs,
    // so we defer createQuote() until submitTrigger$ fires with the real coverageIds.
    if (this.store.formState().selectedCoverageIds.length > 0) {
      this.createQuote();
    }
    // Listen for Vapi submit_quote tool call (and manual Submit button)
    this.submitSub = this.store.submitTrigger$.subscribe(() => {
      const q = this.quote();
      // Re-create if quote hasn't been created yet or was created with empty coverageIds
      if (!q || q.selectedCoverages.length === 0) {
        this.createQuote(() => this.submitQuote());
      } else {
        this.submitQuote();
      }
    });
  }

  private createQuote(onComplete?: () => void): void {
    const state = this.store.formState();
    this.apollo
      .mutate<{ createQuote: QuoteResult }>({
        mutation: CREATE_QUOTE_MUTATION,
        variables: {
          input: {
            lineOfBusiness: state.lineOfBusiness,
            applicantName: state.applicantName,
            applicantEmail: state.applicantEmail,
            coverageIds: state.selectedCoverageIds,
            aiPersonalized: true,
          },
        },
      })
      .subscribe({
        next: ({ data }) => {
          if (data?.createQuote) {
            this.quote.set(data.createQuote);
            this.status.set(data.createQuote.status as QuoteStatus);
            onComplete?.();
          }
        },
        error: (err) => this.error.set(err.message),
      });
  }

  submitQuote(): void {
    const q = this.quote();
    if (!q || this.submitting()) return;
    this.submitting.set(true);

    this.apollo
      .mutate<{ submitQuote: { id: string; status: string } }>({
        mutation: SUBMIT_QUOTE_MUTATION,
        variables: { id: q.id },
      })
      .subscribe({
        next: () => {
          this.subscribeToStatus(q.id);
        },
        error: (err) => {
          this.error.set(err.message);
          this.submitting.set(false);
        },
      });
  }

  // GraphQL Subscription — server pushes status updates in real time
  private subscribeToStatus(quoteId: string): void {
    this.statusSub = this.apollo
      .subscribe<{ quoteStatusUpdated: { id: string; status: string } }>({
        query: QUOTE_STATUS_SUBSCRIPTION,
        variables: { id: quoteId },
      })
      .subscribe({
        next: ({ data }) => {
          if (data?.quoteStatusUpdated) {
            this.status.set(data.quoteStatusUpdated.status as QuoteStatus);
            if (
              data.quoteStatusUpdated.status === 'approved' ||
              data.quoteStatusUpdated.status === 'declined'
            ) {
              this.submitting.set(false);
            }
          }
        },
      });
  }

  back(): void {
    this.store.setStep('applicant-info');
  }
  startOver(): void {
    this.store.reset();
  }

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
    this.statusSub?.unsubscribe();
  }
}
