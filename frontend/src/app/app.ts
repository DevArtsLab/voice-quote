import { Component } from '@angular/core';
import { QuoteWizardComponent } from './quote-wizard/quote-wizard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QuoteWizardComponent],
  template: '<app-quote-wizard />',
})
export class App {}
