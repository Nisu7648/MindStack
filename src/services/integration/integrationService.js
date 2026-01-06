/**
 * INTEGRATION SERVICE
 * Connects all services together
 * Ensures frontend-backend communication
 */

import auditTrailService from '../audit/auditTrailService';
import complianceEngine from '../audit/complianceEngine';
import billingGuard from '../pos/billingGuard';
import cashGuard from '../pos/cashGuard';
import returnsEngine from '../pos/returnsEngine';
import inventoryEngine from '../pos/inventoryEngine';
import posEngine from '../pos/posEngine';
import autoSaveManager from '../pos/autoSaveManager';
import accessControl from '../pos/accessControl';
import { table } from '../database/queryBuilder';

/**
 * Integration Service
 * Central hub for all service interactions
 */
class IntegrationService {
  constructor() {
    this.initialized = false;
  }

  /**
   * INITIALIZE ALL SERVICES
   */
  async initialize() {
    try {
      console.log('Initializing all services...');

      // Initialize audit trail
      await auditTrailService.initialize();
      console.log('✓ Audit trail initialized');

      // Initialize billing guard
      await billingGuard.initialize();
      console.log('✓ Billing guard initialized');

      // Initialize cash guard
      await cashGuard.initialize();
      console.log('✓ Cash guard initialized');

      // Initialize inventory engine
      await inventoryEngine.initialize();
      console.log('✓ Inventory engine initialized');

      // Initialize POS engine
      await posEngine.initialize();
      console.log('✓ POS engine initialized');

      // Initialize auto-save manager
      await autoSaveManager.initialize();
      console.log('✓ Auto-save manager initialized');

      // Initialize access control
      await accessControl.initialize();
      console.log('✓ Access control initialized');

      this.initialized = true;
      console.log('✓ All services initialized successfully');

      return { success: true };
    } catch (error) {
      console.error('Service initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * CREATE INVOICE (Complete Flow)
   * Frontend → Validation → Database → Audit → Stock → Accounting
   */
  async createInvoice(invoiceData) {
    try {
      // Step 1: Validate invoice (Compliance)
      const validation = await complianceEngine.validateInvoice(invoiceData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 2: Check stock availability
      for (const item of invoiceData.items) {
        const stockCheck = await billingGuard.checkStockAvailability(
          item.product_id,
          item.quantity
        );

        if (!stockCheck.available) {
          return {
            success: false,
            error: `${item.item_name}: ${stockCheck.message}`
          };
        }
      }

      // Step 3: Create invoice in database
      const invoice = await table('invoices').insert({
        ...invoiceData,
        created_at: new Date().toISOString()
      });

      if (!invoice.success) {
        return {
          success: false,
          error: 'Failed to create invoice'
        };
      }

      // Step 4: Create invoice items
      for (const item of invoiceData.items) {
        await table('invoice_items').insert({
          ...item,
          invoice_id: invoice.data.id,
          created_at: new Date().toISOString()
        });
      }

      // Step 5: Reduce stock
      for (const item of invoiceData.items) {
        await inventoryEngine.reduceStock(
          item.product_id,
          item.quantity,
          invoice.data.id
        );
      }

      // Step 6: Create accounting entry
      await this.createSalesJournalEntry(invoice.data);

      // Step 7: Audit log
      await auditTrailService.logInvoice(invoice.data);

      // Step 8: Auto-save
      await autoSaveManager.clearCurrentBill();

      return {
        success: true,
        invoice: invoice.data
      };
    } catch (error) {
      console.error('Create invoice error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * CANCEL INVOICE (Complete Flow)
   */
  async cancelInvoice(invoiceId, ownerPIN, reason) {
    try {
      // Step 1: Verify owner PIN
      const pinCheck = await billingGuard.verifyOwnerPIN(ownerPIN);
      if (!pinCheck.success) {
        return {
          success: false,
          error: 'Invalid owner PIN'
        };
      }

      // Step 2: Check if can cancel
      const canCancel = await returnsEngine.canCancelBill(invoiceId);
      if (!canCancel.allowed) {
        return {
          success: false,
          error: canCancel.error
        };
      }

      // Step 3: Get invoice details
      const invoice = await table('invoices')
        .where('id', invoiceId)
        .first();

      if (!invoice.success || !invoice.data) {
        return {
          success: false,
          error: 'Invoice not found'
        };
      }

      // Step 4: Cancel invoice
      const result = await returnsEngine.cancelBill(invoiceId, ownerPIN, reason);

      if (!result.success) {
        return result;
      }

      // Step 5: Audit log
      await auditTrailService.logInvoiceCancel(
        invoiceId,
        invoice.data.invoice_no,
        reason
      );

      return result;
    } catch (error) {
      console.error('Cancel invoice error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ADJUST STOCK (Complete Flow)
   */
  async adjustStock(productId, quantity, reason) {
    try {
      // Step 1: Get product details
      const product = await table('inventory')
        .where('id', productId)
        .first();

      if (!product.success || !product.data) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const oldStock = product.data.current_stock;
      const newStock = oldStock + quantity;

      // Step 2: Validate adjustment
      const validation = await complianceEngine.validateStockAdjustment({
        new_stock: newStock,
        reason
      });

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Step 3: Adjust stock
      const result = await inventoryEngine.adjustStock(productId, quantity, reason);

      if (!result.success) {
        return result;
      }

      // Step 4: Audit log
      await auditTrailService.logStockAdjustment(
        productId,
        product.data.item_name,
        oldStock,
        newStock,
        reason
      );

      return result;
    } catch (error) {
      console.error('Adjust stock error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * CLOSE DAY (Complete Flow)
   */
  async closeDay(physicalCash) {
    try {
      // Step 1: Check if day started
      const isDayStarted = await cashGuard.isDayStarted();
      if (!isDayStarted) {
        return {
          success: false,
          error: 'Day not started'
        };
      }

      // Step 2: Close day
      const result = await cashGuard.closeDay(physicalCash);

      if (!result.success) {
        return result;
      }

      // Step 3: Audit log
      await auditTrailService.logEvent({
        eventType: 'DAY_CLOSE',
        severity: 'CRITICAL',
        action: 'CLOSE',
        description: `Day closed with ${result.dayClose.status}`,
        metadata: result.dayClose
      });

      return result;
    } catch (error) {
      console.error('Close day error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * UPDATE PRODUCT PRICE (Complete Flow)
   */
  async updateProductPrice(productId, newPrice) {
    try {
      // Step 1: Get product
      const product = await table('inventory')
        .where('id', productId)
        .first();

      if (!product.success || !product.data) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const oldPrice = product.data.selling_price;

      // Step 2: Check price change permission
      const check = await billingGuard.checkPriceChange(productId, newPrice);

      if (!check.allowed && check.requiresOwnerPIN) {
        return {
          success: false,
          requiresOwnerPIN: true,
          message: check.message
        };
      }

      // Step 3: Update price
      await table('inventory')
        .where('id', productId)
        .update({
          selling_price: newPrice,
          updated_at: new Date().toISOString()
        });

      // Step 4: Audit log
      await auditTrailService.logPriceChange(
        productId,
        product.data.item_name,
        oldPrice,
        newPrice
      );

      return { success: true };
    } catch (error) {
      console.error('Update product price error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * CREATE SALES JOURNAL ENTRY
   */
  async createSalesJournalEntry(invoice) {
    try {
      const txnId = `TXN_${Date.now()}`;

      // Create transaction
      await table('transactions').insert({
        id: txnId,
        txn_date: invoice.invoice_date,
        txn_type: 'SALES',
        reference: invoice.invoice_no,
        description: `Sales invoice ${invoice.invoice_no}`,
        total_amount: invoice.total_amount,
        status: 'posted',
        created_at: new Date().toISOString()
      });

      // Debit: Cash/Bank
      await table('ledger').insert({
        id: `LED_${Date.now()}_1`,
        transaction_id: txnId,
        date: invoice.invoice_date,
        account_id: invoice.payment_mode === 'CASH' ? 'CASH' : 'BANK',
        description: `Sales ${invoice.invoice_no}`,
        debit: invoice.total_amount,
        credit: 0,
        created_at: new Date().toISOString()
      });

      // Credit: Sales
      await table('ledger').insert({
        id: `LED_${Date.now()}_2`,
        transaction_id: txnId,
        date: invoice.invoice_date,
        account_id: 'SALES',
        description: `Sales ${invoice.invoice_no}`,
        debit: 0,
        credit: invoice.subtotal || invoice.total_amount,
        created_at: new Date().toISOString()
      });

      // Credit: GST (if applicable)
      if (invoice.gst_amount > 0) {
        await table('ledger').insert({
          id: `LED_${Date.now()}_3`,
          transaction_id: txnId,
          date: invoice.invoice_date,
          account_id: 'GST_OUTPUT',
          description: `GST on ${invoice.invoice_no}`,
          debit: 0,
          credit: invoice.gst_amount,
          created_at: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Create sales journal entry error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET DASHBOARD DATA
   */
  async getDashboardData() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Today's sales
      const salesResult = await table('invoices')
        .where('invoice_date', '>=', `${today}T00:00:00`)
        .where('invoice_date', '<', `${today}T23:59:59`)
        .where('status', 'active')
        .get();

      let todaySales = 0;
      let billCount = 0;

      if (salesResult.success) {
        todaySales = salesResult.data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        billCount = salesResult.data.length;
      }

      // Low stock items
      const lowStockResult = await table('inventory')
        .where('is_active', 1)
        .where('current_stock', '<=', 'min_stock_level')
        .limit(5)
        .get();

      const lowStockItems = lowStockResult.success ? lowStockResult.data : [];

      // Recent audit events
      const auditResult = await auditTrailService.getAuditTrail({
        limit: 10
      });

      const recentEvents = auditResult.success ? auditResult.logs : [];

      return {
        success: true,
        dashboard: {
          todaySales,
          billCount,
          lowStockItems,
          recentEvents
        }
      };
    } catch (error) {
      console.error('Get dashboard data error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * VERIFY SYSTEM INTEGRITY
   */
  async verifySystemIntegrity() {
    try {
      const checks = [];

      // Check 1: Audit trail integrity
      const auditCheck = await auditTrailService.verifyAuditIntegrity();
      checks.push({
        name: 'Audit Trail Integrity',
        status: auditCheck.isValid ? 'PASS' : 'FAIL',
        details: auditCheck
      });

      // Check 2: Trial balance
      const trialBalance = await complianceEngine.checkTrialBalance(
        new Date(new Date().getFullYear(), 0, 1).toISOString(),
        new Date().toISOString()
      );
      checks.push({
        name: 'Trial Balance',
        status: trialBalance.isBalanced ? 'PASS' : 'FAIL',
        details: trialBalance
      });

      // Check 3: Negative stock
      const negativeStock = await complianceEngine.checkNegativeStock();
      checks.push({
        name: 'Stock Validation',
        status: negativeStock.length === 0 ? 'PASS' : 'FAIL',
        details: { negativeItems: negativeStock }
      });

      const overallStatus = checks.every(c => c.status === 'PASS') ? 'HEALTHY' : 'ISSUES_FOUND';

      return {
        success: true,
        status: overallStatus,
        checks
      };
    } catch (error) {
      console.error('Verify system integrity error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const integrationService = new IntegrationService();

export default integrationService;
export { IntegrationService };
