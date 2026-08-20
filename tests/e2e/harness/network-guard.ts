/**
 * Zero Outbound HTTP Network Guard for UQP E2E Testing
 * Intercepts globalThis.fetch and asserts zero network leaks to external market providers.
 */

export interface NetworkCallEntry {
  url: string;
  method: string;
  timestamp: number;
  isForbidden: boolean;
}

export class NetworkGuard {
  private static originalFetch: typeof globalThis.fetch | null = null;
  private static isInstalled = false;
  private static callLog: NetworkCallEntry[] = [];
  private static forbiddenDomains: string[] = [
    'api.twelvedata.com',
    'twelvedata.com',
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
    'finance.yahoo.com',
    'yahoo.com/news/rssindex',
  ];
  private static mockRoutes: Map<string | RegExp, (req: Request) => Promise<Response>> = new Map();

  static install(): void {
    if (this.isInstalled) return;
    this.originalFetch = globalThis.fetch;
    this.callLog = [];
    this.isInstalled = true;

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let urlStr: string;
      let method = init?.method || 'GET';

      if (typeof input === 'string') {
        urlStr = input;
      } else if (input instanceof URL) {
        urlStr = input.href;
      } else if (typeof Request !== 'undefined' && input instanceof Request) {
        urlStr = input.url;
        method = input.method || method;
      } else {
        urlStr = String(input);
      }

      const matchedDomain = this.forbiddenDomains.find((d) =>
        urlStr.toLowerCase().includes(d.toLowerCase())
      );
      const isForbidden = !!matchedDomain;

      const entry: NetworkCallEntry = {
        url: urlStr,
        method: method.toUpperCase(),
        timestamp: Date.now(),
        isForbidden,
      };

      this.callLog.push(entry);

      if (isForbidden) {
        throw new Error(
          `[FATAL TEST VIOLATION] Outbound HTTP call to forbidden external provider '${matchedDomain}' detected! URL: ${urlStr} (Method: ${method})`
        );
      }

      // Check mock routes
      for (const [pattern, handler] of this.mockRoutes.entries()) {
        const matches =
          typeof pattern === 'string' ? urlStr.includes(pattern) : pattern.test(urlStr);
        if (matches) {
          const req = new Request(urlStr, init);
          return handler(req);
        }
      }

      if (this.originalFetch) {
        return this.originalFetch(input, init);
      }

      return new Response(JSON.stringify({ mock: true }), { status: 200 });
    };
  }

  static restore(): void {
    if (!this.isInstalled) return;
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    this.isInstalled = false;
  }

  static reset(): void {
    this.callLog = [];
    this.mockRoutes.clear();
  }

  static getCallLog(): NetworkCallEntry[] {
    return [...this.callLog];
  }

  static getViolations(): NetworkCallEntry[] {
    return this.callLog.filter((c) => c.isForbidden);
  }

  static assertZeroExternalCalls(): void {
    const violations = this.getViolations();
    if (violations.length > 0) {
      throw new Error(
        `Expected 0 external market provider calls, but found ${violations.length} violations:\n` +
          violations.map((v) => ` - [${v.method}] ${v.url}`).join('\n')
      );
    }
  }

  static registerMockRoute(
    pattern: string | RegExp,
    handler: (req: Request) => Promise<Response>
  ): void {
    this.mockRoutes.set(pattern, handler);
  }

  static addForbiddenDomain(domain: string): void {
    if (!this.forbiddenDomains.includes(domain)) {
      this.forbiddenDomains.push(domain);
    }
  }
}
