import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { VapiService } from '../../services/vapi.service';
import { GenUIService } from '../../services/genui.service';
import { QuoteStoreService } from '../../services/quote-store.service';
import { LiquidGlassThemeService, LineOfBusiness } from '../../services/liquid-glass-theme.service';

// VAPI_ASSISTANT_ID is read lazily at call time — index.html fetches it
// from /api/config async, so it won't be set at module-load time.
function getAssistantId(): string {
  return (window as unknown as Record<string, string>)['VAPI_ASSISTANT_ID'] ?? '';
}

@Component({
  selector: 'app-voice-mic-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mic-wrapper">
      <!-- Ripple rings (visible during active call) -->
      @if (vapi.isCallActive()) {
        <div class="ripple ripple-1"></div>
        <div class="ripple ripple-2"></div>
        <div class="ripple ripple-3"></div>
      }

      <!-- Mic button -->
      <button
        class="mic-btn"
        [class.active]="vapi.isCallActive()"
        [class.speaking]="vapi.isSpeaking()"
        (click)="toggle()"
        [attr.aria-label]="vapi.isCallActive() ? 'End voice session' : 'Start voice session'"
      >
        @if (vapi.isCallActive()) {
          <!-- Stop icon -->
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        } @else {
          <!-- Mic icon -->
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        }
      </button>

      <!-- Status label -->
      <span class="mic-label">{{ vapi.statusText() }}</span>
    </div>
  `,
  styles: [
    `
      .mic-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        position: relative;
      }
      .mic-btn {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.9);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.25s ease;
        position: relative;
        z-index: 2;
        animation: pulse-ring 2s ease-in-out infinite;

        &:hover {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.4);
          transform: scale(1.05);
        }
        &.active {
          background: rgba(239, 68, 68, 0.25);
          border-color: rgba(239, 68, 68, 0.6);
          animation: none;
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.4);
        }
        &.speaking {
          box-shadow: 0 0 32px rgba(52, 211, 153, 0.5);
          border-color: rgba(52, 211, 153, 0.6);
        }
      }
      .ripple {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 64px;
        height: 64px;
        margin: -32px 0 0 -32px;
        border-radius: 50%;
        border: 2px solid rgba(239, 68, 68, 0.4);
        z-index: 1;
      }
      .ripple-1 {
        animation: ripple-expand 1.5s ease-out infinite;
      }
      .ripple-2 {
        animation: ripple-expand 1.5s ease-out 0.5s infinite;
      }
      .ripple-3 {
        animation: ripple-expand 1.5s ease-out 1s infinite;
      }

      .mic-label {
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
        letter-spacing: 0.02em;
      }
    `,
  ],
})
export class VoiceMicButtonComponent implements OnInit, OnDestroy {
  readonly vapi = inject(VapiService);
  private readonly genui = inject(GenUIService);
  private readonly store = inject(QuoteStoreService);
  private readonly theme = inject(LiquidGlassThemeService);
  private sub?: Subscription;

  ngOnInit(): void {
    // Subscribe to Vapi tool call events and apply them to the form/UI
    this.sub = this.vapi.toolEvents$.subscribe((event) => {
      switch (event.type) {
        case 'fill_form_field': {
          const { field, value } = event.payload;
          this.store.patchField(field, value);
          // If LOB was filled, update theme + regenerate UI spec
          if (field === 'lineOfBusiness') {
            this.theme.setLob(value as LineOfBusiness);
            this.genui.generateSpec({ lineOfBusiness: value as LineOfBusiness });
          }
          break;
        }
        case 'highlight_coverage': {
          const { coverageId } = event.payload;
          this.genui.addHighlight(coverageId);
          break;
        }
        case 'advance_step': {
          const { step } = event.payload;
          this.store.setStep(step);
          break;
        }
        case 'submit_quote': {
          const { coverageIds } = event.payload;
          this.store.setSelectedCoverages(coverageIds);
          this.store.triggerSubmit();
          break;
        }
      }
    });
  }

  async toggle(): Promise<void> {
    if (this.vapi.isCallActive()) {
      this.vapi.stopCall();
    } else {
      await this.vapi.startCall(getAssistantId());
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
