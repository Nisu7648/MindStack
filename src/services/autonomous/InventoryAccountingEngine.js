/**
 * INVENTORY-ACCOUNTING COUPLING ENGINE
 * 
 * Tightly couples inventory with accounting
 * Every stock movement affects financial statements
 * Real-time profit calculation, dead stock analysis
 */

import { getDatabase } from '../database/schema';

/**
 * INVENTORY ACCOUNTING ENGINE
 * Ensures inventory movements are always reflected in accounting
 */
export class InventoryAccountingEngine {

  /**
   * RECORD STOCK PURCHASE
   * Auto-creates inventory + accounting entries
   */
  static async recordStockPurchase(purchaseData) {
    const db = await getDatabase();

    try {
      await db.transaction(async (tx) => {
        const {
          vendorId,
          items,
          totalAmount,
          gstAmount,
          paymentMode,
          invoiceNumber,
          date
        } = purchaseData;

        // 1. Create purchase transaction
        const transactionId = await this.createPurchaseTransaction(tx, {
          vendorId,
          totalAmount,
          gstAmount,
          paymentMode,
          invoiceNumber,
          date
        });

        // 2. Update inventory for each item
        for (const item of items) {
          await this.addStockToInventory(tx, item, transactionId);
        }

        // 3. Create accounting entries
        await this.createPurchaseAccountingEntries(tx, transactionId, purchaseData);

        // 4. Update vendor payables
        if (paymentMode === 'CREDIT') {
          await this.updateVendorPayables(tx, vendorId, totalAmount);
        }

        console.log(`✅ Stock purchase recorded: ${invoiceNumber}`);
      });

      return { success: true, message: 'Purchase recorded successfully' };
    } catch (error) {
      console.error('Stock purchase recording failed:', error);
      throw error;
    }
  }

  /**
   * RECORD STOCK SALE
   * Auto-updates inventory + calculates COGS + records profit
   */
  static async recordStockSale(saleData) {
    const db = await getDatabase();

    try {
      await db.transaction(async (tx) => {
        const {
          customerId,
          items,
          totalAmount,
          gstAmount,
          paymentMode,
          invoiceNumber,
          date
        } = saleData;

        // 1. Create sales transaction
        const transactionId = await this.createSalesTransaction(tx, {
          customerId,
          totalAmount,
          gstAmount,
          paymentMode,
          invoiceNumber,
          date
        });

        let totalCOGS = 0;
        let totalRevenue = 0;

        // 2. Process each item
        for (const item of items) {
          // Reduce inventory
          const cogsInfo = await this.reduceStockFromInventory(tx, item, transactionId);
          totalCOGS += cogsInfo.cogs;
          totalRevenue += item.sellingPrice * item.quantity;

          // Record item-level profit
          await this.recordItemProfit(tx, transactionId, item, cogsInfo);
        }

        // 3. Create accounting entries (including COGS)
        await this.createSalesAccountingEntries(tx, transactionId, saleData, totalCOGS);

        // 4. Calculate and record overall profit
        const grossProfit = totalRevenue - totalCOGS;
        const profitMargin = (grossProfit / totalRevenue) * 100;

        await this.recordTransactionProfit(tx, transactionId, {
          revenue: totalRevenue,
          cogs: totalCOGS,
          grossProfit,
          profitMargin
        });

        // 5. Update customer receivables
        if (paymentMode === 'CREDIT') {
          await this.updateCustomerReceivables(tx, customerId, totalAmount);
        }

        console.log(`✅ Stock sale recorded: ${invoiceNumber}, Profit: ₹${grossProfit.toFixed(2)}`);
      });

      return { success: true, message: 'Sale recorded successfully' };
    } catch (error) {
      console.error('Stock sale recording failed:', error);
      throw error;
    }
  }

