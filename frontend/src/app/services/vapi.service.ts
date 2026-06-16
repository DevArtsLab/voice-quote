import { Injectable, signal, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import Vapi from '@vapi-ai/web';
import { environment } from '../../environments/environment';

export type VapiToolEvent =
  | { type: 'fill_form_field'; payload: { field: string; value: string } }
  | { type: 'highlight_coverage'; payload: { coverageId: string; reason?: string } }
  | { type: 'advance_step'; payload: { step: string } }
  | { type: 'submit_quote'; payload: { coverageIds: string[] } };

@Injectable({ providedIn: 'root' })
export class VapiService implements OnDestroy {
  readonly isCallActive = signal(false);
  readonly isSpeaking = signal(false);
  readonly statusText = signal('Ready to talk');

  // Components subscribe to this stream to react to tool calls
  readonly toolEvents$ = new Subject<VapiToolEvent>();

  private vapiInstance: Vapi | null = null;
  private sseSource: EventSource | null = null;
  private currentCallId: string | null = null;

  // Connect to the backend SSE stream keyed by the Vapi call ID
  private connectSSE(callId: string): void {
    this.sseSource?.close();
    const url = `${environment.apiBaseUrl}/api/events?sessionId=${callId}`;
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
      if (this.currentCallId) {
        setTimeout(() => this.connectSSE(this.currentCallId!), 3000);
      }
    };
  }

  async startCall(assistantId: string): Promise<void> {
    const apiKey = this.getApiKey();
    if (!assistantId || !apiKey) {
      console.warn('Vapi: missing assistant ID or API key', { assistantId, hasKey: !!apiKey });
      this.statusText.set('Voice unavailable — check Vapi config');
      return;
    }

    this.vapiInstance = new Vapi(apiKey);

    this.vapiInstance.on('call-start', () => {
      this.isCallActive.set(true);
      this.statusText.set('Connected — speak now');
    });

    this.vapiInstance.on('speech-start', () => this.isSpeaking.set(true));
    this.vapiInstance.on('speech-end', () => this.isSpeaking.set(false));

    this.vapiInstance.on('call-end', () => {
      this.isCallActive.set(false);
      this.isSpeaking.set(false);
      this.statusText.set('Ready to talk');
      this.currentCallId = null;
    });

    this.vapiInstance.on('error', (err: unknown) => {
      console.error('Vapi error:', err);
      this.statusText.set('Call error — try again');
      this.isCallActive.set(false);
    });

    // start() returns the Call object which has the Vapi call ID
    const call = await this.vapiInstance.start(assistantId);
    if (call?.id) {
      this.currentCallId = call.id;
      this.connectSSE(call.id);
    } else {
      console.warn('Vapi: call started but no call ID returned — tool calls will not work');
    }
  }

  stopCall(): void {
    this.vapiInstance?.stop();
    this.isCallActive.set(false);
    this.isSpeaking.set(false);
    this.statusText.set('Ready to talk');
    this.currentCallId = null;
  }

  private getApiKey(): string {
    return ((window as unknown as Record<string, unknown>)['VAPI_PUBLIC_KEY'] as string) ?? '';
  }

  ngOnDestroy(): void {
    this.sseSource?.close();
    this.toolEvents$.complete();
  }
}
