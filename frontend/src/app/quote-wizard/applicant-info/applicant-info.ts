import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuoteStoreService } from '../../services/quote-store.service';

@Component({
  selector: 'app-applicant-info',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './applicant-info.html',
  styleUrl: './applicant-info.scss',
})
export class ApplicantInfoComponent {
  readonly store = inject(QuoteStoreService);

  get name(): string { return this.store.formState().applicantName; }
  set name(v: string) { this.store.patchField('applicantName', v); }

  get email(): string { return this.store.formState().applicantEmail; }
  set email(v: string) { this.store.patchField('applicantEmail', v); }

  isValid(): boolean {
    return this.name.trim().length > 1 && this.email.includes('@');
  }

  next(): void { this.store.setStep('summary'); }
  back(): void { this.store.setStep('coverage-selection'); }
}
