import Redis from 'ioredis';

// Use host 127.0.0.1 for local dev or native execution, but fallback to tradegpt-redis if inside Docker.
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

class RedisConnectionFactory {
  private static instance: Redis | null = null;
  private static subscriberInstance: Redis | null = null;

  static getClient(): Redis {
    if (!this.instance) {
      this.instance = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        },
      });
      this.instance.on('error', (err) => {
        console.error('[Redis Error]', err.message);
      });
      this.instance.on('connect', () => {
        console.log('[Redis Connected]', REDIS_URL);
      });
    }
    return this.instance;
  }

  static getSubscriberClient(): Redis {
    if (!this.subscriberInstance) {
      this.subscriberInstance = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          return Math.min(times * 50, 2000);
        },
      });
    }
    return this.subscriberInstance;
  }
}

export const redis = RedisConnectionFactory.getClient();
export const redisSubscriber = RedisConnectionFactory.getSubscriberClient();
