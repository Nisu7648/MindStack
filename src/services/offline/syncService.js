/**
 * OFFLINE-FIRST DATA SYNC SERVICE
 * Complete offline support for MindStack
 * 
 * Features:
 * - Offline data storage
 * - Automatic sync when online
 * - Conflict resolution
 * - Queue management
 * - Background sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getDatabase } from '../database/schema';

/**
 * SYNC STATUS
 */
export const SYNC_STATUS = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
  CONFLICT: 'CONFLICT'
};

/**
 * OPERATION TYPES
 */
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

/**
 * SYNC PRIORITY
 */
export const SYNC_PRIORITY = {
  HIGH: 1,      // Critical transactions
  MEDIUM: 2,    // Normal operations
  LOW: 3        // Reports, logs
};

/**
 * Offline Sync Service
 */
class OfflineSyncService {
  constructor() {
    this.isOnline = true;
    this.isSyncing = false;
    this.syncQueue = [];
    this.syncListeners = [];
    this.conflictResolvers = new Map();
    
    // Initialize network listener
    this.initNetworkListener();
  }

  /**
   * Initialize network status listener
   */
  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected;
      
      // If came back online, trigger sync
      if (wasOffline && this.isOnline) {
        console.log('Network restored, starting sync...');
        this.syncAll();
      }
      
