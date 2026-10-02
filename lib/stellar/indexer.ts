import { rpc, xdr } from "@stellar/stellar-sdk";

import {
  CHECKOUT_CONTRACT_ID,
  EVENT_POLL_INTERVAL_MS,
  EVENT_START_LEDGER_BACKFILL,
  RPC_URL,
} from "./config";
import { scValToString } from "./scval";

// ---------------------------------------------------------------------------
// Real-time event indexer.
//
// Polls `getEvents` (cursor-paginated) for the checkout contract and decodes
// the contract's events (`pay`, `create_order`, `dispatch`, `refund`) so the
// UI can update instantly when a payment lands. Uses a ledger backfill on
// first connect, then advances by cursor so nothing is missed between polls.
// ---------------------------------------------------------------------------

export interface IndexedEvent {
  id: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  /** Deployed checkout contract id. */
  contractId?: string;
  /** Event name, e.g. "pay", "create_order", "dispatch", "refund". */
  symbol: string;
  /** Raw topics (including the symbol as topics[0]). */
  topics: xdr.ScVal[];
  /** Decoded fields: topics[1..] as topic1..topicN plus data-map entries. */
  fields: Record<string, string>;
}

export interface IndexerStatus {
  running: boolean;
  /** True while the indexer is started but polling is suspended (tab hidden). */
  paused: boolean;
  latestLedger?: number;
  lastCursor?: string;
  eventsSeen: number;
  lastError?: string;
  retrying?: boolean;
}

export interface IndexerCallbacks {
  onEvent: (event: IndexedEvent) => void;
  onStatus?: (status: IndexerStatus) => void;
  onError?: (error: Error) => void;
}

const RETENTION_RETRY_LEDGER_DELTA = 5;



export class PaymentEventIndexer {
  private readonly server: rpc.Server;
  private readonly contractId: string;
  private readonly pollMs: number;
  private readonly watchedSymbols: string[];
  /** Durable start ledger for history-sensitive views; `undefined` keeps the rolling backfill. */
  private readonly durableStartLedger: number | undefined;
  /** When set, the resume cursor is persisted here so a reload continues the scan. */
  private readonly cursorStorageKey: string | undefined;

  private cursor: string | undefined;
  private startLedger: number | undefined;
  private latestLedger: number | undefined;
  private eventsSeen = 0;
  private lastError: string | undefined;
  private readonly seenIds = new Set<string>();

  private timer: ReturnType<typeof setInterval> | null = null;
  /** Prevents a new poll from starting while the previous one is still running. */
  private inFlight = false;
  /** Set while the document is hidden; polling resumes on visibilitychange. */
  private paused = false;
  private visibilityListener: (() => void) | null = null;
  private running = false;
  private started = false;
  private initializing = false;
  private initialized = false;

  constructor(
    opts: {
      rpcUrl?: string;
      contractId?: string;
      pollMs?: number;
      watchedSymbols?: string[];
      startLedger?: number;
      cursorStorageKey?: string;
    } = {}
  ) {
    this.server = new rpc.Server(opts.rpcUrl ?? RPC_URL);
    this.contractId = opts.contractId ?? CHECKOUT_CONTRACT_ID;
    this.pollMs = opts.pollMs ?? EVENT_POLL_INTERVAL_MS;
    this.watchedSymbols = opts.watchedSymbols ?? ["pay", "create_order", "dispatch", "refund"];
    this.durableStartLedger =
      opts.startLedger !== undefined && opts.startLedger > 0 ? opts.startLedger : undefined;
    this.cursorStorageKey = opts.cursorStorageKey;
  }

  get status(): IndexerStatus {
    return {
      running: this.running,
      paused: this.paused,
      latestLedger: this.latestLedger,
      lastCursor: this.cursor,
      eventsSeen: this.eventsSeen,
      lastError: this.lastError,
      retrying: this.running && !this.initialized,
    };
  }

