/**
 * ZERO-MISTAKE BILLING GUARD
 * Faster than humans • Hard to cheat • Hard to break
 * 
 * Silent advantages:
 * - Price lock (owner PIN to override)
 * - Quantity sanity check
 * - No silent corruption
 */

import { table } from '../database/queryBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Billing Guard
 */
class BillingGuard {
  constructor() {
    this.ownerPIN = null;
    this.priceOverrideEnabled = false;
    this.quantityThresholds = {
      kg: 50,      // Alert if > 50 kg
      litre: 50,   // Alert if > 50 L
      pcs: 100,    // Alert if > 100 pcs
      box: 20,     // Alert if > 20 boxes
      dozen: 20    // Alert if > 20 dozens
    };
  }

  /**
   * INITIALIZE
   */
  async initialize() {
    try {
      // Load owner PIN
      this.ownerPIN = await AsyncStorage.getItem('owner_pin');
      
      return { success: true };
    } catch (error) {
      console.error('Guard initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * PRICE LOCK CHECK
   * Cashier CANNOT change price during billing
   */
  async checkPriceChange(productId, newPrice) {
    try {
      // Get product master price
      const product = await table('inventory')
        .where('id', productId)
        .first();

      if (!product.success || !product.data) {
        return {
          allowed: false,
          error: 'Product not found'
        };
      }

      const masterPrice = product.data.selling_price;

      // Check if price changed
      if (newPrice !== masterPrice) {
        // Price change detected
        if (!this.priceOverrideEnabled) {
          return {
            allowed: false,
            requiresOwnerPIN: true,
            masterPrice,
            attemptedPrice: newPrice,
            message: 'Price locked. Owner PIN required.'
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Price check error:', error);
      return { allowed: false, error: error.message };
    }
  }

  /**
   * VERIFY OWNER PIN
   */
  async verifyOwnerPIN(pin) {
    try {
      if (!this.ownerPIN) {
        return { success: false, error: 'Owner PIN not set' };
      }

      if (pin === this.ownerPIN) {
        // Enable price override for this session
        this.priceOverrideEnabled = true;
        
        // Auto-disable after 5 minutes
        setTimeout(() => {
          this.priceOverrideEnabled = false;
        }, 5 * 60 * 1000);

        return { success: true };
      }

      return { success: false, error: 'Incorrect PIN' };
    } catch (error) {
      console.error('PIN verification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * QUANTITY SANITY CHECK
   * Alert if abnormal quantity
   */
  checkQuantitySanity(quantity, unit) {
    const threshold = this.quantityThresholds[unit] || 100;

    if (quantity > threshold) {
      return {
        abnormal: true,
        quantity,
        unit,
        threshold,
        message: `Confirm quantity?`
      };
    }

    return { abnormal: false };
  }

  /**
   * NEGATIVE STOCK PROTECTION
   * Stock can NEVER go below zero
   */
  async checkStockAvailability(productId, requestedQty) {
    try {
      const product = await table('inventory')
        .where('id', productId)
        .first();

      if (!product.success || !product.data) {
        return {
          available: false,
          error: 'Product not found'
        };
      }

      const currentStock = product.data.current_stock || 0;

      if (currentStock < requestedQty) {
        return {
          available: false,
          currentStock,
          requestedQty,
          message: 'Stock finished'
        };
      }

      return {
        available: true,
        currentStock,
        requestedQty
      };
    } catch (error) {
      console.error('Stock check error:', error);
      return { available: false, error: error.message };
    }
  }

  /**
   * UNIT LOCK CHECK
   * Product unit CANNOT be changed after first sale
   */
  async checkUnitChange(productId, newUnit) {
    try {
      // Check if product has any sales
      const hasSales = await table('invoice_items')
        .where('product_id', productId)
        .limit(1)
        .first();

      if (hasSales.success && hasSales.data) {
        // Product has sales - unit is LOCKED
        const product = await table('inventory')
          .where('id', productId)
          .first();

        const currentUnit = product.data.unit;

        if (newUnit !== currentUnit) {
          return {
            allowed: false,
            locked: true,
            currentUnit,
            attemptedUnit: newUnit,
            message: 'Unit locked after first sale'
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Unit check error:', error);
      return { allowed: false, error: error.message };
    }
  }

  /**
   * VALIDATE BILL BEFORE PAYMENT
   * Final check before completing payment
   */
  async validateBill(billData) {
    const errors = [];

    // Check all items
    for (const item of billData.items) {
      // Check stock availability
      const stockCheck = await this.checkStockAvailability(
        item.productId,
        item.quantity
      );

      if (!stockCheck.available) {
        errors.push({
          item: item.name,
          error: stockCheck.message || 'Stock not available'
        });
      }

      // Check price lock
      const priceCheck = await this.checkPriceChange(
        item.productId,
        item.rate
      );

      if (!priceCheck.allowed && priceCheck.requiresOwnerPIN) {
        errors.push({
          item: item.name,
          error: 'Price changed without authorization'
        });
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors
      };
    }

    return { valid: true };
  }

  /**
   * DISABLE PRICE OVERRIDE
   */
  disablePriceOverride() {
    this.priceOverrideEnabled = false;
  }

  /**
   * CHECK IF PRICE OVERRIDE ENABLED
   */
  isPriceOverrideEnabled() {
    return this.priceOverrideEnabled;
  }
}

// Create singleton instance
const billingGuard = new BillingGuard();

export default billingGuard;
export { BillingGuard };
