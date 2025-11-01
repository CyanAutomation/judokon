/**
 * LRU Cache utility for MCP RAG query results
 * Implements a simple Least Recently Used (LRU) cache with TTL support
 */

/**
 * Simple LRU Cache implementation with TTL
 * @class LRUCache
 */
export class LRUCache {
  /**
   * Create an LRU cache
   * @param {number} maxSize - Maximum number of items to store (default: 100)
   * @param {number} ttlMs - Time to live for each item in milliseconds (default: 5 minutes)
   */
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
    this.timestamps = new Map();
    this.accessCounts = new Map();
    this.accessOrder = new Map(); // Counter for LRU eviction order
    this.accessCounter = 0; // Incrementing counter for deterministic LRU
  }

  /**
   * Generate cache key from query parameters
   * @param {string} query - The search query
   * @param {number} topK - Number of results
   * @param {Object} filters - Filter parameters
   * @returns {string} Cache key
   */
  static generateKey(query, topK = 8, filters = {}) {
    const filterStr = Object.keys(filters)
      .sort()
      .map((k) => `${k}:${filters[k]}`)
      .join("|");
    return `${query}::topK=${topK}::filters=${filterStr}`;
  }

  /**
   * Check if an item has expired
   * @param {string} key - Cache key
   * @returns {boolean} True if expired, false otherwise
   */
  isExpired(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return true;
    return Date.now() - timestamp > this.ttlMs;
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined if not found or expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    if (this.isExpired(key)) {
      this.delete(key);
      return undefined;
    }

    // Update timestamp and access count on retrieval
    this.timestamps.set(key, Date.now());
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
    this.accessOrder.set(key, ++this.accessCounter); // Track access order

    return this.cache.get(key);
  }

  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   */
  set(key, value) {
    // If cache is full, evict the least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    this.accessCounts.set(key, 0);
    this.accessOrder.set(key, ++this.accessCounter); // Track access order on set
  }

  /**
   * Evict the least recently used item from the cache
   * @private
   */
  evictLRU() {
    let lruKey = null;
    let lruOrder = Infinity;

    for (const [key, order] of this.accessOrder.entries()) {
      if (order < lruOrder) {
        lruOrder = order;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Delete an item from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.accessCounts.delete(key);
    this.accessOrder.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.accessCounts.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics including size, hits, misses, etc.
   */
  getStats() {
    const totalAccess = Array.from(this.accessCounts.values()).reduce((a, b) => a + b, 0);
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalEntries: this.cache.size,
      expiredCount: Array.from(this.cache.keys()).filter((k) => this.isExpired(k)).length,
      totalAccessCount: totalAccess,
      ttlMs: this.ttlMs
    };
  }

  /**
   * Get cache size
   * @returns {number} Current cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   * @returns {string[]} Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }
}

export default LRUCache;
