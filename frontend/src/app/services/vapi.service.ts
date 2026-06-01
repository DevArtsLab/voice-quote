import { Injectable, signal, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export type VapiToolEvent =
  | { type: 'fill_form_field'; payload: { field: string; value: string } }
  | { type: 'highlight_coverage'; payload: { coverageId: string; reason?: string } }
  | { type: 'advance_step'; payload: { step: string } }
  | { type: 'submit_quote'; payload: { coverageIds: string[] } };

// Vapi Web SDK is loaded via CDN script tag in index.html.
// The UMD bundle sets window.Vapi — we access it via window to avoid
// TypeScript "not defined" errors and handle load-timing issues.
declare const Vapi: new (apiKey: string) => VapiInstance;
function getVapiConstructor(): (new (apiKey: string) => VapiInstance) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w['Vapi'] ?? w['VapiWeb'] ?? null) as (new (apiKey: string) => VapiInstance) | null;
}

interface VapiInstance {
  start(assistantId: string, metadata?: Record<string, unknown>): Promise<void>;
  stop(): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off(event: string, cb: (...args: unknown[]) => void): void;
}

@Injectable({ providedIn: 'root' })
export class VapiService implements OnDestroy {
  readonly isCallActive = signal(false);
  readonly isSpeaking = signal(false);
  readonly statusText = signal('Ready to talk');

  // Components subscribe to this stream to react to tool calls
  readonly toolEvents$ = new Subject<VapiToolEvent>();

  private vapiInstance: VapiInstance | null = null;
  private sessionId: string = crypto.randomUUID();
  private sseSource: EventSource | null = null;

  constructor() {
    this.connectSSE();
  }

  // Connect to the backend SSE stream for Vapi tool-call events
  private connectSSE(): void {
    const url = `${environment.apiBaseUrl}/api/events?sessionId=${this.sessionId}`;
    this.sseSource = new EventSource(url);

    const eventTypes: VapiToolEvent['type'][] = [
      'fill_form_field',
      'highlight_coverage',
      'advance_step',
      'submit_quote',
    ];

    eventTypes.forEach((type) => {
      this.sseSource!.addEventListener(type, (e: MessageEvent) => {
        this.toolEvents$.next({ type, payload: JSON.parse(e.data) });
      });
    });

    this.sseSource.onerror = () => {
      // Reconnect silently after 3s
      setTimeout(() => this.connectSSE(), 3000);
    };
  }

  async startCall(assistantId: string): Promise<void> {
    const VapiConstructor = getVapiConstructor();
    if (!assistantId || !VapiConstructor) {
      console.warn('Vapi SDK not loaded or no assistant ID provided', {
        assistantId,
        VapiConstructor,
      });
      this.statusText.set('Voice unavailable — check Vapi config');
      return;
    }

    this.vapiInstance = new VapiConstructor(this.getApiKey());

    this.vapiInstance.on('call-start', () => {
      this.isCallActive.set(true);
      this.statusText.set('Connected — speak now');
    });

    this.vapiInstance.on('speech-start', () => this.isSpeaking.set(true));
    this.vapiInstance.on('speech-end', () => this.isSpeaking.set(false));

    this.vapiInstance.on('call-end', () => {
      this.isCallActive.set(false);
      this.isSpeaking.set(false);
      this.statusText.set('Call ended');
    });

    this.vapiInstance.on('error', (err: unknown) => {
      console.error('Vapi error:', err);
      this.statusText.set('Call error — try again');
      this.isCallActive.set(false);
    });

    await this.vapiInstance.start(assistantId, { sessionId: this.sessionId });
  }

  stopCall(): void {
    this.vapiInstance?.stop();
    this.isCallActive.set(false);
    this.isSpeaking.set(false);
    this.statusText.set('Ready to talk');
  }

  private getApiKey(): string {
    // In a real app inject this from environment.ts
    return ((window as unknown as Record<string, unknown>)['VAPI_PUBLIC_KEY'] as string) ?? '';
  }

  ngOnDestroy(): void {
    this.sseSource?.close();
    this.toolEvents$.complete();
  }
}
