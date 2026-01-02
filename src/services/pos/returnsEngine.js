/**
 * RETURNS & CANCELLATION ENGINE
 * Dead-simple, auto-restock, no manual edits
 * 
 * Rules:
 * - Only same-day bills can be cancelled
 * - Requires owner PIN
 * - Stock auto-restores
 * - Item-level return supported
 * - Adjust cash/UPI automatically
 */

import { table } from '../database/queryBuilder';
import { v4 as uuidv4 } from 'uuid';
import billingGuard from './billingGuard';

/**
 * Returns Engine
 */
class ReturnsEngine {
  constructor() {
    this.allowedReturnDays = 0; // Same day only
  }

  /**
   * CHECK IF BILL CAN BE CANCELLED
   */
  async canCancelBill(invoiceId) {
    try {
      const invoice = await table('invoices')
        .where('id', invoiceId)
        .first();

      if (!invoice.success || !invoice.data) {
        return {
          allowed: false,
          error: 'Invoice not found'
        };
      }

      const invoiceData = invoice.data;

      // Check if already cancelled
      if (invoiceData.status === 'cancelled') {
        return {
          allowed: false,
          error: 'Invoice already cancelled'
        };
      }

      // Check if same day
      const invoiceDate = new Date(invoiceData.invoice_date).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      if (invoiceDate !== today) {
        return {
          allowed: false,
          error: 'Only same-day bills can be cancelled'
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Check cancel error:', error);
      return { allowed: false, error: error.message };
    }
  }

  /**
   * CANCEL FULL BILL
   * Requires owner PIN
   */
  async cancelBill(invoiceId, ownerPIN, reason) {
    try {
      // Verify owner PIN
      const pinCheck = await billingGuard.verifyOwnerPIN(ownerPIN);
      if (!pinCheck.success) {
        return {
          success: false,
          error: 'Invalid owner PIN'
        };
      }

      // Check if can cancel
      const canCancel = await this.canCancelBill(invoiceId);
      if (!canCancel.allowed) {
        return {
          success: false,
          error: canCancel.error
        };
      }

      // Get invoice details
      const invoice = await table('invoices')
        .where('id', invoiceId)
        .first();

      const invoiceData = invoice.data;

      // Get invoice items
      const items = await table('invoice_items')
        .where('invoice_id', invoiceId)
        .get();

      if (!items.success) {
        return {
          success: false,
          error: 'Failed to fetch invoice items'
        };
      }

      // Restore stock for all items
      for (const item of items.data) {
        await this.restoreStock(item.product_id, item.quantity, invoiceId);
      }

      // Mark invoice as cancelled
      await table('invoices')
        .where('id', invoiceId)
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        });

      // Reverse transaction
      await this.reverseTransaction(invoiceData);

      return {
        success: true,
        message: 'Bill cancelled successfully',
        refundAmount: invoiceData.total_amount
      };
    } catch (error) {
      console.error('Cancel bill error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * RETURN SPECIFIC ITEMS
   * Item-level return
   */
  async returnItems(invoiceId, returnItems, ownerPIN) {
    try {
      // Verify owner PIN
      const pinCheck = await billingGuard.verifyOwnerPIN(ownerPIN);
      if (!pinCheck.success) {
        return {
          success: false,
          error: 'Invalid owner PIN'
        };
      }

      // Get invoice
      const invoice = await table('invoices')
        .where('id', invoiceId)
        .first();

      if (!invoice.success || !invoice.data) {
        return {
          success: false,
          error: 'Invoice not found'
        };
      }

      const invoiceData = invoice.data;

      // Check if same day
      const invoiceDate = new Date(invoiceData.invoice_date).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      if (invoiceDate !== today) {
        return {
          success: false,
          error: 'Only same-day returns allowed'
        };
      }

      let totalRefund = 0;

      // Process each return item
      for (const returnItem of returnItems) {
        // Get original item
        const originalItem = await table('invoice_items')
          .where('invoice_id', invoiceId)
          .where('product_id', returnItem.productId)
          .first();

        if (!originalItem.success || !originalItem.data) {
          continue;
        }

        const item = originalItem.data;

        // Check quantity
        if (returnItem.quantity > item.quantity) {
          return {
            success: false,
            error: `Cannot return more than sold quantity for ${item.item_name}`
          };
        }

        // Calculate refund
        const itemRefund = (item.amount / item.quantity) * returnItem.quantity;
        totalRefund += itemRefund;

        // Restore stock
        await this.restoreStock(
          returnItem.productId,
          returnItem.quantity,
          invoiceId
        );

        // Create return record
        await table('returns').insert({
          id: uuidv4(),
          invoice_id: invoiceId,
          product_id: returnItem.productId,
          quantity: returnItem.quantity,
          amount: itemRefund,
          return_date: new Date().toISOString(),
          reason: returnItem.reason || 'Customer return'
        });

        // Update invoice item
        const newQuantity = item.quantity - returnItem.quantity;
        if (newQuantity === 0) {
          // Delete item
          await table('invoice_items')
            .where('id', item.id)
            .delete();
        } else {
          // Update quantity
          await table('invoice_items')
            .where('id', item.id)
            .update({
              quantity: newQuantity,
              amount: (item.amount / item.quantity) * newQuantity
            });
        }
      }

      // Update invoice total
      const newTotal = invoiceData.total_amount - totalRefund;
      await table('invoices')
        .where('id', invoiceId)
        .update({
          total_amount: newTotal,
          updated_at: new Date().toISOString()
        });

      // Adjust payment
      await this.adjustPayment(invoiceData, totalRefund);

      return {
        success: true,
        message: 'Items returned successfully',
        refundAmount: totalRefund
      };
    } catch (error) {
      console.error('Return items error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * RESTORE STOCK
   * Auto-restock on return/cancel
   */
  async restoreStock(productId, quantity, invoiceId) {
    try {
      // Get current stock
      const product = await table('inventory')
        .where('id', productId)
        .first();

      if (!product.success || !product.data) {
        return { success: false, error: 'Product not found' };
      }

      const currentStock = product.data.current_stock || 0;
      const newStock = currentStock + quantity;

      // Update stock
      await table('inventory')
        .where('id', productId)
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        });

      // Log stock movement
      await table('stock_movements').insert({
        id: uuidv4(),
        product_id: productId,
        movement_type: 'RETURN',
        quantity: quantity,
        reference_type: 'INVOICE',
        reference_id: invoiceId,
        date: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Restore stock error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * REVERSE TRANSACTION
   * Reverse ledger entries
   */
  async reverseTransaction(invoiceData) {
    try {
      const txnId = uuidv4();

      // Create reversal transaction
      await table('transactions').insert({
        id: txnId,
        txn_date: new Date().toISOString(),
        txn_type: 'SALE_RETURN',
        reference: invoiceData.invoice_no,
        description: `Cancellation of ${invoiceData.invoice_no}`,
        total_amount: -invoiceData.total_amount,
        status: 'posted',
        created_at: new Date().toISOString()
      });

      // Reverse ledger entries
      // Credit: Cash/Bank
      await table('ledger').insert({
        id: uuidv4(),
        transaction_id: txnId,
        date: new Date().toISOString(),
        account_id: 'CASH',
        description: `Return ${invoiceData.invoice_no}`,
        debit: 0,
        credit: invoiceData.total_amount,
        created_at: new Date().toISOString()
      });

      // Debit: Sales
      await table('ledger').insert({
        id: uuidv4(),
        transaction_id: txnId,
        date: new Date().toISOString(),
        account_id: 'SALES',
        description: `Return ${invoiceData.invoice_no}`,
        debit: invoiceData.subtotal || invoiceData.total_amount,
        credit: 0,
        created_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Reverse transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ADJUST PAYMENT
   * Adjust cash/UPI on partial return
   */
  async adjustPayment(invoiceData, refundAmount) {
    try {
      // Create refund record
      await table('refunds').insert({
        id: uuidv4(),
        invoice_id: invoiceData.id,
        amount: refundAmount,
        payment_mode: invoiceData.payment_mode,
        refund_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Adjust payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET RETURN HISTORY
   */
  async getReturnHistory(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await table('returns')
        .where('return_date', '>=', cutoffDate.toISOString())
        .orderBy('return_date', 'DESC')
        .get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch history' };
      }

      return {
        success: true,
        returns: result.data
      };
    } catch (error) {
      console.error('Get return history error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const returnsEngine = new ReturnsEngine();

export default returnsEngine;
export { ReturnsEngine };