  /** Begin polling. Idempotent; safe to call again after `stop`. */
  start(callbacks: IndexerCallbacks): void {
    if (this.running) return;
    this.running = true;
    this.started = true;

    this.attachVisibilityListener(callbacks);

    // A tab that is already hidden must not schedule polls at all; the
    // visibilitychange handler resumes (with a catch-up tick) on focus.
    if (typeof document !== "undefined" && document.hidden) {
      this.paused = true;
      callbacks.onStatus?.(this.status);
      return;
    }

    this.timer = setInterval(() => void this.tick(callbacks), this.pollMs);
    void this.tick(callbacks);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.detachVisibilityListener();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(callbacks: IndexerCallbacks): Promise<void> {
    if (!this.running || this.paused) return;

    // Never let the interval outrun its own work. If the previous poll is still
    // unresolved (a slow getLatestLedger/getEvents), skip this tick entirely —
    // overlapping polls would read the same cursor, advance it out of order and
    // deliver the same event twice.
    if (this.inFlight) return;
    this.inFlight = true;

    try {
      if (!this.initialized) {
        await this.ensureInitialized(callbacks);
        if (!this.initialized) {
          return;
        }
      }

      await this.poll(callbacks);
    } finally {
      this.inFlight = false;
    }
  }

  /**
   * Background tabs should not poll: stop the interval while the document is
   * hidden so a buyer who switches tabs mid-payment stops hammering the RPC.
   */
  private attachVisibilityListener(callbacks: IndexerCallbacks): void {
    if (typeof document === "undefined" || this.visibilityListener) return;
    this.visibilityListener = () => this.handleVisibilityChange(callbacks);
    document.addEventListener("visibilitychange", this.visibilityListener);
  }

  private detachVisibilityListener(): void {
    if (this.visibilityListener && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityListener);
    }
    this.visibilityListener = null;
  }

  private handleVisibilityChange(callbacks: IndexerCallbacks): void {
    if (!this.running) return;
    if (typeof document !== "undefined" && document.hidden) {
      this.pause(callbacks);
    } else {
      this.resume(callbacks);
    }
  }

  private pause(callbacks: IndexerCallbacks): void {
    if (this.paused) return;
    this.paused = true;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    callbacks.onStatus?.(this.status);
  }

