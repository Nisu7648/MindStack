/**
 * INVENTORY ENGINE
 * Auto stock management with smart alerts
 * 
 * Rules:
 * - Every SALE → reduce stock
 * - Every PURCHASE → increase stock
 * - No manual adjustment without permission
 * - Auto-classify: Healthy / Low / Dead
 */

import { table } from '../database/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

/**
 * Stock Status
 */
export const STOCK_STATUS = {
  HEALTHY: 'HEALTHY',
  LOW: 'LOW',
  DEAD: 'DEAD',
  OUT: 'OUT'
};

/**
 * Inventory Engine
 */
class InventoryEngine {
  constructor() {
    this.lowStockThreshold = 10; // Default
    this.deadStockDays = 45; // No sale in 45 days
  }

  /**
   * ADD PRODUCT
   * One screen, no steps
   */
  async addProduct(productData) {
    try {
      // Check duplicate
      const existing = await this.findProductByName(productData.name);
      if (existing) {
        return {
          success: false,
          error: 'Product already exists',
          duplicate: true
        };
      }

      const product = {
        id: uuidv4(),
        item_code: productData.itemCode || `ITEM${Date.now()}`,
        item_name: productData.name,
        barcode: productData.barcode || null,
        hsn_code: productData.hsnCode || null,
        category: productData.category || null,
        unit: productData.unit || 'pcs',
        purchase_price: productData.purchasePrice || 0,
        selling_price: productData.sellingPrice,
        gst_rate: productData.gstRate || 0,
        current_stock: productData.openingStock || 0,
        min_stock_level: productData.minStockLevel || 10,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await table('inventory').insert(product);

      // Log opening stock if any
      if (product.current_stock > 0) {
        await this.logStockMovement({
          productId: product.id,
          movementType: 'OPENING',
          quantity: product.current_stock,
          referenceType: 'OPENING_STOCK',
          referenceId: product.id
        });
      }

      return { success: true, product };
    } catch (error) {
      console.error('Add product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * UPDATE PRODUCT
   */
  async updateProduct(productId, updates) {
    try {
      await table('inventory')
        .where('id', productId)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        });

      return { success: true };
    } catch (error) {
      console.error('Update product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET PRODUCT
   */
  async getProduct(productId) {
    try {
      const result = await table('inventory')
        .where('id', productId)
        .first();

      if (!result.success || !result.data) {
        return { success: false, error: 'Product not found' };
      }

      const product = result.data;
      const status = this.getStockStatus(product);

      return {
        success: true,
        product: {
          ...product,
          status
        }
      };
    } catch (error) {
      console.error('Get product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET ALL PRODUCTS
   */
  async getAllProducts(filters = {}) {
    try {
      let query = table('inventory').where('is_active', 1);

      if (filters.category) {
        query = query.where('category', filters.category);
      }

      if (filters.status) {
        // Filter by stock status
        if (filters.status === STOCK_STATUS.LOW) {
          query = query.where('current_stock', '<=', 'min_stock_level');
        } else if (filters.status === STOCK_STATUS.OUT) {
          query = query.where('current_stock', 0);
        }
      }

      const result = await query.orderBy('item_name', 'ASC').get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch products' };
      }

      // Add status to each product
      const products = result.data.map(p => ({
        ...p,
        status: this.getStockStatus(p)
      }));

      return { success: true, products };
    } catch (error) {
      console.error('Get all products error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET STOCK STATUS
   * Auto-classify: Healthy / Low / Dead / Out
   */
  getStockStatus(product) {
    if (product.current_stock === 0) {
      return STOCK_STATUS.OUT;
    }

    if (product.current_stock <= product.min_stock_level) {
      return STOCK_STATUS.LOW;
    }

    // Check if dead stock (no sale in X days)
    // TODO: Implement dead stock check

    return STOCK_STATUS.HEALTHY;
  }

  /**
   * ADJUST STOCK
   * Requires reason (owner permission)
   */
  async adjustStock(productId, quantity, reason) {
    try {
      if (!reason || reason.trim().length === 0) {
        return {
          success: false,
          error: 'Reason is mandatory for stock adjustment'
        };
      }

      const product = await table('inventory')
        .where('id', productId)
        .first();

      if (!product.success || !product.data) {
        return { success: false, error: 'Product not found' };
      }

      const currentStock = product.data.current_stock || 0;
      const newStock = currentStock + quantity;

      if (newStock < 0) {
        return {
          success: false,
          error: 'Cannot reduce stock below zero'
        };
      }

      // Update stock
      await table('inventory')
        .where('id', productId)
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        });

      // Log movement
      await this.logStockMovement({
        productId,
        movementType: 'ADJUSTMENT',
        quantity,
        referenceType: 'MANUAL',
        referenceId: null,
        notes: reason
      });

      return { success: true, newStock };
    } catch (error) {
      console.error('Adjust stock error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ADD PURCHASE
   * Increase stock
   */
  async addPurchase(purchaseData) {
    try {
      const purchaseId = uuidv4();

      // Save purchase header
      await table('purchases').insert({
        id: purchaseId,
        purchase_no: await this.generatePurchaseNumber(),
        purchase_date: purchaseData.date || new Date().toISOString(),
        supplier_name: purchaseData.supplierName || null,
        total_amount: purchaseData.totalAmount,
        payment_mode: purchaseData.paymentMode || 'CASH',
        status: 'completed',
        created_at: new Date().toISOString()
      });

      // Process items
      for (const item of purchaseData.items) {
        // Save purchase item
        await table('purchase_items').insert({
          id: uuidv4(),
          purchase_id: purchaseId,
          product_id: item.productId,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
          created_at: new Date().toISOString()
        });

        // Increase stock
        const product = await table('inventory')
          .where('id', item.productId)
          .first();

        if (product.success && product.data) {
          const currentStock = product.data.current_stock || 0;
          const newStock = currentStock + item.quantity;

          await table('inventory')
            .where('id', item.productId)
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString()
            });

          // Log movement
          await this.logStockMovement({
            productId: item.productId,
            movementType: 'PURCHASE',
            quantity: item.quantity,
            referenceType: 'PURCHASE',
            referenceId: purchaseId
          });
        }
      }

      return { success: true, purchaseId };
    } catch (error) {
      console.error('Add purchase error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LOG STOCK MOVEMENT
   */
  async logStockMovement(movementData) {
    try {
      await table('stock_movements').insert({
        id: uuidv4(),
        product_id: movementData.productId,
        movement_type: movementData.movementType,
        quantity: movementData.quantity,
        reference_type: movementData.referenceType,
        reference_id: movementData.referenceId,
        notes: movementData.notes || null,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Log stock movement error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET LOW STOCK ITEMS
   */
  async getLowStockItems() {
    try {
      const result = await table('inventory')
        .where('is_active', 1)
        .where('current_stock', '<=', 'min_stock_level')
        .orderBy('current_stock', 'ASC')
        .get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch low stock items' };
      }

      return {
        success: true,
        items: result.data.map(p => ({
          ...p,
          status: this.getStockStatus(p)
        }))
      };
    } catch (error) {
      console.error('Get low stock error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET DEAD STOCK ITEMS
   * No sale in X days
   */
  async getDeadStockItems(days = 45) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get products with no recent sales
      const result = await table('inventory')
        .where('is_active', 1)
        .where('current_stock', '>', 0)
        .get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch dead stock' };
      }

      const deadStock = [];

      for (const product of result.data) {
        // Check last sale
        const lastSale = await table('stock_movements')
          .where('product_id', product.id)
          .where('movement_type', 'SALE')
          .where('date', '>=', cutoffDate.toISOString())
          .first();

        if (!lastSale.success || !lastSale.data) {
          deadStock.push({
            ...product,
            status: STOCK_STATUS.DEAD,
            daysSinceLastSale: days
          });
        }
      }

      return { success: true, items: deadStock };
    } catch (error) {
      console.error('Get dead stock error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET STOCK ALERTS
   * Only useful alerts, no spam
   */
  async getStockAlerts() {
    try {
      const alerts = [];

      // Low stock alerts
      const lowStock = await this.getLowStockItems();
      if (lowStock.success && lowStock.items.length > 0) {
        for (const item of lowStock.items) {
          if (item.current_stock === 0) {
            alerts.push({
              type: 'OUT_OF_STOCK',
              severity: 'HIGH',
              message: `${item.item_name} is out of stock`,
              productId: item.id,
              productName: item.item_name
            });
          } else {
            // Calculate days until out of stock
            const avgDailySales = await this.getAverageDailySales(item.id);
            if (avgDailySales > 0) {
              const daysLeft = Math.floor(item.current_stock / avgDailySales);
              if (daysLeft <= 1) {
                alerts.push({
                  type: 'WILL_FINISH_TODAY',
                  severity: 'HIGH',
                  message: `${item.item_name} will finish today`,
                  productId: item.id,
                  productName: item.item_name,
                  daysLeft
                });
              } else if (daysLeft <= 3) {
                alerts.push({
                  type: 'LOW_STOCK',
                  severity: 'MEDIUM',
                  message: `${item.item_name} will finish in ${daysLeft} days`,
                  productId: item.id,
                  productName: item.item_name,
                  daysLeft
                });
              }
            }
          }
        }
      }

      // Dead stock alerts
      const deadStock = await this.getDeadStockItems(this.deadStockDays);
      if (deadStock.success && deadStock.items.length > 0) {
        for (const item of deadStock.items) {
          alerts.push({
            type: 'DEAD_STOCK',
            severity: 'LOW',
            message: `${item.item_name} not sold in ${this.deadStockDays} days`,
            productId: item.id,
            productName: item.item_name,
            daysSinceLastSale: item.daysSinceLastSale
          });
        }
      }

      return { success: true, alerts };
    } catch (error) {
      console.error('Get stock alerts error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET AVERAGE DAILY SALES
   */
  async getAverageDailySales(productId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await table('stock_movements')
        .where('product_id', productId)
        .where('movement_type', 'SALE')
        .where('date', '>=', cutoffDate.toISOString())
        .get();

      if (!result.success || result.data.length === 0) {
        return 0;
      }

      const totalSold = result.data.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      return totalSold / days;
    } catch (error) {
      console.error('Get average daily sales error:', error);
      return 0;
    }
  }

  /**
   * SUGGEST REORDER QUANTITY
   * Based on past sales
   */
  async suggestReorderQuantity(productId, days = 30) {
    try {
      const avgDailySales = await this.getAverageDailySales(productId, days);
      
      if (avgDailySales === 0) {
        return { success: true, quantity: 0, message: 'No sales history' };
      }

      // Suggest for 15 days
      const suggestedQty = Math.ceil(avgDailySales * 15);

      return {
        success: true,
        quantity: suggestedQty,
        avgDailySales: avgDailySales.toFixed(2),
        daysSupply: 15
      };
    } catch (error) {
      console.error('Suggest reorder error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GENERATE PURCHASE LIST
   * For low stock items
   */
  async generatePurchaseList() {
    try {
      const lowStock = await this.getLowStockItems();
      
      if (!lowStock.success || lowStock.items.length === 0) {
        return {
          success: true,
          items: [],
          message: 'No items need reordering'
        };
      }

      const purchaseList = [];

      for (const item of lowStock.items) {
        const suggestion = await this.suggestReorderQuantity(item.id);
        
        purchaseList.push({
          productId: item.id,
          productName: item.item_name,
          currentStock: item.current_stock,
          minStockLevel: item.min_stock_level,
          suggestedQuantity: suggestion.quantity || item.min_stock_level * 2,
          avgDailySales: suggestion.avgDailySales || 0
        });
      }

      return { success: true, items: purchaseList };
    } catch (error) {
      console.error('Generate purchase list error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * FIND PRODUCT BY NAME
   */
  async findProductByName(name) {
    try {
      const result = await table('inventory')
        .where('item_name', name)
        .where('is_active', 1)
        .first();

      return result.success ? result.data : null;
    } catch (error) {
      console.error('Find product error:', error);
      return null;
    }
  }

  /**
   * GENERATE PURCHASE NUMBER
   */
  async generatePurchaseNumber() {
    const today = new Date();
    const year = today.getFullYear().toString().substr(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const result = await table('purchases')
      .where('purchase_date', '>=', new Date().setHours(0, 0, 0, 0))
      .orderBy('created_at', 'DESC')
      .limit(1)
      .first();

    let sequence = 1;
    if (result.success && result.data) {
      const lastNo = result.data.purchase_no;
      const lastSeq = parseInt(lastNo.split('-').pop());
      sequence = lastSeq + 1;
    }

    return `PUR-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }
}

// Create singleton instance
const inventoryEngine = new InventoryEngine();

export default inventoryEngine;
export { InventoryEngine, STOCK_STATUS };
