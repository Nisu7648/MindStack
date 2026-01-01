/**
 * BUSINESS QUERY INTEGRATION SERVICE
 * Connects Business Query Engine to MindStack database
 * Executes queries and returns business metrics
 */

import businessQueryEngine, { QUERY_TYPES } from './businessQueryEngine';
import { getDatabase } from '../database/schema';

/**
 * Business Query Integration Service
 */
class BusinessQueryIntegration {
  constructor() {
    this.queryHistory = [];
  }

  /**
   * Process business query
   */
  async processQuery(query, userId = null) {
    try {
      // Parse query with engine
      const parsed = await businessQueryEngine.processQuery(query, userId);

      // Execute database query
      const answer = await this.executeQuery(parsed, userId);

      // Update parsed result with actual answer
      parsed.numeric_answer = answer.value;
      parsed.formatted_answer = answer.formatted;
      parsed.details = answer.details;

      // Regenerate spoken answer with actual data
      parsed.spoken_answer = businessQueryEngine.generateSpokenAnswer(
        parsed.query_type,
        answer,
        parsed.detected_language,
        parsed.time_period
      );

      // Store in history
      this.queryHistory.push({
        query: query,
        parsed: parsed,
        timestamp: new Date().toISOString()
      });

      return parsed;

    } catch (error) {
      return {
        status: 'ERROR',
        original_question: query,
        error: error.message,
        confidence: 'LOW'
      };
    }
  }

  /**
   * Execute database query based on type
   */
  async executeQuery(parsed, userId) {
    const { query_type, dateRange, entity } = parsed;

    switch (query_type) {
      case QUERY_TYPES.CASH_BALANCE:
        return this.getCashBalance(userId);

      case QUERY_TYPES.BANK_BALANCE:
        return this.getBankBalance(userId);

      case QUERY_TYPES.TOTAL_SALES:
        return this.getTotalSales(dateRange, userId);

      case QUERY_TYPES.TOTAL_EXPENSES:
        return this.getTotalExpenses(dateRange, userId);

      case QUERY_TYPES.PROFIT_OR_LOSS:
        return this.getProfitOrLoss(dateRange, userId);

      case QUERY_TYPES.GST_PAYABLE:
        return this.getGSTPayable(dateRange, userId);

      case QUERY_TYPES.GST_RECEIVABLE:
        return this.getGSTReceivable(dateRange, userId);

      case QUERY_TYPES.CUSTOMER_OUTSTANDING:
        return this.getCustomerOutstanding(entity, userId);

      case QUERY_TYPES.SUPPLIER_PAYABLE:
        return this.getSupplierPayable(entity, userId);

      case QUERY_TYPES.BUSINESS_SUMMARY:
        return this.getBusinessSummary(dateRange, userId);

      default:
        throw new Error('Unknown query type');
    }
  }

