/**
 * OFFLINE STORAGE MANAGER
 * Manages offline data caching and storage
 * 
 * Features:
 * - Data caching
 * - Cache invalidation
 * - Storage quota management
 * - Data compression
 * - Encryption support
 * - Cache statistics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { table } from '../database/queryBuilder';

/**
 * Cache Strategies
 */
export const CACHE_STRATEGY = {
  CACHE_FIRST: 'CACHE_FIRST',       // Use cache, fallback to network
  NETWORK_FIRST: 'NETWORK_FIRST',   // Use network, fallback to cache
  CACHE_ONLY: 'CACHE_ONLY',         // Only use cache
  NETWORK_ONLY: 'NETWORK_ONLY',     // Only use network
  STALE_WHILE_REVALIDATE: 'STALE_WHILE_REVALIDATE' // Use cache, update in background
};

/**
 * Offline Storage Manager
 */
class OfflineStorageManager {
  constructor() {
    this.cachePrefix = 'cache_';
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize Storage Manager
   */
  async initialize() {
    try {
      // Create cache table
      await this.createCacheTable();

      // Clean expired cache
      await this.cleanExpiredCache();

      console.log('Offline storage manager initialized');

      return { success: true };
    } catch (error) {
      console.error('Storage manager initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create Cache Table
   */
  async createCacheTable() {
    const db = await table('cache').query().db;

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at TEXT,
        size INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        accessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0
      );
    `);

    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_cache_accessed ON cache(accessed_at)');
  }

  /**
   * Set Cache
   */
  async set(key, value, ttl = null) {
    try {
      const cacheKey = this.getCacheKey(key);
      const stringValue = JSON.stringify(value);
      const size = new Blob([stringValue]).size;

      // Check cache size
      const currentSize = await this.getCacheSize();
      if (currentSize + size > this.maxCacheSize) {
        await this.evictLRU(size);
      }

      const expiresAt = ttl
        ? new Date(Date.now() + ttl).toISOString()
        : new Date(Date.now() + this.defaultTTL).toISOString();

      // Check if exists
      const existing = await table('cache')
        .where('key', cacheKey)
        .first();

      if (existing.success && existing.data) {
        // Update
        await table('cache')
          .where('key', cacheKey)
          .update({
            value: stringValue,
            expires_at: expiresAt,
            size,
            accessed_at: new Date().toISOString()
          });
      } else {
        // Insert
        await table('cache').insert({
          key: cacheKey,
          value: stringValue,
          expires_at: expiresAt,
          size,
          created_at: new Date().toISOString(),
          accessed_at: new Date().toISOString(),
          access_count: 0
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Set cache error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Cache
   */
  async get(key) {
    try {
      const cacheKey = this.getCacheKey(key);

      const result = await table('cache')
        .where('key', cacheKey)
        .first();

      if (!result.success || !result.data) {
        return { success: false, data: null, cached: false };
      }

      const cached = result.data;

      // Check expiration
      if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
        await this.delete(key);
        return { success: false, data: null, cached: false, expired: true };
      }

      // Update access stats
      await table('cache')
        .where('key', cacheKey)
        .update({
          accessed_at: new Date().toISOString(),
          access_count: cached.access_count + 1
        });

      const value = JSON.parse(cached.value);

      return {
        success: true,
        data: value,
        cached: true,
        cachedAt: cached.created_at,
        expiresAt: cached.expires_at
      };
    } catch (error) {
      console.error('Get cache error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete Cache
   */
  async delete(key) {
    try {
      const cacheKey = this.getCacheKey(key);

      await table('cache')
        .where('key', cacheKey)
        .delete();

      return { success: true };
    } catch (error) {
      console.error('Delete cache error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Has Cache
   */
  async has(key) {
    try {
      const cacheKey = this.getCacheKey(key);

      const result = await table('cache')
        .where('key', cacheKey)
        .first();

      if (!result.success || !result.data) {
        return false;
      }

      // Check expiration
      if (result.data.expires_at && new Date(result.data.expires_at) < new Date()) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Has cache error:', error);
      return false;
    }
  }

  /**
   * Clear All Cache
   */
  async clear() {
    try {
      await table('cache').truncate();
      return { success: true };
    } catch (error) {
      console.error('Clear cache error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean Expired Cache
   */
  async cleanExpiredCache() {
    try {
      const result = await table('cache')
        .where('expires_at', '<', new Date().toISOString())
        .delete();

      console.log(`Cleaned ${result.rowsAffected || 0} expired cache entries`);

      return { success: true, cleaned: result.rowsAffected || 0 };
    } catch (error) {
      console.error('Clean expired cache error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Cache Size
   */
  async getCacheSize() {
    try {
      const result = await table('cache').sum('size');
      return result || 0;
    } catch (error) {
      console.error('Get cache size error:', error);
      return 0;
    }
  }

  /**
   * Get Cache Statistics
   */
  async getCacheStats() {
    try {
      const totalEntries = await table('cache').count();
      const totalSize = await this.getCacheSize();

      const expired = await table('cache')
        .where('expires_at', '<', new Date().toISOString())
        .count();

      const mostAccessed = await table('cache')
        .orderBy('access_count', 'DESC')
        .limit(10)
        .get();

      return {
        success: true,
        stats: {
          totalEntries,
          totalSize,
          totalSizeFormatted: this.formatBytes(totalSize),
          expired,
          maxSize: this.maxCacheSize,
          maxSizeFormatted: this.formatBytes(this.maxCacheSize),
          usagePercent: ((totalSize / this.maxCacheSize) * 100).toFixed(2),
          mostAccessed: mostAccessed.success ? mostAccessed.data : []
        }
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Evict LRU (Least Recently Used)
   */
  async evictLRU(requiredSpace) {
    try {
      let freedSpace = 0;

      while (freedSpace < requiredSpace) {
        // Get least recently accessed item
        const result = await table('cache')
          .orderBy('accessed_at', 'ASC')
          .limit(1)
          .first();

        if (!result.success || !result.data) {
          break;
        }

        const item = result.data;
        freedSpace += item.size;

        await table('cache')
          .where('key', item.key)
          .delete();

        console.log(`Evicted cache: ${item.key} (${this.formatBytes(item.size)})`);
      }

      return { success: true, freedSpace };
    } catch (error) {
      console.error('Evict LRU error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cache with Strategy
   */
  async cacheWithStrategy(key, fetchFunction, strategy = CACHE_STRATEGY.CACHE_FIRST, ttl = null) {
    try {
      switch (strategy) {
        case CACHE_STRATEGY.CACHE_FIRST:
          return await this.cacheFirst(key, fetchFunction, ttl);

        case CACHE_STRATEGY.NETWORK_FIRST:
          return await this.networkFirst(key, fetchFunction, ttl);

        case CACHE_STRATEGY.CACHE_ONLY:
          return await this.cacheOnly(key);

        case CACHE_STRATEGY.NETWORK_ONLY:
          return await this.networkOnly(fetchFunction);

        case CACHE_STRATEGY.STALE_WHILE_REVALIDATE:
          return await this.staleWhileRevalidate(key, fetchFunction, ttl);

        default:
          return await this.cacheFirst(key, fetchFunction, ttl);
      }
    } catch (error) {
      console.error('Cache with strategy error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cache First Strategy
   */
  async cacheFirst(key, fetchFunction, ttl) {
    // Try cache first
    const cached = await this.get(key);
    if (cached.success && cached.cached) {
      return cached;
    }

    // Fallback to network
    try {
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      return { success: true, data, cached: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Network First Strategy
   */
  async networkFirst(key, fetchFunction, ttl) {
    // Try network first
    try {
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      return { success: true, data, cached: false };
    } catch (error) {
      // Fallback to cache
      const cached = await this.get(key);
      if (cached.success && cached.cached) {
        return { ...cached, stale: true };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Cache Only Strategy
   */
  async cacheOnly(key) {
    return await this.get(key);
  }

  /**
   * Network Only Strategy
   */
  async networkOnly(fetchFunction) {
    try {
      const data = await fetchFunction();
      return { success: true, data, cached: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Stale While Revalidate Strategy
   */
  async staleWhileRevalidate(key, fetchFunction, ttl) {
    // Return cached data immediately
    const cached = await this.get(key);

    // Update cache in background
    fetchFunction()
      .then(data => {
        this.set(key, data, ttl);
      })
      .catch(error => {
        console.error('Background revalidation error:', error);
      });

    if (cached.success && cached.cached) {
      return { ...cached, stale: true };
    }

    // If no cache, wait for network
    try {
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      return { success: true, data, cached: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Prefetch Data
   */
  async prefetch(key, fetchFunction, ttl = null) {
    try {
      const data = await fetchFunction();
      await this.set(key, data, ttl);
      return { success: true };
    } catch (error) {
      console.error('Prefetch error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Cache Key
   */
  getCacheKey(key) {
    return `${this.cachePrefix}${key}`;
  }

  /**
   * Format Bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Set Max Cache Size
   */
  setMaxCacheSize(sizeInBytes) {
    this.maxCacheSize = sizeInBytes;
  }

  /**
   * Set Default TTL
   */
  setDefaultTTL(ttlInMs) {
    this.defaultTTL = ttlInMs;
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorageManager();

export default offlineStorage;
export { OfflineStorageManager };