  /**
   * ADD STOCK TO INVENTORY
   * Adds stock using FIFO layers
   */
  static async addStockToInventory(tx, item, transactionId) {
    const { productId, quantity, unitCost, batchNumber, expiryDate } = item;

    // 1. Update main inventory table
    const inventoryCheck = await tx.executeSql(
      `SELECT * FROM inventory WHERE product_id = ?`,
      [productId]
    );

    if (inventoryCheck[0].rows.length > 0) {
      // Update existing
      await tx.executeSql(
        `UPDATE inventory 
         SET quantity = quantity + ?,
             total_value = total_value + ?,
             last_purchase_price = ?,
             last_updated = ?
         WHERE product_id = ?`,
        [quantity, quantity * unitCost, unitCost, new Date().toISOString(), productId]
      );
    } else {
      // Insert new
      await tx.executeSql(
        `INSERT INTO inventory (
          product_id, quantity, unit_cost, total_value,
          last_purchase_price, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, quantity, unitCost, quantity * unitCost, unitCost, new Date().toISOString()]
      );
    }

    // 2. Create FIFO layer
    await tx.executeSql(
      `INSERT INTO inventory_layers (
        product_id, transaction_id, quantity, remaining_quantity,
        unit_cost, batch_number, expiry_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        transactionId,
        quantity,
        quantity,
        unitCost,
        batchNumber || null,
        expiryDate || null,
        new Date().toISOString()
      ]
    );

    // 3. Record inventory movement
    await tx.executeSql(
      `INSERT INTO inventory_movements (
        product_id, transaction_id, movement_type,
        quantity, unit_cost, total_cost, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        transactionId,
        'PURCHASE',
        quantity,
        unitCost,
        quantity * unitCost,
        new Date().toISOString()
      ]
    );
  }

  /**
   * REDUCE STOCK FROM INVENTORY
   * Reduces stock using FIFO and calculates COGS
   */
  static async reduceStockFromInventory(tx, item, transactionId) {
    const { productId, quantity } = item;
    let remainingQty = quantity;
    let totalCOGS = 0;

    // Get FIFO layers (oldest first)
    const layers = await tx.executeSql(
      `SELECT * FROM inventory_layers
       WHERE product_id = ? AND remaining_quantity > 0
       ORDER BY created_at ASC`,
      [productId]
    );

    if (layers[0].rows.length === 0) {
      throw new Error(`Insufficient stock for product ${productId}`);
    }

    // Consume layers using FIFO
    for (let i = 0; i < layers[0].rows.length && remainingQty > 0; i++) {
      const layer = layers[0].rows.item(i);
      const qtyToConsume = Math.min(remainingQty, layer.remaining_quantity);
      const layerCOGS = qtyToConsume * layer.unit_cost;

      // Update layer
      await tx.executeSql(
        `UPDATE inventory_layers
         SET remaining_quantity = remaining_quantity - ?
         WHERE id = ?`,
        [qtyToConsume, layer.id]
      );

      totalCOGS += layerCOGS;
      remainingQty -= qtyToConsume;
    }

    if (remainingQty > 0) {
      throw new Error(`Insufficient stock for product ${productId}. Short by ${remainingQty} units`);
    }

    // Update main inventory
    await tx.executeSql(
      `UPDATE inventory
       SET quantity = quantity - ?,
           total_value = total_value - ?,
           last_updated = ?
       WHERE product_id = ?`,
      [quantity, totalCOGS, new Date().toISOString(), productId]
    );

    // Record movement
    await tx.executeSql(
      `INSERT INTO inventory_movements (
        product_id, transaction_id, movement_type,
        quantity, unit_cost, total_cost, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        transactionId,
        'SALE',
        -quantity,
        totalCOGS / quantity,
        totalCOGS,
        new Date().toISOString()
      ]
    );

    return {
      cogs: totalCOGS,
      avgCost: totalCOGS / quantity
    };
  }

  /**
   * CREATE PURCHASE ACCOUNTING ENTRIES
   * Dr. Inventory, Cr. Cash/Bank/Vendor
   */
  static async createPurchaseAccountingEntries(tx, transactionId, purchaseData) {
    const { totalAmount, gstAmount, paymentMode, vendorId } = purchaseData;
    const inventoryValue = totalAmount - gstAmount;

    // Dr. Inventory
    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Inventory', inventoryValue, 0, new Date().toISOString()]
    );

    // Dr. GST Input (if applicable)
    if (gstAmount > 0) {
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'GST Input', gstAmount, 0, new Date().toISOString()]
      );
    }

    // Cr. Cash/Bank/Vendor
    if (paymentMode === 'CREDIT') {
      const vendorName = await this.getVendorName(tx, vendorId);
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, vendorName, 0, totalAmount, new Date().toISOString()]
      );
    } else {
      const account = paymentMode === 'CASH' ? 'Cash' : 'Bank';
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, account, 0, totalAmount, new Date().toISOString()]
      );
    }
  }

  /**
   * CREATE SALES ACCOUNTING ENTRIES
   * Dr. Cash/Bank/Customer, Cr. Sales
   * Dr. COGS, Cr. Inventory
   */
  static async createSalesAccountingEntries(tx, transactionId, saleData, totalCOGS) {
    const { totalAmount, gstAmount, paymentMode, customerId } = saleData;
    const salesValue = totalAmount - gstAmount;

    // Dr. Cash/Bank/Customer
    if (paymentMode === 'CREDIT') {
      const customerName = await this.getCustomerName(tx, customerId);
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, customerName, totalAmount, 0, new Date().toISOString()]
      );
    } else {
      const account = paymentMode === 'CASH' ? 'Cash' : 'Bank';
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, account, totalAmount, 0, new Date().toISOString()]
      );
    }

    // Cr. Sales
    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Sales', 0, salesValue, new Date().toISOString()]
    );

    // Cr. GST Output (if applicable)
    if (gstAmount > 0) {
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'GST Output', 0, gstAmount, new Date().toISOString()]
      );
    }

    // Dr. COGS, Cr. Inventory
    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Cost of Goods Sold', totalCOGS, 0, new Date().toISOString()]
    );

    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Inventory', 0, totalCOGS, new Date().toISOString()]
    );
  }

  /**
   * RECORD ITEM PROFIT
   * Records profit for each item sold
   */
  static async recordItemProfit(tx, transactionId, item, cogsInfo) {
    const revenue = item.sellingPrice * item.quantity;
    const profit = revenue - cogsInfo.cogs;
    const margin = (profit / revenue) * 100;

    await tx.executeSql(
      `INSERT INTO item_profit_analysis (
        transaction_id, product_id, quantity,
        revenue, cogs, profit, margin, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        item.productId,
        item.quantity,
        revenue,
        cogsInfo.cogs,
        profit,
        margin,
        new Date().toISOString()
      ]
    );
  }

  /**
   * RECORD TRANSACTION PROFIT
   * Records overall transaction profit
   */
  static async recordTransactionProfit(tx, transactionId, profitData) {
    await tx.executeSql(
      `INSERT INTO profit_analysis (
        transaction_id, revenue, cost, gross_profit,
        profit_margin, date
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        profitData.revenue,
        profitData.cogs,
        profitData.grossProfit,
        profitData.profitMargin,
        new Date().toISOString()
      ]
    );
  }

  /**
   * CALCULATE REAL MARGIN
   * Calculates actual profit margin considering all costs
   */
  static async calculateRealMargin(productId, startDate, endDate) {
    const db = await getDatabase();

    const query = `
      SELECT 
        p.name as product_name,
        SUM(ipa.quantity) as total_sold,
        SUM(ipa.revenue) as total_revenue,
        SUM(ipa.cogs) as total_cogs,
        SUM(ipa.profit) as total_profit,
        AVG(ipa.margin) as avg_margin
      FROM item_profit_analysis ipa
      INNER JOIN products p ON ipa.product_id = p.id
      WHERE ipa.product_id = ?
      AND DATE(ipa.date) BETWEEN ? AND ?
      GROUP BY ipa.product_id
    `;

    const result = await db.executeSql(query, [productId, startDate, endDate]);

    if (result[0].rows.length === 0) {
      return null;
    }

    return result[0].rows.item(0);
  }

  /**
   * IDENTIFY DEAD STOCK
   * Finds products with no movement and calculates cost
   */
  static async identifyDeadStock(days = 90) {
    const db = await getDatabase();

    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        i.quantity,
        i.total_value,
        i.last_updated,
        JULIANDAY('now') - JULIANDAY(i.last_updated) as days_since_movement
      FROM products p
      INNER JOIN inventory i ON p.id = i.product_id
      WHERE i.quantity > 0
      AND JULIANDAY('now') - JULIANDAY(i.last_updated) > ?
      ORDER BY i.total_value DESC
    `;

    const result = await db.executeSql(query, [days]);
    const deadStock = [];
    let totalDeadStockValue = 0;

    for (let i = 0; i < result[0].rows.length; i++) {
      const item = result[0].rows.item(i);
      deadStock.push(item);
      totalDeadStockValue += item.total_value;
    }

    return {
      deadStock,
      totalDeadStockValue,
      count: deadStock.length
    };
  }

  /**
   * ANALYZE OVER-PURCHASING
   * Identifies products purchased in excess
   */
  static async analyzeOverPurchasing(months = 3) {
    const db = await getDatabase();

    const query = `
      SELECT 
        p.id,
        p.name,
        i.quantity as current_stock,
        AVG(monthly_sales.qty) as avg_monthly_sales,
        i.quantity / NULLIF(AVG(monthly_sales.qty), 0) as months_of_stock
      FROM products p
      INNER JOIN inventory i ON p.id = i.product_id
      LEFT JOIN (
        SELECT 
          product_id,
          strftime('%Y-%m', date) as month,
          SUM(ABS(quantity)) as qty
        FROM inventory_movements
        WHERE movement_type = 'SALE'
        AND DATE(date) >= DATE('now', '-${months} months')
        GROUP BY product_id, month
      ) monthly_sales ON p.id = monthly_sales.product_id
      WHERE i.quantity > 0
      GROUP BY p.id
      HAVING months_of_stock > 6
      ORDER BY months_of_stock DESC
    `;

    const result = await db.executeSql(query);
    const overPurchased = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      overPurchased.push(result[0].rows.item(i));
    }

    return overPurchased;
  }

  /**
   * GET INVENTORY VALUATION
   * Returns current inventory value and breakdown
   */
  static async getInventoryValuation() {
    const db = await getDatabase();

    const query = `
      SELECT 
        COUNT(*) as total_products,
        SUM(quantity) as total_units,
        SUM(total_value) as total_value,
        AVG(total_value) as avg_value_per_product
      FROM inventory
      WHERE quantity > 0
    `;

    const result = await db.executeSql(query);
    const summary = result[0].rows.item(0);

    // Get category-wise breakdown
    const categoryQuery = `
      SELECT 
        p.category,
        COUNT(*) as product_count,
        SUM(i.quantity) as total_units,
        SUM(i.total_value) as total_value
      FROM inventory i
      INNER JOIN products p ON i.product_id = p.id
      WHERE i.quantity > 0
      GROUP BY p.category
      ORDER BY total_value DESC
    `;

    const categoryResult = await db.executeSql(categoryQuery);
    const categoryBreakdown = [];

    for (let i = 0; i < categoryResult[0].rows.length; i++) {
      categoryBreakdown.push(categoryResult[0].rows.item(i));
    }

    return {
      summary,
      categoryBreakdown
    };
  }

  /**
   * GET LOW STOCK ALERTS
   * Identifies products below reorder level
   */
  static async getLowStockAlerts() {
    const db = await getDatabase();

    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        i.quantity as current_stock,
        p.reorder_level,
        p.reorder_quantity,
        i.total_value
      FROM products p
      INNER JOIN inventory i ON p.id = i.product_id
      WHERE i.quantity <= p.reorder_level
      AND p.reorder_level > 0
      ORDER BY (p.reorder_level - i.quantity) DESC
    `;

    const result = await db.executeSql(query);
    const alerts = [];

    for (let i = 0; i < result[0].rows.length; i++) {
      alerts.push(result[0].rows.item(i));
    }

    return alerts;
  }

  // Helper methods
  static async getVendorName(tx, vendorId) {
    const result = await tx.executeSql(
      `SELECT name FROM vendors WHERE id = ?`,
      [vendorId]
    );
    return result[0].rows.item(0).name;
  }

  static async getCustomerName(tx, customerId) {
    const result = await tx.executeSql(
      `SELECT name FROM customers WHERE id = ?`,
      [customerId]
    );
    return result[0].rows.item(0).name;
  }

  static async createPurchaseTransaction(tx, data) {
    const result = await tx.executeSql(
      `INSERT INTO transactions (
        voucher_type, date, narration, total_amount,
        status, reference_no, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'PURCHASE',
        data.date,
        `Purchase from vendor - ${data.invoiceNumber}`,
        data.totalAmount,
        'POSTED',
        data.invoiceNumber,
        new Date().toISOString()
      ]
    );
    return result[0].insertId;
  }

  static async createSalesTransaction(tx, data) {
    const result = await tx.executeSql(
      `INSERT INTO transactions (
        voucher_type, date, narration, total_amount,
        status, reference_no, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'SALES',
        data.date,
        `Sale to customer - ${data.invoiceNumber}`,
        data.totalAmount,
        'POSTED',
        data.invoiceNumber,
        new Date().toISOString()
      ]
    );
    return result[0].insertId;
  }

  static async updateVendorPayables(tx, vendorId, amount) {
    await tx.executeSql(
      `UPDATE vendors
       SET outstanding_balance = outstanding_balance + ?
       WHERE id = ?`,
      [amount, vendorId]
    );
  }

  static async updateCustomerReceivables(tx, customerId, amount) {
    await tx.executeSql(
      `UPDATE customers
       SET outstanding_balance = outstanding_balance + ?
       WHERE id = ?`,
      [amount, customerId]
    );
  }
}

export default InventoryAccountingEngine;
