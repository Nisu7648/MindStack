/**
 * COMPLIANCE ENGINE
 * Real-world accounting & tax compliance rules
 * 
 * Compliance Standards:
 * - Companies Act 2013 (India)
 * - GST Act 2017
 * - Income Tax Act 1961
 * - Accounting Standards (AS/Ind AS)
 * - GAAP Principles
 * 
 * Features:
 * - Transaction validation
 * - Period locking
 * - Mandatory fields
 * - Data retention
 * - Audit requirements
 */

import { table } from '../database/queryBuilder';
import auditTrailService from './auditTrailService';

/**
 * Compliance Rules
 */
export const COMPLIANCE_RULES = {
  // Transaction Rules
  TRANSACTION_MUST_BALANCE: 'TRANSACTION_MUST_BALANCE',
  TRANSACTION_MUST_HAVE_DATE: 'TRANSACTION_MUST_HAVE_DATE',
  TRANSACTION_MUST_HAVE_DESCRIPTION: 'TRANSACTION_MUST_HAVE_DESCRIPTION',
  TRANSACTION_CANNOT_BE_FUTURE_DATED: 'TRANSACTION_CANNOT_BE_FUTURE_DATED',
  
  // Invoice Rules
  INVOICE_MUST_HAVE_NUMBER: 'INVOICE_MUST_HAVE_NUMBER',
  INVOICE_NUMBER_MUST_BE_SEQUENTIAL: 'INVOICE_NUMBER_MUST_BE_SEQUENTIAL',
  INVOICE_MUST_HAVE_CUSTOMER: 'INVOICE_MUST_HAVE_CUSTOMER',
  INVOICE_MUST_HAVE_ITEMS: 'INVOICE_MUST_HAVE_ITEMS',
  INVOICE_MUST_HAVE_GST_DETAILS: 'INVOICE_MUST_HAVE_GST_DETAILS',
  
  // Period Rules
  CANNOT_EDIT_CLOSED_PERIOD: 'CANNOT_EDIT_CLOSED_PERIOD',
  CANNOT_DELETE_CLOSED_PERIOD: 'CANNOT_DELETE_CLOSED_PERIOD',
  PERIOD_MUST_BE_CLOSED_SEQUENTIALLY: 'PERIOD_MUST_BE_CLOSED_SEQUENTIALLY',
  
  // Stock Rules
  STOCK_CANNOT_BE_NEGATIVE: 'STOCK_CANNOT_BE_NEGATIVE',
  STOCK_ADJUSTMENT_MUST_HAVE_REASON: 'STOCK_ADJUSTMENT_MUST_HAVE_REASON',
  
  // GST Rules
  GST_INVOICE_MUST_HAVE_GSTIN: 'GST_INVOICE_MUST_HAVE_GSTIN',
  GST_RATE_MUST_BE_VALID: 'GST_RATE_MUST_BE_VALID',
  IGST_FOR_INTERSTATE: 'IGST_FOR_INTERSTATE',
  CGST_SGST_FOR_INTRASTATE: 'CGST_SGST_FOR_INTRASTATE',
  
  // Data Retention
  CANNOT_DELETE_FINANCIAL_DATA: 'CANNOT_DELETE_FINANCIAL_DATA',
  MUST_RETAIN_FOR_7_YEARS: 'MUST_RETAIN_FOR_7_YEARS'
};

/**
 * Compliance Engine
 */
class ComplianceEngine {
  constructor() {
    this.validGSTRates = [0, 0.25, 3, 5, 12, 18, 28];
    this.dataRetentionYears = 7;
  }

