/**
 * STOCK MANAGEMENT SERVICE
 * Complete inventory management system
 * 
 * Features:
 * - Item master management
 * - Stock tracking (FIFO/WAC)
 * - Low stock alerts
 * - Stock adjustments
 * - Barcode management
 * - Stock reports
 */

import { getDatabase } from '../database/schema';
import offlineSyncService from '../offline/syncService';

/**
 * STOCK VALUATION METHODS
 */
export const VALUATION_METHODS = {
  FIFO: 'FIFO',   // First In First Out
  WAC: 'WAC',     // Weighted Average Cost
  LIFO: 'LIFO'    // Last In First Out
};

/**
 * Stock Management Service
 */
class StockManagementService {
  constructor() {
    this.lowStockThreshold = 10;
    this.valuationMethod = VALUATION_METHODS.FIFO;
  }

  /**
   * Add new item to stock
   */
  async addItem(itemData) {
    const {
      itemName,
      itemCode,
      barcode,
      hsnCode,
      category,
      unit,
      purchasePrice,
      sellingPrice,
      gstRate,
      openingStock = 0,
      minStockLevel = 10,
      maxStockLevel = 1000,
      reorderLevel = 20,
      description = null
    } = itemData;

    const db = await getDatabase();

    // Check if item code already exists
    const existing = await db.executeSql(
      'SELECT id FROM stock_items WHERE item_code = ?',
      [itemCode]
    );

    if (existing.rows.length > 0) {
      throw new Error('Item code already exists');
    }

    // Generate item ID
    const itemId = `ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert item
    await db.executeSql(
      `INSERT INTO stock_items (
        id, item_name, item_code, barcode, hsn_code, category,
        unit, purchase_price, selling_price, gst_rate,
        current_stock, min_stock_level, max_stock_level, reorder_level,
        description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId, itemName, itemCode, barcode, hsnCode, category,
        unit, purchasePrice, sellingPrice, gstRate,
        openingStock, minStockLevel, maxStockLevel, reorderLevel,
        description, new Date().toISOString(), new Date().toISOString()
      ]
    );

    // If opening stock > 0, create stock entry
    if (openingStock > 0) {
      await this.addStockEntry({
        itemId,
        itemCode,
        quantity: openingStock,
        rate: purchasePrice,
        transactionType: 'OPENING',
        reference: 'Opening Stock'
      });
    }

    // Add to sync queue
    await offlineSyncService.addToQueue({
      operationType: 'CREATE',
      entityType: 'stock_item',
      entityId: itemId,
      data: itemData
    });

