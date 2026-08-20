/**
 * In-Memory Redis Mock for E2E Hermetic Testing
 * Simulates ioredis Key-Value, Redis Streams, and Pub/Sub routing.
 */
import { EventEmitter } from 'events';

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
  rawArray: string[];
}

export class SharedRedisStore {
  public kv = new Map<string, string>();
  public hashes = new Map<string, Map<string, string>>();
  public streams = new Map<string, StreamEntry[]>();
  public channelSubscribers = new Map<string, Set<MockRedis>>();
  public patternSubscribers = new Map<string, Set<MockRedis>>();
  public idCounters = new Map<number, number>();

  public clear() {
    this.kv.clear();
    this.hashes.clear();
    this.streams.clear();
    this.channelSubscribers.clear();
    this.patternSubscribers.clear();
    this.idCounters.clear();
  }
}

// Global shared store singleton for test suites
const globalSharedStore = new SharedRedisStore();

export class MockRedis extends EventEmitter {
  private store: SharedRedisStore;
  public status: 'connect' | 'ready' | 'close' | 'end' = 'ready';
  private subscribedChannels = new Set<string>();
  private subscribedPatterns = new Set<string>();

  constructor(sharedStore?: SharedRedisStore) {
    super();
    this.store = sharedStore || globalSharedStore;
  }

  static getSharedStore(): SharedRedisStore {
    return globalSharedStore;
  }

  static resetSharedState(): void {
    globalSharedStore.clear();
  }

  private resolveStreamKey(stream: string): string {
    if (this.store.streams.has(stream)) return stream;
    const lower = stream.toLowerCase();
    for (const k of this.store.streams.keys()) {
      if (k.toLowerCase() === lower) return k;
    }
    return stream;
  }

  // --- Key-Value Operations ---

  async get(key: string): Promise<string | null> {
    return this.store.kv.has(key) ? this.store.kv.get(key)! : null;
  }

  async set(key: string, value: string, ..._options: any[]): Promise<'OK'> {
    this.store.kv.set(key, String(value));
    return 'OK';
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    return flatKeys.map((k) => (this.store.kv.has(k) ? this.store.kv.get(k)! : null));
  }

  async del(...keys: string[]): Promise<number> {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    let count = 0;
    for (const k of flatKeys) {
      if (this.store.kv.delete(k)) count++;
      if (this.store.hashes.delete(k)) count++;
      const resolved = this.resolveStreamKey(k);
      if (this.store.streams.delete(resolved)) count++;
    }
    return count;
  }

