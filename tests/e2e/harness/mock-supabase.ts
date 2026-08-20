/**
 * In-Memory Mock Supabase Client for E2E Hermetic Testing
 * Simulates query builder, filtering, batch upserts, unique constraints, and schema operations.
 */

export interface MarketCandleRecord {
  id?: string;
  broker: string;
  symbol: string;
  timeframe: string;
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BrokerAccountRecord {
  id: string;
  user_id?: string;
  broker: string;
  login: string;
  server: string;
  is_master_feed: boolean;
  is_active: boolean;
  created_at?: string;
}

type FilterFn = (row: any) => boolean;

export class MockSupabaseQueryBuilder {
  private tableName: string;
  private client: MockSupabaseClient;
  private filters: FilterFn[] = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(tableName: string, client: MockSupabaseClient) {
    this.tableName = tableName;
    this.client = client;
  }

  select(_columns: string = '*', _options?: any): this {
    this.action = 'select';
    return this;
  }

  insert(values: any | any[], _options?: any): this {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  upsert(values: any | any[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.action = 'upsert';
    this.payload = values;
    if (options) {
      this.upsertOptions = options;
    }
    return this;
  }

  update(values: any): this {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push((row) => String(row[column]) !== String(value));
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push((row) => row[column] > value);
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push((row) => row[column] < value);
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push((row) => row[column] <= value);
    return this;
  }

  in(column: string, values: any[]): this {
    const set = new Set(values.map((v) => String(v)));
    this.filters.push((row) => set.has(String(row[column])));
    return this;
  }

  is(column: string, value: any): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderCol = column;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  maybeSingle(): this {
    this.isMaybeSingle = true;
    return this;
  }

  async execute(): Promise<{ data: any; error: any; count: number | null }> {
    // Check simulated error
    const simulatedErr = this.client.getSimulatedError(this.tableName);
    if (simulatedErr) {
      return { data: null, error: simulatedErr, count: null };
    }

    const table = this.client.getRawTable(this.tableName);

    if (this.action === 'insert' || this.action === 'upsert') {
      const rowsToProcess: any[] = Array.isArray(this.payload) ? this.payload : [this.payload];
      const insertedRows: any[] = [];

      for (const rawRow of rowsToProcess) {
        const row = {
          ...rawRow,
          id: rawRow.id || `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          created_at: rawRow.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (this.action === 'upsert') {
          // Resolve conflict keys
          const conflictKeys = (this.upsertOptions.onConflict || 'broker,symbol,timeframe,time')
            .split(',')
            .map((k) => k.trim());

          const existingIndex = table.findIndex((existing) =>
            conflictKeys.every((k) => String(existing[k]) === String(row[k]))
          );

          if (existingIndex >= 0) {
            if (!this.upsertOptions.ignoreDuplicates) {
              const updated = {
                ...table[existingIndex],
                ...row,
                id: table[existingIndex].id,
                created_at: table[existingIndex].created_at,
                updated_at: new Date().toISOString(),
              };
              table[existingIndex] = updated;
              insertedRows.push(updated);
            } else {
              insertedRows.push(table[existingIndex]);
            }
          } else {
            table.push(row);
            insertedRows.push(row);
          }
        } else {
          // Plain insert
          table.push(row);
          insertedRows.push(row);
        }
      }

      return {
        data: Array.isArray(this.payload) ? insertedRows : insertedRows[0] || null,
        error: null,
        count: insertedRows.length,
      };
    }

    if (this.action === 'update') {
      let matched = table.filter((row) => this.filters.every((f) => f(row)));
      for (const row of matched) {
        Object.assign(row, this.payload, { updated_at: new Date().toISOString() });
      }
      return { data: matched, error: null, count: matched.length };
    }

    if (this.action === 'delete') {
      const remaining: any[] = [];
      const deleted: any[] = [];
      for (const row of table) {
        if (this.filters.every((f) => f(row))) {
          deleted.push(row);
        } else {
          remaining.push(row);
        }
      }
      this.client.setRawTable(this.tableName, remaining);
      return { data: deleted, error: null, count: deleted.length };
    }

    // Default: 'select'
    let results = table.filter((row) => this.filters.every((f) => f(row)));

    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      results.sort((a, b) => {
        const valA = a[col];
        const valB = b[col];
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this.rangeStart !== null && this.rangeEnd !== null) {
      results = results.slice(this.rangeStart, this.rangeEnd + 1);
    } else if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      if (results.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' }, count: 0 };
      }
      if (results.length > 1) {
        return { data: null, error: { message: 'Multiple rows returned', code: 'PGRST117' }, count: results.length };
      }
      return { data: results[0], error: null, count: 1 };
    }

    if (this.isMaybeSingle) {
      return { data: results[0] || null, error: null, count: results.length };
    }

    return { data: results, error: null, count: results.length };
  }

  // Thenable interface so await builder works directly
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export class MockSupabaseClient {
  private tables = new Map<string, any[]>();
  private simulatedErrors = new Map<string, any>();

  constructor() {
    this.reset();
  }

  from(tableName: string): MockSupabaseQueryBuilder {
    return new MockSupabaseQueryBuilder(tableName, this);
  }

  getRawTable(tableName: string): any[] {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return this.tables.get(tableName)!;
  }

  setRawTable(tableName: string, rows: any[]): void {
    this.tables.set(tableName, rows);
  }

  getTable<T = any>(tableName: string): T[] {
    return (this.tables.get(tableName) || []).map((r) => ({ ...r }));
  }

  seed(tableName: string, rows: any[]): void {
    const table = this.getRawTable(tableName);
    for (const r of rows) {
      table.push({
        ...r,
        id: r.id || `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        created_at: r.created_at || new Date().toISOString(),
        updated_at: r.updated_at || new Date().toISOString(),
      });
    }
  }

  clear(tableName?: string): void {
    if (tableName) {
      this.tables.set(tableName, []);
      this.simulatedErrors.delete(tableName);
    } else {
      this.tables.clear();
      this.simulatedErrors.clear();
    }
  }

  reset(): void {
    this.clear();
  }

  simulateError(tableName: string, error: any): void {
    this.simulatedErrors.set(tableName, error);
  }

  clearSimulatedErrors(): void {
    this.simulatedErrors.clear();
  }

  getSimulatedError(tableName: string): any | null {
    return this.simulatedErrors.get(tableName) || null;
  }
}

export const mockSupabase = new MockSupabaseClient();
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__mockSupabase = mockSupabase;
}
