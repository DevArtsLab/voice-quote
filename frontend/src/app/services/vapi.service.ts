import { Injectable, signal, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import Vapi from '@vapi-ai/web';
import { environment } from '../../environments/environment';

export type VapiToolEvent =
  | { type: 'fill_form_field'; payload: { field: string; value: string } }
  | { type: 'highlight_coverage'; payload: { coverageId: string; reason?: string } }
  | { type: 'advance_step'; payload: { step: string } }
  | { type: 'submit_quote'; payload: { coverageIds: string[] } };

// Vapi sends tool call arguments as a JSON string in some payloads, an object in others.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseToolArgs(args: unknown): any {
  if (typeof args === 'string') {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return args ?? {};
}

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
  // Dedupe: tool calls can arrive via the in-band SDK message channel AND the
  // backend SSE bridge — apply each tool call only once.
  private handledToolCalls = new Set<string>();

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
        const payload = JSON.parse(e.data);
        const key = `sse:${type}:${JSON.stringify(payload)}`;
        if (this.handledToolCalls.has(key)) return;
        this.handledToolCalls.add(key);
        this.toolEvents$.next({ type, payload });
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

    // Primary tool-call path: the SDK streams every call message in-band,
    // including "tool-calls" — no dependency on the backend SSE bridge.
    this.vapiInstance.on('message', (m: unknown) => {
      const msg = m as {
        type?: string;
        toolCallList?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }>;
      };
      if (msg?.type !== 'tool-calls') return;
      for (const tc of msg.toolCallList ?? []) {
        const name = tc.function?.name as VapiToolEvent['type'] | undefined;
        if (!name) continue;
        const key = tc.id ?? `sdk:${name}:${JSON.stringify(tc.function?.arguments)}`;
        if (this.handledToolCalls.has(key)) continue;
        this.handledToolCalls.add(key);
        this.toolEvents$.next({
          type: name,
          payload: parseToolArgs(tc.function?.arguments),
        } as VapiToolEvent);
      }
    });

    this.vapiInstance.on('call-end', () => {
      this.isCallActive.set(false);
      this.isSpeaking.set(false);
      this.statusText.set('Ready to talk');
      this.currentCallId = null;
      this.sseSource?.close();
      this.sseSource = null;
    });

    this.vapiInstance.on('error', (err: unknown) => {
      console.error('Vapi error:', err);
      this.statusText.set('Call error — try again');
      this.isCallActive.set(false);
    });

    this.handledToolCalls.clear();

    // Register SSE as soon as the call ID is known — 'call-start-progress'
    // fires right after web-call creation, well before start() resolves.
    this.vapiInstance.on('call-start-progress', (e: unknown) => {
      const ev = e as { stage?: string; status?: string; metadata?: { callId?: string } };
      if (
        ev?.stage === 'web-call-creation' &&
        ev?.status === 'completed' &&
        ev.metadata?.callId &&
        !this.currentCallId
      ) {
        this.currentCallId = ev.metadata.callId;
        this.connectSSE(ev.metadata.callId);
      }
    });

    // start() returns the Call object which has the Vapi call ID
    const call = await this.vapiInstance.start(assistantId);
    if (call?.id && !this.currentCallId) {
      this.currentCallId = call.id;
      this.connectSSE(call.id);
    } else if (!call?.id && !this.currentCallId) {
      console.warn(
        'Vapi: call started but no call ID returned — SSE tool-call bridge will not work',
      );
    }
  }

  stopCall(): void {
    this.vapiInstance?.stop();
    this.isCallActive.set(false);
    this.isSpeaking.set(false);
    this.statusText.set('Ready to talk');
    this.currentCallId = null;
    this.handledToolCalls.clear();
    this.sseSource?.close();
    this.sseSource = null;
  }

  private getApiKey(): string {
    return ((window as unknown as Record<string, unknown>)['VAPI_PUBLIC_KEY'] as string) ?? '';
  }

  ngOnDestroy(): void {
    this.sseSource?.close();
    this.toolEvents$.complete();
  }
}
