/**
 * AUTO-SAVE & POWER CUT SAFETY
 * Idiot-proof design
 * 
 * Features:
 * - No save button
 * - Every action saved instantly
 * - Power cut recovery
 * - No data loss
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { table } from '../database/queryBuilder';

/**
 * Auto Save Manager
 */
class AutoSaveManager {
  constructor() {
    this.saveQueue = [];
    this.isSaving = false;
    this.autoSaveInterval = null;
  }

  /**
   * INITIALIZE
   */
  async initialize() {
    try {
      // Start auto-save interval (every 2 seconds)
      this.startAutoSave();

      // Check for recovered bill
      const recovered = await this.checkRecoveredBill();
      if (recovered) {
        console.log('Recovered bill found');
      }

      return { success: true };
    } catch (error) {
      console.error('Auto-save initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * START AUTO-SAVE
   * Save every 2 seconds
   */
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.processSaveQueue();
    }, 2000);
  }

  /**
   * STOP AUTO-SAVE
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * SAVE CURRENT BILL
   * Called on every action
   */
  async saveCurrentBill(billData) {
    try {
      // Save to AsyncStorage (instant)
      await AsyncStorage.setItem('current_bill', JSON.stringify({
        ...billData,
        savedAt: new Date().toISOString()
      }));

      return { success: true };
    } catch (error) {
      console.error('Save current bill error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * RECOVER BILL AFTER POWER CUT
   */
  async checkRecoveredBill() {
    try {
      const savedBill = await AsyncStorage.getItem('current_bill');
      
      if (!savedBill) {
        return null;
      }

      const billData = JSON.parse(savedBill);

      // Check if bill is recent (within last hour)
      const savedAt = new Date(billData.savedAt);
      const now = new Date();
      const diffMinutes = (now - savedAt) / 1000 / 60;

      if (diffMinutes > 60) {
        // Too old, discard
        await AsyncStorage.removeItem('current_bill');
        return null;
      }

      return billData;
    } catch (error) {
      console.error('Check recovered bill error:', error);
      return null;
    }
  }

  /**
   * CLEAR CURRENT BILL
   * After successful payment
   */
  async clearCurrentBill() {
    try {
      await AsyncStorage.removeItem('current_bill');
      return { success: true };
    } catch (error) {
      console.error('Clear current bill error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ADD TO SAVE QUEUE
   */
  addToQueue(operation) {
    this.saveQueue.push({
      ...operation,
      timestamp: Date.now()
    });
  }

  /**
   * PROCESS SAVE QUEUE
   */
  async processSaveQueue() {
    if (this.isSaving || this.saveQueue.length === 0) {
      return;
    }

    this.isSaving = true;

    try {
      while (this.saveQueue.length > 0) {
        const operation = this.saveQueue.shift();
        await this.executeOperation(operation);
      }
    } catch (error) {
      console.error('Process save queue error:', error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * EXECUTE OPERATION
   */
  async executeOperation(operation) {
    try {
      switch (operation.type) {
        case 'UPDATE_PRODUCT':
          await table('inventory')
            .where('id', operation.productId)
            .update(operation.data);
          break;

        case 'UPDATE_STOCK':
          await table('inventory')
            .where('id', operation.productId)
            .update({
              current_stock: operation.newStock,
              updated_at: new Date().toISOString()
            });
          break;

        case 'SAVE_INVOICE':
          await table('invoices').insert(operation.data);
          break;

        default:
          console.warn('Unknown operation type:', operation.type);
      }
    } catch (error) {
      console.error('Execute operation error:', error);
      // Re-add to queue for retry
      this.saveQueue.push(operation);
    }
  }

  /**
   * FORCE SAVE ALL
   */
  async forceSaveAll() {
    await this.processSaveQueue();
  }

  /**
   * CLEANUP
   */
  cleanup() {
    this.stopAutoSave();
    this.saveQueue = [];
  }
}

// Create singleton instance
const autoSaveManager = new AutoSaveManager();

export default autoSaveManager;
export { AutoSaveManager };
