import Logger from "../loaders/logger";

export interface ReconnectableResource<T> {
  connect(): Promise<T>;
  cleanup(resource: T): void;
}

export interface ReconnectManagerOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
}

const DEFAULT_INITIAL_DELAY_MS = 5_000;
const DEFAULT_MAX_DELAY_MS = 60_000;

export class ReconnectManager<T> {
  private readonly reconnectable: ReconnectableResource<T>;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly label: string;

  private resource: T | null = null;
  private attempts = 0;
  private running = false;

  constructor(
    reconnectable: ReconnectableResource<T>,
    options: ReconnectManagerOptions = {},
  ) {
    this.reconnectable = reconnectable;
    this.initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.label = options.label ?? "ReconnectManager";
  }

  async start(): Promise<T> {
    this.running = true;
    return this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.resource) {
      this.reconnectable.cleanup(this.resource);
      this.resource = null;
    }
  }

  async reconnect(): Promise<void> {
    if (!this.running) return;

    this.attempts++;
    const delay = Math.min(
      this.initialDelayMs * Math.pow(2, this.attempts - 1),
      this.maxDelayMs,
    );

    Logger.info(
      { label: this.label, attempt: this.attempts, delayMs: delay },
      "Scheduling reconnect",
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (!this.running) return;

    if (this.resource) {
      this.reconnectable.cleanup(this.resource);
      this.resource = null;
    }

    await this.connect();
  }

  getResource(): T | null {
    return this.resource;
  }

  isRunning(): boolean {
    return this.running;
  }

  private async connect(): Promise<T> {
    try {
      this.resource = await this.reconnectable.connect();
      this.attempts = 0;
      return this.resource;
    } catch (error) {
      Logger.error(
        { err: error, label: this.label },
        "Connection failed, scheduling reconnect",
      );
      await this.reconnect();
      return this.resource as T;
    }
  }
}