  /**
   * Resume polling and run one catch-up tick immediately. The cursor is kept
   * across the pause, so the catch-up reads every event that landed while the
   * tab was hidden — nothing is skipped.
   */
  private resume(callbacks: IndexerCallbacks): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.timer === null) {
      this.timer = setInterval(() => void this.tick(callbacks), this.pollMs);
    }
    callbacks.onStatus?.(this.status);
    void this.tick(callbacks);
  }

  private async ensureInitialized(callbacks: IndexerCallbacks): Promise<void> {
    if (this.initializing) return;
    this.initializing = true;

    try {
      const latest = await this.server.getLatestLedger();
      this.latestLedger = latest.sequence;
      this.startLedger = Math.max(1, this.latestLedger - EVENT_START_LEDGER_BACKFILL);
      this.initialized = true;
      this.lastError = undefined;
      callbacks.onStatus?.(this.status);
    } catch (err) {
      this.lastError = String(err instanceof Error ? err.message : err);
      callbacks.onError?.(
        new Error(`Could not reach the Stellar RPC (retrying): ${this.lastError}`)
      );
      callbacks.onStatus?.(this.status);
    } finally {
      this.initializing = false;
    }
  }

  /**
   * The ledger a fresh scan starts from. A configured durable start ledger wins
   * over the rolling backfill window, so a history-sensitive view can reach
   * orders older than `EVENT_START_LEDGER_BACKFILL`.
   */
  private resolveStartLedger(): number {
    if (this.durableStartLedger !== undefined) {
      return this.durableStartLedger;
    }
    if (this.latestLedger !== undefined) {
      return Math.max(1, this.latestLedger - EVENT_START_LEDGER_BACKFILL);
    }
    return 1;
  }

  private readPersistedCursor(): string | undefined {
    if (!this.cursorStorageKey || typeof window === "undefined") return undefined;
    try {
      return window.localStorage.getItem(this.cursorStorageKey) ?? undefined;
    } catch {
      // A disabled or full localStorage must not stop the scan.
      return undefined;
    }
  }

  private persistCursor(): void {
    if (!this.cursorStorageKey || !this.cursor || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.cursorStorageKey, this.cursor);
    } catch {
      // Best-effort: an unwritable store just means the next load re-scans.
    }
  }

  private clearPersistedCursor(): void {
    if (!this.cursorStorageKey || typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.cursorStorageKey);
    } catch {
      // Best-effort.
    }
  }

  private async poll(callbacks: IndexerCallbacks): Promise<void> {
    if (!this.running || !this.initialized) return;
    try {
      const res = await this.fetchEvents();
      this.latestLedger = res.latestLedger;
      this.lastError = undefined;

      // Once a cursor is available, drop the start-ledger window so the next
      // poll advances by cursor instead of re-scanning the backfill range. This
      // has to stay inside the `if`: clearing it on a cursor-less response left
      // the indexer with neither a cursor nor a start ledger, so every later
      // poll threw "no cursor or start ledger to poll from" and the scan stopped
      // advancing entirely.
      if (res.cursor) {
        this.cursor = res.cursor;
        this.persistCursor();
        this.startLedger = undefined;
        this.cursorExpired = false;
      }

      for (const raw of res.events) {
        if (!raw.inSuccessfulContractCall) continue;
        if (this.seenIds.has(raw.id)) continue;
        this.seenIds.add(raw.id);

        const decoded = this.decodeEvent(raw);
        if (decoded) {
          this.eventsSeen += 1;
          try {
            callbacks.onEvent(decoded);
          } catch {
            // a throwing consumer must not break the poll loop
          }
        }
      }

      callbacks.onStatus?.(this.status);
    } catch (err) {
      this.lastError = String(err instanceof Error ? err.message : err);
      callbacks.onError?.(new Error(`getEvents failed: ${this.lastError}`));
      this.recoverFromRetentionError(err);
      this.recoverFromCursorExpiry();
      this.recoverFromRetentionError();
      callbacks.onStatus?.(this.status);
    }
  }

  private async fetchEvents(): Promise<rpc.Api.GetEventsResponse> {
    const filters: rpc.Api.EventFilter[] = [{ type: "contract", contractIds: [this.contractId] }];
    if (this.startLedger !== undefined) {
      return this.server.getEvents({ filters, startLedger: this.startLedger });
    }
    if (this.cursor) {
      return this.server.getEvents({ filters, cursor: this.cursor });
    }
    throw new Error("Indexer has no cursor or start ledger to poll from.");
  }

  /**
   * If the cursor has fallen out of the RPC's retention window, drop it and
   * re-derive a fresh start ledger near the tip so the next poll can proceed
   * instead of replaying a dead cursor forever.
   */
  private recoverFromCursorExpiry(): void {
    if (!this.cursor) return;
    const message = this.lastError ?? "";
    if (!RETENTION_ERROR_PATTERNS.some((pattern) => pattern.test(message))) return;

    this.cursor = undefined;
    if (this.latestLedger !== undefined) {
      this.startLedger = Math.max(1, this.latestLedger - RETENTION_RETRY_LEDGER_DELTA);
    } else {
      this.initialized = false;
    }
  }

  /**
   * If the requested start ledger predates the RPC's retention window, roll
   * the window forward toward the tip so the next poll can proceed.
   */
  private recoverFromRetentionError(): void {
    if (this.startLedger !== undefined && this.latestLedger !== undefined) {
      this.startLedger = Math.max(
        this.startLedger,
        this.latestLedger - RETENTION_RETRY_LEDGER_DELTA
      );
    }
  }

  /**
   * If the RPC rejects the cursor because it has fallen out of the retention
   * window, clear it and re-derive a start ledger near the tip so the next
   * poll can proceed instead of replaying the dead cursor forever.
   */
  private recoverFromCursorExpiry(): void {
    if (this.cursor === undefined) return;
    if (!this.isCursorExpiredError(this.lastError)) return;

    this.cursor = undefined;
    this.cursorExpired = true;
    if (this.latestLedger !== undefined) {
      this.startLedger = Math.max(
        1,
        this.latestLedger - EVENT_START_LEDGER_BACKFILL
      );
    }

    if (this.cursor !== undefined && isRetentionError(error)) {
      this.cursor = undefined;
      this.clearPersistedCursor();
      this.startLedger = this.resolveStartLedger();
    }
  }

  /** Exposed for tests: current scan position (cursor or start ledger). */
  get scanPosition(): { cursor?: string; startLedger?: number } {
    return { cursor: this.cursor, startLedger: this.startLedger };
  }

  private isCursorExpiredError(message: string | undefined): boolean {
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
      lower.includes("cursor") &&
      (lower.includes("expired") ||
        lower.includes("retention") ||
        lower.includes("out of range") ||
        lower.includes("too old") ||
        lower.includes("not found"))
    );
  }
  private decodeEvent(raw: rpc.Api.EventResponse): IndexedEvent | null {
    const first = raw.topic[0];
    if (!first || first.switch() !== xdr.ScValType.scvSymbol()) return null;
    const symbol = first.sym().toString();
    if (!this.watchedSymbols.includes(symbol)) return null;

    const fields: Record<string, string> = {};
    raw.topic.slice(1).forEach((topic, index) => {
      fields[`topic${index + 1}`] = scValToString(topic);
    });

    const data = raw.value;
    if (data.switch() === xdr.ScValType.scvMap()) {
      for (const entry of data.map() ?? []) {
        const key =
          entry.key().switch() === xdr.ScValType.scvSymbol()
            ? entry.key().sym().toString()
            : scValToString(entry.key());
        fields[key] = scValToString(entry.val());
      }
    } else if (data.switch() === xdr.ScValType.scvVec()) {
      fields.value = (data.vec() ?? []).map(scValToString).join(",");
    } else {
      fields.value = scValToString(data);
    }

    return {
      id: raw.id,
      ledger: raw.ledger,
      ledgerClosedAt: raw.ledgerClosedAt,
      txHash: raw.txHash,
      contractId: raw.contractId?.toString(),
      symbol,
      topics: raw.topic,
      fields,
    };
  }
}