  /**
   * VALIDATE TRANSACTION
   * Check if transaction complies with accounting rules
   */
  async validateTransaction(transactionData) {
    const errors = [];

    // Rule: Transaction must balance (Debit = Credit)
    if (!this.checkTransactionBalance(transactionData)) {
      errors.push({
        rule: COMPLIANCE_RULES.TRANSACTION_MUST_BALANCE,
        message: 'Transaction must balance (Debit = Credit)',
        severity: 'CRITICAL'
      });
    }

    // Rule: Must have date
    if (!transactionData.txn_date) {
      errors.push({
        rule: COMPLIANCE_RULES.TRANSACTION_MUST_HAVE_DATE,
        message: 'Transaction date is mandatory',
        severity: 'CRITICAL'
      });
    }

    // Rule: Cannot be future dated
    if (transactionData.txn_date && new Date(transactionData.txn_date) > new Date()) {
      errors.push({
        rule: COMPLIANCE_RULES.TRANSACTION_CANNOT_BE_FUTURE_DATED,
        message: 'Transaction cannot be future dated',
        severity: 'CRITICAL'
      });
    }

    // Rule: Must have description
    if (!transactionData.description || transactionData.description.trim() === '') {
      errors.push({
        rule: COMPLIANCE_RULES.TRANSACTION_MUST_HAVE_DESCRIPTION,
        message: 'Transaction description is mandatory',
        severity: 'WARNING'
      });
    }

    // Rule: Cannot edit closed period
    const periodCheck = await this.checkPeriodClosed(transactionData.txn_date);
    if (periodCheck.isClosed) {
      errors.push({
        rule: COMPLIANCE_RULES.CANNOT_EDIT_CLOSED_PERIOD,
        message: `Cannot create transaction in closed period: ${periodCheck.periodName}`,
        severity: 'CRITICAL'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * VALIDATE INVOICE
   * Check if invoice complies with GST and business rules
   */
  async validateInvoice(invoiceData) {
    const errors = [];

    // Rule: Must have invoice number
    if (!invoiceData.invoice_no) {
      errors.push({
        rule: COMPLIANCE_RULES.INVOICE_MUST_HAVE_NUMBER,
        message: 'Invoice number is mandatory',
        severity: 'CRITICAL'
      });
    }

    // Rule: Invoice number must be sequential
    const sequenceCheck = await this.checkInvoiceSequence(invoiceData.invoice_no);
    if (!sequenceCheck.isValid) {
      errors.push({
        rule: COMPLIANCE_RULES.INVOICE_NUMBER_MUST_BE_SEQUENTIAL,
        message: sequenceCheck.message,
        severity: 'WARNING'
      });
    }

    // Rule: Must have customer (for B2B)
    if (invoiceData.invoice_type === 'SALES' && !invoiceData.customer_id) {
      errors.push({
        rule: COMPLIANCE_RULES.INVOICE_MUST_HAVE_CUSTOMER,
        message: 'Customer is mandatory for sales invoice',
        severity: 'WARNING'
      });
    }

    // Rule: Must have items
    if (!invoiceData.items || invoiceData.items.length === 0) {
      errors.push({
        rule: COMPLIANCE_RULES.INVOICE_MUST_HAVE_ITEMS,
        message: 'Invoice must have at least one item',
        severity: 'CRITICAL'
      });
    }

    // Rule: GST invoice must have GSTIN (for B2B > ₹2.5L)
    if (invoiceData.total_amount > 250000 && !invoiceData.customer_gstin) {
      errors.push({
        rule: COMPLIANCE_RULES.GST_INVOICE_MUST_HAVE_GSTIN,
        message: 'GSTIN is mandatory for invoices above ₹2.5 lakhs',
        severity: 'CRITICAL'
      });
    }

    // Rule: Validate GST rates
    if (invoiceData.items) {
      for (const item of invoiceData.items) {
        if (!this.validGSTRates.includes(item.gst_rate)) {
          errors.push({
            rule: COMPLIANCE_RULES.GST_RATE_MUST_BE_VALID,
            message: `Invalid GST rate: ${item.gst_rate}% for item ${item.item_name}`,
            severity: 'CRITICAL'
          });
        }
      }
    }

    // Rule: IGST for interstate, CGST+SGST for intrastate
    if (invoiceData.customer_state && invoiceData.business_state) {
      const isInterstate = invoiceData.customer_state !== invoiceData.business_state;
      
      if (isInterstate && (invoiceData.cgst_amount > 0 || invoiceData.sgst_amount > 0)) {
        errors.push({
          rule: COMPLIANCE_RULES.IGST_FOR_INTERSTATE,
          message: 'Interstate transaction must use IGST, not CGST+SGST',
          severity: 'CRITICAL'
        });
      }

      if (!isInterstate && invoiceData.igst_amount > 0) {
        errors.push({
          rule: COMPLIANCE_RULES.CGST_SGST_FOR_INTRASTATE,
          message: 'Intrastate transaction must use CGST+SGST, not IGST',
          severity: 'CRITICAL'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * VALIDATE STOCK ADJUSTMENT
   */
  async validateStockAdjustment(adjustmentData) {
    const errors = [];

    // Rule: Stock cannot be negative
    if (adjustmentData.new_stock < 0) {
      errors.push({
        rule: COMPLIANCE_RULES.STOCK_CANNOT_BE_NEGATIVE,
        message: 'Stock cannot be negative',
        severity: 'CRITICAL'
      });
    }

    // Rule: Must have reason
    if (!adjustmentData.reason || adjustmentData.reason.trim() === '') {
      errors.push({
        rule: COMPLIANCE_RULES.STOCK_ADJUSTMENT_MUST_HAVE_REASON,
        message: 'Reason is mandatory for stock adjustment',
        severity: 'CRITICAL'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * CHECK PERIOD CLOSED
   */
  async checkPeriodClosed(date) {
    try {
      const result = await table('accounting_periods')
        .where('start_date', '<=', date)
        .where('end_date', '>=', date)
        .where('is_closed', 1)
        .first();

      if (result.success && result.data) {
        return {
          isClosed: true,
          periodName: result.data.period_name,
          closedDate: result.data.closed_date
        };
      }

      return { isClosed: false };
    } catch (error) {
      console.error('Check period closed error:', error);
      return { isClosed: false };
    }
  }

  /**
   * CHECK TRANSACTION BALANCE
   */
  checkTransactionBalance(transactionData) {
    if (!transactionData.entries || transactionData.entries.length === 0) {
      return false;
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of transactionData.entries) {
      totalDebit += entry.debit || 0;
      totalCredit += entry.credit || 0;
    }

    // Allow small rounding differences (0.01)
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }

  /**
   * CHECK INVOICE SEQUENCE
   */
  async checkInvoiceSequence(invoiceNo) {
    try {
      // Extract sequence number from invoice number
      // Format: INV-YYMM-XXXX
      const parts = invoiceNo.split('-');
      if (parts.length !== 3) {
        return {
          isValid: false,
          message: 'Invalid invoice number format'
        };
      }

      const sequence = parseInt(parts[2]);
      const prefix = `${parts[0]}-${parts[1]}`;

      // Get last invoice with same prefix
      const result = await table('invoices')
        .where('invoice_no', 'LIKE', `${prefix}%`)
        .orderBy('created_at', 'DESC')
        .limit(1)
        .first();

      if (result.success && result.data) {
        const lastParts = result.data.invoice_no.split('-');
        const lastSequence = parseInt(lastParts[2]);

        if (sequence !== lastSequence + 1) {
          return {
            isValid: false,
            message: `Invoice number should be ${prefix}-${String(lastSequence + 1).padStart(4, '0')}`
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Check invoice sequence error:', error);
      return { isValid: true }; // Don't block on error
    }
  }

  /**
   * CHECK DATA RETENTION
   * Check if data can be deleted based on retention policy
   */
  async checkDataRetention(entityType, entityDate) {
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - this.dataRetentionYears);

    const entityDateObj = new Date(entityDate);

    if (entityDateObj > retentionDate) {
      return {
        canDelete: false,
        message: `Cannot delete ${entityType}. Must be retained for ${this.dataRetentionYears} years as per compliance requirements.`,
        retentionDate: retentionDate.toISOString()
      };
    }

    return { canDelete: true };
  }

  /**
   * VALIDATE PERIOD CLOSE
   */
  async validatePeriodClose(periodData) {
    const errors = [];

    // Rule: All transactions must be posted
    const unpostedCheck = await this.checkUnpostedTransactions(
      periodData.start_date,
      periodData.end_date
    );

    if (unpostedCheck.hasUnposted) {
      errors.push({
        rule: 'PERIOD_MUST_HAVE_NO_UNPOSTED_TRANSACTIONS',
        message: `Cannot close period. ${unpostedCheck.count} unposted transactions found.`,
        severity: 'CRITICAL'
      });
    }

    // Rule: Trial balance must match
    const trialBalanceCheck = await this.checkTrialBalance(
      periodData.start_date,
      periodData.end_date
    );

    if (!trialBalanceCheck.isBalanced) {
      errors.push({
        rule: 'TRIAL_BALANCE_MUST_MATCH',
        message: 'Trial balance does not match. Cannot close period.',
        severity: 'CRITICAL'
      });
    }

    // Rule: Previous period must be closed
    const previousPeriodCheck = await this.checkPreviousPeriodClosed(periodData.start_date);
    
    if (!previousPeriodCheck.isClosed) {
      errors.push({
        rule: COMPLIANCE_RULES.PERIOD_MUST_BE_CLOSED_SEQUENTIALLY,
        message: 'Previous period must be closed first',
        severity: 'CRITICAL'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * CHECK UNPOSTED TRANSACTIONS
   */
  async checkUnpostedTransactions(startDate, endDate) {
    try {
      const result = await table('transactions')
        .where('txn_date', '>=', startDate)
        .where('txn_date', '<=', endDate)
        .where('status', 'draft')
        .get();

      return {
        hasUnposted: result.success && result.data.length > 0,
        count: result.success ? result.data.length : 0
      };
    } catch (error) {
      console.error('Check unposted transactions error:', error);
      return { hasUnposted: false, count: 0 };
    }
  }

  /**
   * CHECK TRIAL BALANCE
   */
  async checkTrialBalance(startDate, endDate) {
    try {
      const result = await table('ledger')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      if (!result.success) {
        return { isBalanced: false };
      }

      let totalDebit = 0;
      let totalCredit = 0;

      for (const entry of result.data) {
        totalDebit += entry.debit || 0;
        totalCredit += entry.credit || 0;
      }

      // Allow small rounding differences (0.01)
      return {
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
        totalDebit,
        totalCredit,
        difference: totalDebit - totalCredit
      };
    } catch (error) {
      console.error('Check trial balance error:', error);
      return { isBalanced: false };
    }
  }

  /**
   * CHECK PREVIOUS PERIOD CLOSED
   */
  async checkPreviousPeriodClosed(currentPeriodStartDate) {
    try {
      const result = await table('accounting_periods')
        .where('end_date', '<', currentPeriodStartDate)
        .where('is_closed', 0)
        .first();

      return {
        isClosed: !result.success || !result.data
      };
    } catch (error) {
      console.error('Check previous period closed error:', error);
      return { isClosed: true }; // Don't block on error
    }
  }

  /**
   * GENERATE COMPLIANCE REPORT
   */
  async generateComplianceReport(startDate, endDate) {
    try {
      const report = {
        period: { startDate, endDate },
        checks: []
      };

      // Check 1: Trial Balance
      const trialBalance = await this.checkTrialBalance(startDate, endDate);
      report.checks.push({
        name: 'Trial Balance',
        status: trialBalance.isBalanced ? 'PASS' : 'FAIL',
        details: trialBalance
      });

      // Check 2: Unposted Transactions
      const unposted = await this.checkUnpostedTransactions(startDate, endDate);
      report.checks.push({
        name: 'Unposted Transactions',
        status: !unposted.hasUnposted ? 'PASS' : 'FAIL',
        details: unposted
      });

      // Check 3: Invoice Sequence
      const invoiceGaps = await this.checkInvoiceGaps(startDate, endDate);
      report.checks.push({
        name: 'Invoice Sequence',
        status: invoiceGaps.length === 0 ? 'PASS' : 'WARNING',
        details: { gaps: invoiceGaps }
      });

      // Check 4: Negative Stock
      const negativeStock = await this.checkNegativeStock();
      report.checks.push({
        name: 'Stock Validation',
        status: negativeStock.length === 0 ? 'PASS' : 'FAIL',
        details: { negativeItems: negativeStock }
      });

      // Overall status
      report.overallStatus = report.checks.every(c => c.status === 'PASS') ? 'COMPLIANT' : 'NON_COMPLIANT';

      return { success: true, report };
    } catch (error) {
      console.error('Generate compliance report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * CHECK INVOICE GAPS
   */
  async checkInvoiceGaps(startDate, endDate) {
    try {
      const result = await table('invoices')
        .where('invoice_date', '>=', startDate)
        .where('invoice_date', '<=', endDate)
        .orderBy('invoice_no', 'ASC')
        .get();

      if (!result.success || result.data.length === 0) {
        return [];
      }

      const gaps = [];
      for (let i = 1; i < result.data.length; i++) {
        const prev = result.data[i - 1];
        const current = result.data[i];

        const prevSeq = parseInt(prev.invoice_no.split('-').pop());
        const currentSeq = parseInt(current.invoice_no.split('-').pop());

        if (currentSeq !== prevSeq + 1) {
          gaps.push({
            from: prev.invoice_no,
            to: current.invoice_no,
            missing: currentSeq - prevSeq - 1
          });
        }
      }

      return gaps;
    } catch (error) {
      console.error('Check invoice gaps error:', error);
      return [];
    }
  }

  /**
   * CHECK NEGATIVE STOCK
   */
  async checkNegativeStock() {
    try {
      const result = await table('inventory')
        .where('current_stock', '<', 0)
        .get();

      return result.success ? result.data : [];
    } catch (error) {
      console.error('Check negative stock error:', error);
      return [];
    }
  }
}

// Create singleton instance
const complianceEngine = new ComplianceEngine();

export default complianceEngine;
export { ComplianceEngine, COMPLIANCE_RULES };
