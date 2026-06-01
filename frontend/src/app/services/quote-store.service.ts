import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export interface QuoteFormState {
  lineOfBusiness: string;
  applicantName: string;
  applicantEmail: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  homeAddress: string;
  homeYearBuilt: string;
  lifeDob: string;
  selectedCoverageIds: string[];
  currentStep: string;
}

const INITIAL_STATE: QuoteFormState = {
  lineOfBusiness: '',
  applicantName: '',
  applicantEmail: '',
  vehicleYear: '',
  vehicleMake: '',
  vehicleModel: '',
  homeAddress: '',
  homeYearBuilt: '',
  lifeDob: '',
  selectedCoverageIds: [],
  currentStep: 'lob-select',
};

@Injectable({ providedIn: 'root' })
export class QuoteStoreService {
  readonly formState = signal<QuoteFormState>({ ...INITIAL_STATE });

  // Emits when Vapi's submit_quote tool fires — quote wizard listens to trigger mutation
  readonly submitTrigger$ = new Subject<void>();

  // Computed: current step driven by either manual nav or Vapi advance_step
  readonly currentStep = computed(() => this.formState().currentStep);

  patchField(field: string, value: string): void {
    this.formState.update((s) => ({ ...s, [field]: value }));
  }

  setStep(step: string): void {
    this.formState.update((s) => ({ ...s, currentStep: step }));
  }

  setSelectedCoverages(ids: string[]): void {
    this.formState.update((s) => ({ ...s, selectedCoverageIds: ids }));
  }

  toggleCoverage(id: string): void {
    this.formState.update((s) => {
      const ids = s.selectedCoverageIds.includes(id)
        ? s.selectedCoverageIds.filter((c) => c !== id)
        : [...s.selectedCoverageIds, id];
      return { ...s, selectedCoverageIds: ids };
    });
  }

  triggerSubmit(): void {
    this.submitTrigger$.next();
  }

  reset(): void {
    this.formState.set({ ...INITIAL_STATE });
  }
}