  /**
   * Get cash balance
   */
  async getCashBalance(userId) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(CASE WHEN debit > 0 THEN debit ELSE -credit END) as balance
       FROM ledger
       WHERE account_name = 'Cash'
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [userId] : []
    );

    const balance = result.rows.item(0).balance || 0;

    return {
      value: balance,
      formatted: this.formatCurrency(balance),
      details: {
        account: 'Cash',
        balance: balance
      }
    };
  }

  /**
   * Get bank balance
   */
  async getBankBalance(userId) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(CASE WHEN debit > 0 THEN debit ELSE -credit END) as balance
       FROM ledger
       WHERE account_name = 'Bank'
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [userId] : []
    );

    const balance = result.rows.item(0).balance || 0;

    return {
      value: balance,
      formatted: this.formatCurrency(balance),
      details: {
        account: 'Bank',
        balance: balance
      }
    };
  }

  /**
   * Get total sales
   */
  async getTotalSales(dateRange, userId) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(credit) as total_sales
       FROM ledger
       WHERE account_name = 'Sales'
       AND date >= ? AND date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const sales = result.rows.item(0).total_sales || 0;

    // Get transaction count
    const countResult = await db.executeSql(
      `SELECT COUNT(DISTINCT transaction_id) as count
       FROM ledger
       WHERE account_name = 'Sales'
       AND date >= ? AND date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const count = countResult.rows.item(0).count || 0;

    return {
      value: sales,
      formatted: this.formatCurrency(sales),
      details: {
        totalSales: sales,
        transactionCount: count,
        averagePerTransaction: count > 0 ? sales / count : 0
      }
    };
  }

  /**
   * Get total expenses
   */
  async getTotalExpenses(dateRange, userId) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(debit) as total_expenses
       FROM ledger
       WHERE account_type = 'NOMINAL'
       AND account_name LIKE '%Expense%'
       AND date >= ? AND date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const expenses = result.rows.item(0).total_expenses || 0;

    // Get breakdown by category
    const breakdownResult = await db.executeSql(
      `SELECT 
        account_name,
        SUM(debit) as amount
       FROM ledger
       WHERE account_type = 'NOMINAL'
       AND account_name LIKE '%Expense%'
       AND date >= ? AND date <= ?
       ${userId ? 'AND user_id = ?' : ''}
       GROUP BY account_name
       ORDER BY amount DESC
       LIMIT 5`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const breakdown = [];
    for (let i = 0; i < breakdownResult.rows.length; i++) {
      breakdown.push(breakdownResult.rows.item(i));
    }

    return {
      value: expenses,
      formatted: this.formatCurrency(expenses),
      details: {
        totalExpenses: expenses,
        topExpenses: breakdown
      }
    };
  }

  /**
   * Get profit or loss
   */
  async getProfitOrLoss(dateRange, userId) {
    const db = await getDatabase();

    // Get total income
    const incomeResult = await db.executeSql(
      `SELECT 
        SUM(credit) as total_income
       FROM ledger
       WHERE account_type = 'NOMINAL'
       AND (account_name = 'Sales' OR account_name LIKE '%Income%')
       AND date >= ? AND date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const income = incomeResult.rows.item(0).total_income || 0;

    // Get total expenses
    const expenseResult = await db.executeSql(
      `SELECT 
        SUM(debit) as total_expenses
       FROM ledger
       WHERE account_type = 'NOMINAL'
       AND account_name LIKE '%Expense%'
       AND date >= ? AND date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const expenses = expenseResult.rows.item(0).total_expenses || 0;

    const profitOrLoss = income - expenses;

    return {
      value: profitOrLoss,
      formatted: this.formatCurrency(Math.abs(profitOrLoss)),
      details: {
        income: income,
        expenses: expenses,
        profitOrLoss: profitOrLoss,
        isProfitable: profitOrLoss >= 0,
        margin: income > 0 ? (profitOrLoss / income) * 100 : 0
      }
    };
  }

  /**
   * Get GST payable
   */
  async getGSTPayable(dateRange, userId) {
    const db = await getDatabase();

    // Get output GST (sales)
    const outputResult = await db.executeSql(
      `SELECT 
        SUM(cgst_amount + sgst_amount + igst_amount) as output_gst
       FROM gst_transactions
       WHERE transaction_type = 'OUTPUT'
       AND transaction_date >= ? AND transaction_date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const outputGST = outputResult.rows.item(0).output_gst || 0;

    // Get input GST (purchases)
    const inputResult = await db.executeSql(
      `SELECT 
        SUM(cgst_amount + sgst_amount + igst_amount) as input_gst
       FROM gst_transactions
       WHERE transaction_type = 'INPUT'
       AND transaction_date >= ? AND transaction_date <= ?
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const inputGST = inputResult.rows.item(0).input_gst || 0;

    const gstPayable = Math.max(0, outputGST - inputGST);

    return {
      value: gstPayable,
      formatted: this.formatCurrency(gstPayable),
      details: {
        outputGST: outputGST,
        inputGST: inputGST,
        netPayable: gstPayable
      }
    };
  }

  /**
   * Get GST receivable (ITC)
   */
  async getGSTReceivable(dateRange, userId) {
    const db = await getDatabase();

    const result = await db.executeSql(
      `SELECT 
        SUM(cgst_amount + sgst_amount + igst_amount) as itc_available
       FROM itc_ledger
       WHERE transaction_date >= ? AND transaction_date <= ?
       AND is_claimed = 0
       ${userId ? 'AND user_id = ?' : ''}`,
      userId ? [dateRange.fromDate, dateRange.toDate, userId] : 
               [dateRange.fromDate, dateRange.toDate]
    );

    const itc = result.rows.item(0).itc_available || 0;

    return {
      value: itc,
      formatted: this.formatCurrency(itc),
      details: {
        itcAvailable: itc
      }
    };
  }

  /**
   * Get customer outstanding
   */
  async getCustomerOutstanding(customerName, userId) {
    const db = await getDatabase();

    let query = `
      SELECT 
        account_name,
        SUM(CASE WHEN debit > 0 THEN debit ELSE -credit END) as balance
      FROM ledger
      WHERE account_type = 'PERSONAL'
      AND (account_name LIKE '%Debtor%' OR account_name LIKE '%Customer%'
    `;

    const params = [];

    if (customerName) {
      query += ` OR account_name LIKE ?)`;
      params.push(`%${customerName}%`);
    } else {
      query += `)`;
    }

    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }

    query += ` GROUP BY account_name HAVING balance > 0 ORDER BY balance DESC`;

    const result = await db.executeSql(query, params);

    const customers = [];
    let totalOutstanding = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      customers.push(row);
      totalOutstanding += row.balance;
    }

    return {
      value: totalOutstanding,
      formatted: this.formatCurrency(totalOutstanding),
      details: {
        totalOutstanding: totalOutstanding,
        customerCount: customers.length,
        customers: customers
      }
    };
  }

  /**
   * Get supplier payable
   */
  async getSupplierPayable(supplierName, userId) {
    const db = await getDatabase();

    let query = `
      SELECT 
        account_name,
        SUM(CASE WHEN credit > 0 THEN credit ELSE -debit END) as balance
      FROM ledger
      WHERE account_type = 'PERSONAL'
      AND (account_name LIKE '%Creditor%' OR account_name LIKE '%Supplier%'
    `;

    const params = [];

    if (supplierName) {
      query += ` OR account_name LIKE ?)`;
      params.push(`%${supplierName}%`);
    } else {
      query += `)`;
    }

    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }

    query += ` GROUP BY account_name HAVING balance > 0 ORDER BY balance DESC`;

    const result = await db.executeSql(query, params);

    const suppliers = [];
    let totalPayable = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      suppliers.push(row);
      totalPayable += row.balance;
    }

    return {
      value: totalPayable,
      formatted: this.formatCurrency(totalPayable),
      details: {
        totalPayable: totalPayable,
        supplierCount: suppliers.length,
        suppliers: suppliers
      }
    };
  }

  /**
   * Get business summary
   */
  async getBusinessSummary(dateRange, userId) {
    // Get all metrics
    const cash = await this.getCashBalance(userId);
    const bank = await this.getBankBalance(userId);
    const sales = await this.getTotalSales(dateRange, userId);
    const expenses = await this.getTotalExpenses(dateRange, userId);
    const profit = await this.getProfitOrLoss(dateRange, userId);
    const gstPayable = await this.getGSTPayable(dateRange, userId);
    const customerOutstanding = await this.getCustomerOutstanding(null, userId);
    const supplierPayable = await this.getSupplierPayable(null, userId);

    const summary = {
      cash: cash.value,
      bank: bank.value,
      totalLiquidity: cash.value + bank.value,
      sales: sales.value,
      expenses: expenses.value,
      profit: profit.value,
      gstPayable: gstPayable.value,
      customerOutstanding: customerOutstanding.value,
      supplierPayable: supplierPayable.value,
      netPosition: cash.value + bank.value + customerOutstanding.value - supplierPayable.value
    };

    return {
      value: summary.netPosition,
      formatted: this.formatCurrency(summary.netPosition),
      details: summary
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount) {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(absAmount);

    return amount < 0 ? `-${formatted}` : formatted;
  }

  /**
   * Get query history
   */
  getQueryHistory(limit = 10) {
    return this.queryHistory.slice(-limit);
  }

  /**
   * Clear query history
   */
  clearQueryHistory() {
    this.queryHistory = [];
  }
}

// Create singleton instance
const businessQueryIntegration = new BusinessQueryIntegration();

export default businessQueryIntegration;
export { BusinessQueryIntegration };