    return {
      success: true,
      itemId,
      message: 'Item added successfully'
    };
  }

  /**
   * Update item
   */
  async updateItem(itemId, updates) {
    const db = await getDatabase();

    // Check if item exists
    const existing = await db.executeSql(
      'SELECT * FROM stock_items WHERE id = ?',
      [itemId]
    );

    if (existing.rows.length === 0) {
      throw new Error('Item not found');
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'item_name', 'barcode', 'hsn_code', 'category', 'unit',
      'purchase_price', 'selling_price', 'gst_rate',
      'min_stock_level', 'max_stock_level', 'reorder_level', 'description'
    ];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(itemId);

    await db.executeSql(
      `UPDATE stock_items SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Add to sync queue
    await offlineSyncService.addToQueue({
      operationType: 'UPDATE',
      entityType: 'stock_item',
      entityId: itemId,
      data: updates
    });

    return {
      success: true,
      message: 'Item updated successfully'
    };
  }

  /**
   * Get item by ID
   */
  async getItemById(itemId) {
    const db = await getDatabase();

    const result = await db.executeSql(
      'SELECT * FROM stock_items WHERE id = ?',
      [itemId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows.item(0);
  }

  /**
   * Get item by code
   */
  async getItemByCode(itemCode) {
    const db = await getDatabase();

    const result = await db.executeSql(
      'SELECT * FROM stock_items WHERE item_code = ?',
      [itemCode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows.item(0);
  }

  /**
   * Get item by barcode
   */
  async getItemByBarcode(barcode) {
    const db = await getDatabase();

    const result = await db.executeSql(
      'SELECT * FROM stock_items WHERE barcode = ?',
      [barcode]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows.item(0);
  }

  /**
   * Search items
   */
  async searchItems(searchTerm, limit = 20) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT * FROM stock_items 
       WHERE item_name LIKE ? OR item_code LIKE ? OR barcode LIKE ?
       ORDER BY item_name
       LIMIT ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
    );

    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }

    return items;
  }

  /**
   * List all items
   */
  async listItems(filters = {}) {
    const db = await getDatabase();

    let query = 'SELECT * FROM stock_items WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.lowStock) {
      query += ' AND current_stock <= min_stock_level';
    }

    if (filters.outOfStock) {
      query += ' AND current_stock = 0';
    }

    query += ' ORDER BY item_name';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const result = await db.executeSql(query, params);

    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }

    return items;
  }

  /**
   * Add stock entry (purchase/adjustment)
   */
  async addStockEntry(entryData) {
    const {
      itemId,
      itemCode,
      quantity,
      rate,
      transactionType, // PURCHASE, SALE, ADJUSTMENT, OPENING, RETURN
      reference,
      notes = null
    } = entryData;

    const db = await getDatabase();

    // Get current item
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Calculate new stock
    let newStock = item.current_stock;
    if (transactionType === 'PURCHASE' || transactionType === 'OPENING' || 
        transactionType === 'RETURN_IN') {
      newStock += quantity;
    } else if (transactionType === 'SALE' || transactionType === 'ADJUSTMENT' || 
               transactionType === 'RETURN_OUT') {
      newStock -= quantity;
    }

    // Create stock entry
    const entryId = `STOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.executeSql(
      `INSERT INTO stock_entries (
        id, item_id, item_code, transaction_type, quantity, rate,
        reference, notes, stock_before, stock_after, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId, itemId, itemCode, transactionType, quantity, rate,
        reference, notes, item.current_stock, newStock, new Date().toISOString()
      ]
    );

    // Update item stock
    await db.executeSql(
      'UPDATE stock_items SET current_stock = ?, updated_at = ? WHERE id = ?',
      [newStock, new Date().toISOString(), itemId]
    );

    // Check low stock alert
    if (newStock <= item.min_stock_level) {
      await this.createLowStockAlert(itemId, newStock, item.min_stock_level);
    }

    return {
      success: true,
      entryId,
      newStock,
      lowStockAlert: newStock <= item.min_stock_level
    };
  }

  /**
   * Reduce stock (for sales)
   */
  async reduceStock(itemCode, quantity, reference) {
    const item = await this.getItemByCode(itemCode);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.current_stock < quantity) {
      return {
        success: false,
        error: 'Insufficient stock',
        available: item.current_stock
      };
    }

    return this.addStockEntry({
      itemId: item.id,
      itemCode: item.item_code,
      quantity: quantity,
      rate: item.selling_price,
      transactionType: 'SALE',
      reference: reference
    });
  }

  /**
   * Stock adjustment
   */
  async adjustStock(itemId, newQuantity, reason) {
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const difference = newQuantity - item.current_stock;
    const transactionType = difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

    return this.addStockEntry({
      itemId: item.id,
      itemCode: item.item_code,
      quantity: Math.abs(difference),
      rate: item.purchase_price,
      transactionType: transactionType,
      reference: 'Stock Adjustment',
      notes: reason
    });
  }

  /**
   * Get stock value
   */
  async getStockValue() {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(current_stock * purchase_price) as purchase_value,
        SUM(current_stock * selling_price) as selling_value
       FROM stock_items`
    );

    const row = result.rows.item(0);

    return {
      purchaseValue: row.purchase_value || 0,
      sellingValue: row.selling_value || 0,
      potentialProfit: (row.selling_value || 0) - (row.purchase_value || 0)
    };
  }

  /**
   * Get low stock items
   */
  async getLowStockItems() {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT * FROM stock_items 
       WHERE current_stock <= min_stock_level
       ORDER BY current_stock ASC`
    );

    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }

    return items;
  }

  /**
   * Get out of stock items
   */
  async getOutOfStockItems() {
    const db = await getDatabase();

    const result = await db.executeSql(
      'SELECT * FROM stock_items WHERE current_stock = 0 ORDER BY item_name'
    );

    const items = [];
    for (let i = 0; i < result.rows.length; i++) {
      items.push(result.rows.item(i));
    }

    return items;
  }

  /**
   * Get stock movement report
   */
  async getStockMovement(itemId, fromDate, toDate) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT * FROM stock_entries 
       WHERE item_id = ? 
       AND created_at >= ? 
       AND created_at <= ?
       ORDER BY created_at DESC`,
      [itemId, fromDate, toDate]
    );

    const entries = [];
    for (let i = 0; i < result.rows.length; i++) {
      entries.push(result.rows.item(i));
    }

    return entries;
  }

  /**
   * Create low stock alert
   */
  async createLowStockAlert(itemId, currentStock, minLevel) {
    const db = await getDatabase();

    const alertId = `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.executeSql(
      `INSERT INTO stock_alerts (
        id, item_id, alert_type, current_stock, threshold, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [alertId, itemId, 'LOW_STOCK', currentStock, minLevel, new Date().toISOString()]
    );

    return alertId;
  }

  /**
   * Get stock alerts
   */
  async getStockAlerts(resolved = false) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT a.*, i.item_name, i.item_code 
       FROM stock_alerts a
       JOIN stock_items i ON a.item_id = i.id
       WHERE a.resolved = ?
       ORDER BY a.created_at DESC`,
      [resolved ? 1 : 0]
    );

    const alerts = [];
    for (let i = 0; i < result.rows.length; i++) {
      alerts.push(result.rows.item(i));
    }

    return alerts;
  }

  /**
   * Resolve stock alert
   */
  async resolveAlert(alertId) {
    const db = await getDatabase();

    await db.executeSql(
      'UPDATE stock_alerts SET resolved = 1, resolved_at = ? WHERE id = ?',
      [new Date().toISOString(), alertId]
    );

    return { success: true };
  }

  /**
   * Get stock statistics
   */
  async getStockStatistics() {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN current_stock > 0 THEN 1 ELSE 0 END) as in_stock,
        SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(CASE WHEN current_stock <= min_stock_level THEN 1 ELSE 0 END) as low_stock,
        SUM(current_stock * purchase_price) as total_value
       FROM stock_items`
    );

    return result.rows.item(0);
  }

  /**
   * Delete item
   */
  async deleteItem(itemId) {
    const db = await getDatabase();

    // Check if item has stock
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (item.current_stock > 0) {
      throw new Error('Cannot delete item with stock. Adjust stock to zero first.');
    }

    // Delete item
    await db.executeSql('DELETE FROM stock_items WHERE id = ?', [itemId]);

    // Add to sync queue
    await offlineSyncService.addToQueue({
      operationType: 'DELETE',
      entityType: 'stock_item',
      entityId: itemId,
      data: {}
    });

    return { success: true };
  }
}