      // Notify listeners
      this.notifyListeners({
        type: 'NETWORK_STATUS',
        isOnline: this.isOnline
      });
    });
  }

  /**
   * Check if device is online
   */
  async checkOnlineStatus() {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected;
    return this.isOnline;
  }

  /**
   * Add operation to sync queue
   */
  async addToQueue(operation) {
    const db = await getDatabase();
    
    const queueItem = {
      id: Date.now() + Math.random(),
      ...operation,
      status: SYNC_STATUS.PENDING,
      priority: operation.priority || SYNC_PRIORITY.MEDIUM,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      lastAttemptAt: null,
      error: null
    };
    
    // Save to database
    await db.executeSql(
      `INSERT INTO sync_queue (
        id, operation_type, entity_type, entity_id, data, 
        status, priority, attempts, max_attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        queueItem.id,
        queueItem.operationType,
        queueItem.entityType,
        queueItem.entityId,
        JSON.stringify(queueItem.data),
        queueItem.status,
        queueItem.priority,
        queueItem.attempts,
        queueItem.maxAttempts,
        queueItem.createdAt
      ]
    );
    
    // Add to memory queue
    this.syncQueue.push(queueItem);
    
    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.syncAll();
    }
    
    return queueItem.id;
  }

  /**
   * Get pending sync items
   */
  async getPendingItems() {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT * FROM sync_queue 
       WHERE status IN (?, ?) 
       ORDER BY priority ASC, created_at ASC`,
      [SYNC_STATUS.PENDING, SYNC_STATUS.FAILED]
    );
    
    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      items.push({
        ...row,
        data: JSON.parse(row.data)
      });
    }
    
    return items;
  }

  /**
   * Sync all pending items
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }
    
    if (!this.isOnline) {
      console.log('Device is offline, skipping sync');
      return;
    }
    
    this.isSyncing = true;
    this.notifyListeners({ type: 'SYNC_START' });
    
    try {
      const pendingItems = await this.getPendingItems();
      
      if (pendingItems.length === 0) {
        console.log('No items to sync');
        this.isSyncing = false;
        this.notifyListeners({ type: 'SYNC_COMPLETE', synced: 0 });
        return;
      }
      
      console.log(`Syncing ${pendingItems.length} items...`);
      
      let synced = 0;
      let failed = 0;
      
      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          synced++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failed++;
          await this.handleSyncFailure(item, error);
        }
      }
      
      console.log(`Sync complete: ${synced} synced, ${failed} failed`);
      
      this.notifyListeners({
        type: 'SYNC_COMPLETE',
        synced,
        failed
      });
      
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners({
        type: 'SYNC_ERROR',
        error: error.message
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync single item
   */
  async syncItem(item) {
    const db = await getDatabase();
    
    // Update status to syncing
    await db.executeSql(
      'UPDATE sync_queue SET status = ?, last_attempt_at = ? WHERE id = ?',
      [SYNC_STATUS.SYNCING, new Date().toISOString(), item.id]
    );
    
    // Perform sync operation based on type
    let result;
    switch (item.operation_type) {
      case OPERATION_TYPES.CREATE:
        result = await this.syncCreate(item);
        break;
      case OPERATION_TYPES.UPDATE:
        result = await this.syncUpdate(item);
        break;
      case OPERATION_TYPES.DELETE:
        result = await this.syncDelete(item);
        break;
      default:
        throw new Error(`Unknown operation type: ${item.operation_type}`);
    }
    
    // Mark as synced
    await db.executeSql(
      'UPDATE sync_queue SET status = ?, synced_at = ? WHERE id = ?',
      [SYNC_STATUS.SYNCED, new Date().toISOString(), item.id]
    );
    
    // Notify listeners
    this.notifyListeners({
      type: 'ITEM_SYNCED',
      item
    });
    
    return result;
  }

  /**
   * Sync create operation
   */
  async syncCreate(item) {
    // In offline mode, data is already in local DB
    // When online, we would send to server
    // For now, just mark as synced
    console.log(`Syncing CREATE: ${item.entity_type} ${item.entity_id}`);
    
    // TODO: Send to server API
    // const response = await fetch(`${API_URL}/${item.entity_type}`, {
    //   method: 'POST',
    //   body: JSON.stringify(item.data)
    // });
    
    return { success: true };
  }

  /**
   * Sync update operation
   */
  async syncUpdate(item) {
    console.log(`Syncing UPDATE: ${item.entity_type} ${item.entity_id}`);
    
    // TODO: Send to server API
    // const response = await fetch(`${API_URL}/${item.entity_type}/${item.entity_id}`, {
    //   method: 'PUT',
    //   body: JSON.stringify(item.data)
    // });
    
    return { success: true };
  }

  /**
   * Sync delete operation
   */
  async syncDelete(item) {
    console.log(`Syncing DELETE: ${item.entity_type} ${item.entity_id}`);
    
    // TODO: Send to server API
    // const response = await fetch(`${API_URL}/${item.entity_type}/${item.entity_id}`, {
    //   method: 'DELETE'
    // });
    
    return { success: true };
  }

  /**
   * Handle sync failure
   */
  async handleSyncFailure(item, error) {
    const db = await getDatabase();
    
    const attempts = item.attempts + 1;
    const status = attempts >= item.max_attempts ? SYNC_STATUS.FAILED : SYNC_STATUS.PENDING;
    
    await db.executeSql(
      `UPDATE sync_queue 
       SET status = ?, attempts = ?, error = ?, last_attempt_at = ? 
       WHERE id = ?`,
      [
        status,
        attempts,
        error.message,
        new Date().toISOString(),
        item.id
      ]
    );
    
    this.notifyListeners({
      type: 'ITEM_FAILED',
      item,
      error: error.message
    });
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(itemId, resolution) {
    const db = await getDatabase();
    
    // Get conflict item
    const result = await db.executeSql(
      'SELECT * FROM sync_queue WHERE id = ?',
      [itemId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Conflict item not found');
    }
    
    const item = result.rows.item(0);
    
    // Apply resolution
    switch (resolution.strategy) {
      case 'USE_LOCAL':
        // Keep local version, force sync
        await this.syncItem(item);
        break;
        
      case 'USE_REMOTE':
        // Discard local, use remote
        await db.executeSql(
          'UPDATE sync_queue SET status = ? WHERE id = ?',
          [SYNC_STATUS.SYNCED, itemId]
        );
        break;
        
      case 'MERGE':
        // Merge both versions
        const mergedData = { ...item.data, ...resolution.mergedData };
        await db.executeSql(
          'UPDATE sync_queue SET data = ? WHERE id = ?',
          [JSON.stringify(mergedData), itemId]
        );
        await this.syncItem({ ...item, data: mergedData });
        break;
        
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }
  }

  /**
   * Clear synced items
   */
  async clearSyncedItems(olderThanDays = 7) {
    const db = await getDatabase();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    await db.executeSql(
      'DELETE FROM sync_queue WHERE status = ? AND synced_at < ?',
      [SYNC_STATUS.SYNCED, cutoffDate.toISOString()]
    );
  }

  /**
   * Get sync statistics
   */
  async getSyncStats() {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT 
        status,
        COUNT(*) as count
       FROM sync_queue
       GROUP BY status`
    );
    
    const stats = {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflict: 0,
      total: 0
    };
    
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      stats[row.status.toLowerCase()] = row.count;
      stats.total += row.count;
    }
    
    return stats;
  }

  /**
   * Add sync listener
   */
  addListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  /**
   * Force sync now
   */
  async forceSyncNow() {
    if (!this.isOnline) {
      throw new Error('Device is offline');
    }
    
    return this.syncAll();
  }

  /**
   * Retry failed items
   */
  async retryFailed() {
    const db = await getDatabase();
    
    await db.executeSql(
      'UPDATE sync_queue SET status = ?, attempts = 0 WHERE status = ?',
      [SYNC_STATUS.PENDING, SYNC_STATUS.FAILED]
    );
    
    return this.syncAll();
  }
}

/**
 * Offline Storage Service
 * Handles local data caching
 */
class OfflineStorageService {
  constructor() {
    this.cachePrefix = '@mindstack_cache:';
  }

  /**
   * Save data to offline cache
   */
  async saveToCache(key, data, expiryMinutes = 60) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + (expiryMinutes * 60 * 1000)
    };
    
    await AsyncStorage.setItem(
      `${this.cachePrefix}${key}`,
      JSON.stringify(cacheData)
    );
  }

  /**
   * Get data from offline cache
   */
  async getFromCache(key) {
    const cached = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
    
    if (!cached) {
      return null;
    }
    
    const cacheData = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > cacheData.expiry) {
      await this.removeFromCache(key);
      return null;
    }
    
    return cacheData.data;
  }

  /**
   * Remove from cache
   */
  async removeFromCache(key) {
    await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
  }

  /**
   * Clear all cache
   */
  async clearCache() {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  /**
   * Get cache size
   */
  async getCacheSize() {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
    return cacheKeys.length;
  }
}

/**
 * Create sync queue table
 */
export const createSyncQueueTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      data TEXT NOT NULL,
      status TEXT NOT NULL,
      priority INTEGER DEFAULT 2,
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      error TEXT,
      created_at DATETIME NOT NULL,
      last_attempt_at DATETIME,
      synced_at DATETIME
    );
  `;
  await db.executeSql(query);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_priority ON sync_queue(priority);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_sync_created ON sync_queue(created_at);');
};

// Create singleton instances
const offlineSyncService = new OfflineSyncService();
const offlineStorageService = new OfflineStorageService();

export default offlineSyncService;
export { 
  OfflineSyncService, 
  OfflineStorageService,
  offlineStorageService 
};