  async exists(...keys: string[]): Promise<number> {
    const flatKeys = Array.isArray(keys[0]) ? keys[0] : keys;
    let count = 0;
    for (const k of flatKeys) {
      if (this.store.kv.has(k) || this.store.hashes.has(k) || this.store.streams.has(this.resolveStreamKey(k))) {
        count++;
      }
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const allKeys = Array.from(
      new Set([
        ...this.store.kv.keys(),
        ...this.store.hashes.keys(),
        ...this.store.streams.keys(),
      ])
    );
    if (pattern === '*') return allKeys;
    const regexStr = '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    const regex = new RegExp(regexStr);
    return allKeys.filter((k) => regex.test(k));
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  async flushdb(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  // --- Hash Operations ---

  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.store.hashes.get(key);
    return hash && hash.has(field) ? hash.get(field)! : null;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.store.hashes.has(key)) {
      this.store.hashes.set(key, new Map());
    }
    const hash = this.store.hashes.get(key)!;
    const isNew = !hash.has(field);
    hash.set(field, String(value));
    return isNew ? 1 : 0;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.store.hashes.get(key);
    if (!hash) return {};
    const result: Record<string, string> = {};
    for (const [k, v] of hash.entries()) {
      result[k] = v;
    }
    return result;
  }

  // --- Stream Operations ---

  async xadd(stream: string, ...args: any[]): Promise<string> {
    let maxlen: number | null = null;
    let id = '*';
    let fieldStartIndex = 0;

    // Parse arguments: e.g. xadd('stream', 'MAXLEN', '~', 10000, '*', 'k', 'v')
    let i = 0;
    while (i < args.length) {
      const arg = String(args[i]).toUpperCase();
      if (arg === 'MAXLEN') {
        if (args[i + 1] === '~' || args[i + 1] === '=') {
          maxlen = Number(args[i + 2]);
          i += 3;
        } else {
          maxlen = Number(args[i + 1]);
          i += 2;
        }
      } else {
        id = String(args[i]);
        fieldStartIndex = i + 1;
        break;
      }
    }

    const fieldPairs: string[] = [];
    const fieldsMap: Record<string, string> = {};

    for (let j = fieldStartIndex; j < args.length; j += 2) {
      if (j + 1 < args.length) {
        const k = String(args[j]);
        const v = String(args[j + 1]);
        fieldPairs.push(k, v);
        fieldsMap[k] = v;
      }
    }

    // Generate entry ID if '*'
    let entryId = id;
    if (entryId === '*') {
      const now = Date.now();
      const currentSeq = this.store.idCounters.get(now) || 0;
      this.store.idCounters.set(now, currentSeq + 1);
      entryId = `${now}-${currentSeq}`;
    }

    if (!this.store.streams.has(stream)) {
      this.store.streams.set(stream, []);
    }

    const streamList = this.store.streams.get(stream)!;
    const entry: StreamEntry = {
      id: entryId,
      fields: fieldsMap,
      rawArray: fieldPairs,
    };
    streamList.push(entry);

    // Apply MAXLEN trimming if specified
    if (maxlen !== null && maxlen >= 0) {
      while (streamList.length > maxlen) {
        streamList.shift();
      }
    }

    return entryId;
  }

  async xrange(
    stream: string,
    start: string = '-',
    end: string = '+',
    ...options: any[]
  ): Promise<[string, string[]][]> {
    const resolved = this.resolveStreamKey(stream);
    const list = this.store.streams.get(resolved) || [];
    let count: number | null = null;

    for (let i = 0; i < options.length; i++) {
      if (String(options[i]).toUpperCase() === 'COUNT' && options[i + 1] !== undefined) {
        count = Number(options[i + 1]);
      }
    }

    let filtered = list.filter((item) => {
      if (start !== '-' && item.id < start) return false;
      if (end !== '+' && item.id > end) return false;
      return true;
    });

    if (count !== null && count >= 0) {
      filtered = filtered.slice(0, count);
    }

    return filtered.map((item) => [item.id, [...item.rawArray]]);
  }

  async xrevrange(
    stream: string,
    end: string = '+',
    start: string = '-',
    ...options: any[]
  ): Promise<[string, string[]][]> {
    const resolved = this.resolveStreamKey(stream);
    const list = this.store.streams.get(resolved) || [];
    let count: number | null = null;

    for (let i = 0; i < options.length; i++) {
      if (String(options[i]).toUpperCase() === 'COUNT' && options[i + 1] !== undefined) {
        count = Number(options[i + 1]);
      }
    }

    const reversed = [...list].reverse();
    let filtered = reversed.filter((item) => {
      if (start !== '-' && item.id < start) return false;
      if (end !== '+' && item.id > end) return false;
      return true;
    });

    if (count !== null && count >= 0) {
      filtered = filtered.slice(0, count);
    }

    return filtered.map((item) => [item.id, [...item.rawArray]]);
  }

  async xlen(stream: string): Promise<number> {
    const resolved = this.resolveStreamKey(stream);
    return (this.store.streams.get(resolved) || []).length;
  }

  async xtrim(stream: string, strategy: string, threshold: number): Promise<number> {
    const resolved = this.resolveStreamKey(stream);
    const list = this.store.streams.get(resolved);
    if (!list) return 0;
    const initialLen = list.length;
    if (strategy.toUpperCase() === 'MAXLEN') {
      while (list.length > threshold) {
        list.shift();
      }
    }
    return initialLen - list.length;
  }

  async xread(...args: any[]): Promise<any> {
    const streamsIdx = args.findIndex((a) => String(a).toUpperCase() === 'STREAMS');
    if (streamsIdx === -1) return null;

    const streamArgs = args.slice(streamsIdx + 1);
    const numStreams = Math.floor(streamArgs.length / 2);
    const result: [string, [string, string[]][]][] = [];

    for (let i = 0; i < numStreams; i++) {
      const streamName = streamArgs[i];
      const resolved = this.resolveStreamKey(streamName);
      const lastId = streamArgs[i + numStreams];
      const list = this.store.streams.get(resolved) || [];
      const entries = list
        .filter((item) => lastId === '$' || lastId === '0' || item.id > lastId)
        .map((item) => [item.id, [...item.rawArray]] as [string, string[]]);
      if (entries.length > 0) {
        result.push([streamName, entries]);
      }
    }

    return result.length > 0 ? result : null;
  }

  async xreadgroup(
    _groupOption: string,
    _group: string,
    _consumer: string,
    ...rest: any[]
  ): Promise<any> {
    return this.xread(...rest);
  }

  async xgroup(..._args: any[]): Promise<string> {
    return 'OK';
  }

  // --- Pub/Sub Operations ---

  async publish(channel: string, message: string): Promise<number> {
    let receiverCount = 0;
    const lowerChannel = channel.toLowerCase();

    // Match exact and case-insensitive direct subscribers
    for (const [subChannel, clients] of this.store.channelSubscribers.entries()) {
      if (subChannel === channel || subChannel.toLowerCase() === lowerChannel) {
        for (const client of clients) {
          client.emit('message', channel, message);
          receiverCount++;
        }
      }
    }

    // Pattern subscribers
    for (const [pattern, clients] of this.store.patternSubscribers.entries()) {
      const regexStr = '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
      const regex = new RegExp(regexStr, 'i');
      if (regex.test(channel)) {
        for (const client of clients) {
          client.emit('pmessage', pattern, channel, message);
          receiverCount++;
        }
      }
    }

    return receiverCount;
  }

  async subscribe(...channels: string[]): Promise<number> {
    const flatChannels = Array.isArray(channels[0]) ? channels[0] : channels;
    for (const ch of flatChannels) {
      if (!this.store.channelSubscribers.has(ch)) {
        this.store.channelSubscribers.set(ch, new Set());
      }
      this.store.channelSubscribers.get(ch)!.add(this);
      this.subscribedChannels.add(ch);
    }
    return this.subscribedChannels.size;
  }

  async unsubscribe(...channels: string[]): Promise<number> {
    const toUnsub =
      channels.length === 0
        ? Array.from(this.subscribedChannels)
        : Array.isArray(channels[0])
        ? channels[0]
        : channels;

    for (const ch of toUnsub) {
      const set = this.store.channelSubscribers.get(ch);
      if (set) {
        set.delete(this);
        if (set.size === 0) this.store.channelSubscribers.delete(ch);
      }
      this.subscribedChannels.delete(ch);
    }
    return this.subscribedChannels.size;
  }

  async psubscribe(...patterns: string[]): Promise<number> {
    const flatPatterns = Array.isArray(patterns[0]) ? patterns[0] : patterns;
    for (const pat of flatPatterns) {
      if (!this.store.patternSubscribers.has(pat)) {
        this.store.patternSubscribers.set(pat, new Set());
      }
      this.store.patternSubscribers.get(pat)!.add(this);
      this.subscribedPatterns.add(pat);
    }
    return this.subscribedPatterns.size;
  }

  async punsubscribe(...patterns: string[]): Promise<number> {
    const toUnsub =
      patterns.length === 0
        ? Array.from(this.subscribedPatterns)
        : Array.isArray(patterns[0])
        ? patterns[0]
        : patterns;

    for (const pat of toUnsub) {
      const set = this.store.patternSubscribers.get(pat);
      if (set) {
        set.delete(this);
        if (set.size === 0) this.store.patternSubscribers.delete(pat);
      }
      this.subscribedPatterns.delete(pat);
    }
    return this.subscribedPatterns.size;
  }

  // --- Duplicate & Lifecycle ---

  duplicate(): MockRedis {
    return new MockRedis(this.store);
  }

  disconnect(): void {
    this.unsubscribe();
    this.punsubscribe();
    this.removeAllListeners();
    this.status = 'close';
  }

  async quit(): Promise<'OK'> {
    this.disconnect();
    this.status = 'end';
    return 'OK';
  }

  // --- Test Helpers ---

  getStreamEntries(stream: string): StreamEntry[] {
    const resolved = this.resolveStreamKey(stream);
    return [...(this.store.streams.get(resolved) || [])];
  }

  getChannelSubscribersCount(channel: string): number {
    const lower = channel.toLowerCase();
    for (const [k, v] of this.store.channelSubscribers.entries()) {
      if (k === channel || k.toLowerCase() === lower) return v.size;
    }
    return 0;
  }
}