/**
 * Create stock management tables
 */
export const createStockManagementTables = async (db) => {
  // Stock items table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      item_name TEXT NOT NULL,
      item_code TEXT UNIQUE NOT NULL,
      barcode TEXT,
      hsn_code TEXT,
      category TEXT,
      unit TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      gst_rate REAL NOT NULL,
      current_stock REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 10,
      max_stock_level REAL DEFAULT 1000,
      reorder_level REAL DEFAULT 20,
      description TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL
    );
  `);

  // Stock entries table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS stock_entries (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      item_code TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      reference TEXT,
      notes TEXT,
      stock_before REAL NOT NULL,
      stock_after REAL NOT NULL,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (item_id) REFERENCES stock_items(id)
    );
  `);

  // Stock alerts table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      current_stock REAL NOT NULL,
      threshold REAL NOT NULL,
      resolved INTEGER DEFAULT 0,
      resolved_at DATETIME,
      created_at DATETIME NOT NULL,
      FOREIGN KEY (item_id) REFERENCES stock_items(id)
    );
  `);

  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_items_code ON stock_items(item_code);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_items_barcode ON stock_items(barcode);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_entries_item ON stock_entries(item_id);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_alerts_item ON stock_alerts(item_id);');
};

// Create singleton instance
const stockManagementService = new StockManagementService();

export default stockManagementService;
export { StockManagementService };
