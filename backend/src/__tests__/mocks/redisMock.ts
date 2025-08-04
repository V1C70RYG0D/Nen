/**
 * Mock Implementation for Redis Cache Service
 */

export class MockRedisClient {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    this.store.set(key, value);
    if (mode === 'EX' && duration) {
      // Mock expiration by setting a timeout
      setTimeout(() => {
        this.store.delete(key);
      }, duration * 1000);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async flushall(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async quit(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  // Mock connection events
  on(event: string, callback: Function): void {
    // Mock event handling
    if (event === 'connect') {
      setTimeout(callback, 10);
    }
  }
}

export const createMockRedisClient = (): MockRedisClient => {
  return new MockRedisClient();
};
