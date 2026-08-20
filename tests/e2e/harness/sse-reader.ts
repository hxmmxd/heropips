/**
 * SSE Stream Reader Utility for E2E Hermetic Testing
 * Parses text/event-stream chunks, evaluates JSON payloads, and records event timings.
 */

export interface SSEEvent<T = any> {
  raw: string;
  data: T;
  event?: string;
  id?: string;
  timestamp: number;
  deltaMs?: number;
}

export interface ReadSSEOptions {
  maxChunks?: number;
  timeoutMs?: number;
  until?: (event: SSEEvent) => boolean;
}

export async function readSSEChunks<T = any>(
  response: Response,
  options: ReadSSEOptions = {}
): Promise<SSEEvent<T>[]> {
  const { maxChunks = 5, timeoutMs = 3000, until } = options;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is null or not readable as a ReadableStream');
  }

  const decoder = new TextDecoder();
  const events: SSEEvent<T>[] = [];
  let buffer = '';
  let lastTimestamp = Date.now();

  let isDone = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      if (!isDone) {
        reject(new Error(`readSSEChunks timed out after ${timeoutMs}ms (received ${events.length} chunks)`));
      }
    }, timeoutMs);
    // Allow timer to not block process exit if possible
    if (typeof timer.unref === 'function') timer.unref();
  });

  const readerPromise = (async (): Promise<SSEEvent<T>[]> => {
    try {
      while (events.length < maxChunks) {
        const { value, done } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        const now = Date.now();
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double newline \n\n or \r\n\r\n
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || '';

        for (const block of parts) {
          if (!block.trim()) continue;

          let eventType: string | undefined;
          let eventId: string | undefined;
          let dataStr = '';

          const lines = block.split(/\r?\n/);
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('id:')) {
              eventId = line.slice(3).trim();
            } else if (line.startsWith('data:')) {
              dataStr += (dataStr ? '\n' : '') + line.slice(5).trim();
            }
          }

          if (dataStr) {
            let parsedData: any;
            try {
              parsedData = JSON.parse(dataStr);
            } catch {
              parsedData = dataStr;
            }

            const sseEvent: SSEEvent<T> = {
              raw: block,
              data: parsedData,
              event: eventType,
              id: eventId,
              timestamp: now,
              deltaMs: events.length > 0 ? now - lastTimestamp : 0,
            };

            lastTimestamp = now;
            events.push(sseEvent);

            if (until && until(sseEvent)) {
              isDone = true;
              return events;
            }

            if (events.length >= maxChunks) {
              isDone = true;
              return events;
            }
          }
        }
      }
      return events;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Ignore lock release errors
      }
    }
  })();

  return Promise.race([readerPromise, timeoutPromise]);
}
