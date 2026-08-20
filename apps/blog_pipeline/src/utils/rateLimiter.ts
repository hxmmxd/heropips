/**
 * Utility functions for asynchronous delays, exponential backoff retries,
 * and concurrency-limited task execution.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: boolean;
  onRetry?: (error: any, attempt: number, nextDelayMs: number) => void;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines whether a caught error is transient and eligible for retry.
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // HTTP status codes 429 (Too Many Requests), 500, 502, 503, 504
  const status = error.status || error.statusCode || error.response?.status;
  if (status === 429 || (status >= 500 && status <= 504)) {
    return true;
  }

  const message = String(error.message || error).toLowerCase();
  if (
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('network error') ||
    message.includes('fetch failed')
  ) {
    return true;
  }

  return false;
}

/**
 * Executes an asynchronous function with exponential backoff and jitter on retryable failures.
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 15000;
  const backoffFactor = options.backoffFactor ?? 2;
  const useJitter = options.jitter ?? true;
  const shouldRetry = options.shouldRetry ?? isRetryableError;

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (attempt > maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate exponential delay with optional random jitter
      let delay = Math.min(currentDelay, maxDelayMs);
      if (useJitter) {
        delay = Math.floor(delay * (0.75 + Math.random() * 0.5));
      }

      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      }

      await sleep(delay);
      currentDelay *= backoffFactor;
    }
  }
}

/**
 * Concurrency pool runner that processes an array of items with a fixed maximum concurrency limit.
 * Optionally introduces a throttle delay between starting new tasks.
 */
export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  concurrencyLimit: number,
  taskRunner: (item: T, index: number) => Promise<R>,
  delayBetweenTasksMs = 0
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const limit = Math.max(1, Math.min(concurrencyLimit, items.length));

  let currentIndex = 0;
  let activeWorkers = 0;

  return new Promise<R[]>((resolve, reject) => {
    if (items.length === 0) {
      return resolve([]);
    }

    let hasError = false;

    const startNext = async () => {
      if (hasError) return;

      if (currentIndex >= items.length) {
        if (activeWorkers === 0) {
          resolve(results);
        }
        return;
      }

      const index = currentIndex++;
      const item = items[index];
      activeWorkers++;

      try {
        if (delayBetweenTasksMs > 0 && index > 0) {
          await sleep(delayBetweenTasksMs);
        }
        const result = await taskRunner(item, index);
        results[index] = result;
      } catch (err) {
        hasError = true;
        return reject(err);
      } finally {
        activeWorkers--;
        startNext();
      }
    };

    for (let i = 0; i < limit; i++) {
      startNext();
    }
  });
}

/**
 * A general-purpose queue-based Concurrency Pool.
 */
export class ConcurrencyPool {
  private limit: number;
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(limit = 2) {
    this.limit = Math.max(1, limit);
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }

  get activeCount(): number {
    return this.running;
  }

  get pendingCount(): number {
    return this.queue.length;
  }
}
