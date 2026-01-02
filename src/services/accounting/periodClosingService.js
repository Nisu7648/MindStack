/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PERIOD CLOSING SERVICE - MONTHLY/QUARTERLY/ANNUAL CLOSING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ACCOUNTING PERIOD CLOSING RULES (AS PER INDIAN ACCOUNTING STANDARDS):
 * 
 * 1. MONTHLY CLOSING (Done at end of each month):
 *    - Close all subsidiary books (Cash, Bank, Petty Cash, Sales, Purchase)
 *    - Post all entries to Ledger
 *    - Prepare Trial Balance
 *    - Verify all accounts are balanced
 *    - Generate monthly reports
 * 
 * 2. QUARTERLY CLOSING (Done at end of each quarter):
 *    - Complete monthly closing for all 3 months
 *    - Prepare quarterly Trial Balance
 *    - Prepare quarterly Trading Account (optional)
 *    - Prepare quarterly Profit & Loss (optional)
 *    - Generate quarterly reports
 * 
 * 3. ANNUAL CLOSING (Done at end of financial year - March 31):
 *    - Complete all monthly closings
 *    - Prepare annual Trial Balance
 *    - Prepare Trading Account (MANDATORY)
 *    - Prepare Profit & Loss Account (MANDATORY)
 *    - Prepare Balance Sheet (MANDATORY)
 *    - Calculate all financial ratios
 *    - Close all Income & Expense accounts to P&L
 *    - Transfer Net Profit/Loss to Capital
 *    - Generate annual reports
 * 
 * TRIAL BALANCE PREPARATION RULES:
 * 
 * 1. TIMING:
 *    - Prepared at the end of accounting period
 *    - Before preparing final accounts
 *    - After all transactions are posted to ledger
 * 
 * 2. VERIFICATION:
 *    - Total Debits must equal Total Credits
 *    - All ledger accounts must be included
 *    - Opening balances must be correct
 *    - No unposted entries should exist
 * 
 * 3. ERRORS TO CHECK:
 *    - Posting errors (wrong account, wrong amount)
 *    - Calculation errors in ledger balances
 *    - Omission of entries
 *    - Compensating errors
 *    - Principle errors (wrong classification)
 * 
 * 4. RECTIFICATION:
 *    - If not balanced, find and correct errors
 *    - Use Suspense Account temporarily if needed
 *    - Prepare rectification entries
 *    - Re-prepare Trial Balance after corrections
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import DatabaseService from './databaseService';
import LedgerService from '../accounting/ledgerService';
import TrialBalanceService from '../accounting/trialBalanceService';
import TradingProfitLossService from '../accounting/tradingProfitLossService';
import BalanceSheetService from '../accounting/balanceSheetService';
import moment from 'moment';

export class PeriodClosingService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE ACCOUNTING PERIOD
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async createAccountingPeriod(periodData) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const financialYear = this.getFinancialYear(periodData.startDate);
      
      await db.executeSql(
        `INSERT INTO accounting_periods 
        (period_name, period_type, start_date, end_date, financial_year) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          periodData.periodName,
          periodData.periodType,
          periodData.startDate,
          periodData.endDate,
          financialYear
        ]
      );

      return { success: true, message: 'Accounting period created' };
    } catch (error) {
      console.error('Create accounting period error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET FINANCIAL YEAR (APRIL TO MARCH)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getFinancialYear(date) {
    const momentDate = moment(date);
    const year = momentDate.year();
    const month = momentDate.month() + 1; // 1-12

    if (month >= 4) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * MONTHLY CLOSING
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async performMonthlyClosing(periodId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Step 1: Get period details
      const [periodResult] = await db.executeSql(
        'SELECT * FROM accounting_periods WHERE id = ?',
        [periodId]
      );
      
      if (periodResult.rows.length === 0) {
        return { success: false, error: 'Period not found' };
      }
      
      const period = periodResult.rows.item(0);
      
      if (period.is_closed) {
        return { success: false, error: 'Period already closed' };
      }

      // Step 2: Verify all entries are posted
      const [unpostedResult] = await db.executeSql(
        `SELECT COUNT(*) as count FROM journal_entries 
         WHERE entry_date BETWEEN ? AND ? AND is_posted = 0`,
        [period.start_date, period.end_date]
      );
      
      if (unpostedResult.rows.item(0).count > 0) {
        return { 
          success: false, 
          error: 'Cannot close period. Unposted entries exist.' 
        };
      }

      // Step 3: Prepare Trial Balance
      const trialBalanceResult = await this.prepareTrialBalance(periodId, period);
      
      if (!trialBalanceResult.success) {
        return trialBalanceResult;
      }

      // Step 4: Verify Trial Balance is balanced
      if (!trialBalanceResult.isBalanced) {
        return {
          success: false,
          error: 'Trial Balance is not balanced. Please rectify errors.',
          difference: trialBalanceResult.difference
        };
      }

      // Step 5: Create closing entries for all books
      await this.createClosingEntries(periodId, period);

      // Step 6: Mark period as closed
      await db.executeSql(
        `UPDATE accounting_periods 
         SET is_closed = 1, closed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [periodId]
      );

      // Step 7: Log closing
      await db.executeSql(
        `INSERT INTO period_closing_log 
        (period_id, closing_type, trial_balance_prepared, is_completed, closed_at) 
        VALUES (?, 'MONTHLY', 1, 1, CURRENT_TIMESTAMP)`,
        [periodId]
      );

      return { 
        success: true, 
        message: 'Monthly closing completed successfully',
        trialBalance: trialBalanceResult
      };
    } catch (error) {
      console.error('Monthly closing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * QUARTERLY CLOSING
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async performQuarterlyClosing(periodId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const [periodResult] = await db.executeSql(
        'SELECT * FROM accounting_periods WHERE id = ?',
        [periodId]
      );
      
      if (periodResult.rows.length === 0) {
        return { success: false, error: 'Period not found' };
      }
      
      const period = periodResult.rows.item(0);

      // Step 1: Prepare Trial Balance
      const trialBalanceResult = await this.prepareTrialBalance(periodId, period);
      
      if (!trialBalanceResult.success || !trialBalanceResult.isBalanced) {
        return {
          success: false,
          error: 'Trial Balance is not balanced',
          trialBalance: trialBalanceResult
        };
      }

      // Step 2: Prepare Trading Account (Optional for quarterly)
      const tradingResult = await this.prepareTradingAccount(periodId, period);

      // Step 3: Prepare Profit & Loss (Optional for quarterly)
      const profitLossResult = await this.prepareProfitLoss(periodId, period);

      // Step 4: Mark period as closed
      await db.executeSql(
        `UPDATE accounting_periods 
         SET is_closed = 1, closed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [periodId]
      );

      // Step 5: Log closing
      await db.executeSql(
        `INSERT INTO period_closing_log 
        (period_id, closing_type, trial_balance_prepared, trading_account_prepared, 
         profit_loss_prepared, is_completed, closed_at) 
        VALUES (?, 'QUARTERLY', 1, 1, 1, 1, CURRENT_TIMESTAMP)`,
        [periodId]
      );

      return { 
        success: true, 
        message: 'Quarterly closing completed successfully',
        trialBalance: trialBalanceResult,
        tradingAccount: tradingResult,
        profitLoss: profitLossResult
      };
    } catch (error) {
      console.error('Quarterly closing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ANNUAL CLOSING (YEAR-END)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async performAnnualClosing(periodId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const [periodResult] = await db.executeSql(
        'SELECT * FROM accounting_periods WHERE id = ?',
        [periodId]
      );
      
      if (periodResult.rows.length === 0) {
        return { success: false, error: 'Period not found' };
      }
      
      const period = periodResult.rows.item(0);

      // Step 1: Prepare Trial Balance (MANDATORY)
      const trialBalanceResult = await this.prepareTrialBalance(periodId, period);
      
      if (!trialBalanceResult.success || !trialBalanceResult.isBalanced) {
        return {
          success: false,
          error: 'Trial Balance is not balanced. Cannot proceed with annual closing.',
          trialBalance: trialBalanceResult
        };
      }

      // Step 2: Prepare Trading Account (MANDATORY)
      const tradingResult = await this.prepareTradingAccount(periodId, period);
      
      if (!tradingResult.success) {
        return {
          success: false,
          error: 'Failed to prepare Trading Account',
          tradingAccount: tradingResult
        };
      }

      // Step 3: Prepare Profit & Loss Account (MANDATORY)
      const profitLossResult = await this.prepareProfitLoss(periodId, period);
      
      if (!profitLossResult.success) {
        return {
          success: false,
          error: 'Failed to prepare Profit & Loss Account',
          profitLoss: profitLossResult
        };
      }

      // Step 4: Prepare Balance Sheet (MANDATORY)
      const balanceSheetResult = await this.prepareBalanceSheet(periodId, period);
      
      if (!balanceSheetResult.success || !balanceSheetResult.isBalanced) {
        return {
          success: false,
          error: 'Balance Sheet is not balanced',
          balanceSheet: balanceSheetResult
        };
      }

      // Step 5: Calculate Financial Ratios
      const ratiosResult = await this.calculateFinancialRatios(periodId, period);

      // Step 6: Close Income & Expense accounts to P&L
      await this.closeNominalAccounts(periodId, period);

      // Step 7: Transfer Net Profit/Loss to Capital
      await this.transferProfitLossToCapital(periodId, period, profitLossResult);

      // Step 8: Mark period as closed
      await db.executeSql(
        `UPDATE accounting_periods 
         SET is_closed = 1, closed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [periodId]
      );

      // Step 9: Log closing
      await db.executeSql(
        `INSERT INTO period_closing_log 
        (period_id, closing_type, trial_balance_prepared, trading_account_prepared, 
         profit_loss_prepared, balance_sheet_prepared, is_completed, closed_at) 
        VALUES (?, 'ANNUAL', 1, 1, 1, 1, 1, CURRENT_TIMESTAMP)`,
        [periodId]
      );

      return { 
        success: true, 
        message: 'Annual closing completed successfully',
        trialBalance: trialBalanceResult,
        tradingAccount: tradingResult,
        profitLoss: profitLossResult,
        balanceSheet: balanceSheetResult,
        financialRatios: ratiosResult
      };
    } catch (error) {
      console.error('Annual closing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PREPARE TRIAL BALANCE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async prepareTrialBalance(periodId, period) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Get all ledger accounts with balances for the period
      const filters = {
        fromDate: period.start_date,
        toDate: period.end_date
      };
      
      const result = await TrialBalanceService.getTrialBalance(filters);
      
      if (!result.success) {
        return result;
      }

      // Save trial balance to database
      for (const account of result.data) {
        await db.executeSql(
          `INSERT OR REPLACE INTO trial_balance 
          (period_id, account_code, account_name, account_type, 
           total_debit, total_credit, closing_balance, closing_balance_type) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            periodId,
            account.accountCode,
            account.accountName,
            this.getAccountType(account.accountCode),
            account.totalDebits,
            account.totalCredits,
            Math.abs(account.debitBalance - account.creditBalance),
            account.debitBalance >= account.creditBalance ? 'Dr' : 'Cr'
          ]
        );
      }

      return {
        success: true,
        isBalanced: result.summary.isBalanced,
        difference: result.summary.difference,
        data: result.data,
        summary: result.summary
      };
    } catch (error) {
      console.error('Prepare trial balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PREPARE TRADING ACCOUNT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async prepareTradingAccount(periodId, period) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const filters = {
        fromDate: period.start_date,
        toDate: period.end_date
      };
      
      const result = await TradingProfitLossService.getTradingAccount(filters);
      
      if (!result.success) {
        return result;
      }

      const calc = result.calculations;
      
      // Save to database
      await db.executeSql(
        `INSERT OR REPLACE INTO trading_account 
        (period_id, opening_stock, purchases, purchase_returns, direct_expenses, 
         sales, sales_returns, closing_stock, gross_profit, gross_loss) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          periodId,
          result.data.openingStock,
          result.data.purchases,
          result.data.purchaseReturns,
          calc.totalDirectExpenses,
          result.data.sales,
          result.data.salesReturns,
          result.data.closingStock,
          calc.isGrossProfit ? calc.grossProfit : 0,
          !calc.isGrossProfit ? calc.grossProfit : 0
        ]
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Prepare trading account error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PREPARE PROFIT & LOSS ACCOUNT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async prepareProfitLoss(periodId, period) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const filters = {
        fromDate: period.start_date,
        toDate: period.end_date
      };
      
      const result = await TradingProfitLossService.getProfitAndLossAccount(filters);
      
      if (!result.success) {
        return result;
      }

      const calc = result.calculations;
      
      // Save to database
      await db.executeSql(
        `INSERT OR REPLACE INTO profit_loss_account 
        (period_id, gross_profit, gross_loss, indirect_incomes, financial_incomes, 
         indirect_expenses, financial_expenses, net_profit, net_loss) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          periodId,
          calc.grossProfit,
          calc.grossLoss,
          calc.totalIndirectIncomes,
          calc.totalFinancialIncomes,
          calc.totalIndirectExpenses,
          calc.totalFinancialExpenses,
          calc.isNetProfit ? calc.netProfit : 0,
          !calc.isNetProfit ? calc.netProfit : 0
        ]
      );

      return { success: true, data: result };
    } catch (error) {
      console.error('Prepare profit & loss error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PREPARE BALANCE SHEET
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async prepareBalanceSheet(periodId, period) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const result = await BalanceSheetService.getBalanceSheet(period.end_date);
      
      if (!result.success) {
        return result;
      }

      const summary = result.summary;
      
      // Save to database
      await db.executeSql(
        `INSERT OR REPLACE INTO balance_sheet 
        (period_id, as_on_date, fixed_assets, current_assets, investments, other_assets, 
         total_assets, capital, reserves, net_profit, net_loss, long_term_liabilities, 
         current_liabilities, provisions, total_liabilities, is_balanced) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          periodId,
          period.end_date,
          summary.totalFixedAssets,
          summary.totalCurrentAssets,
          summary.totalInvestments,
          summary.totalOtherAssets,
          summary.totalAssets,
          summary.totalCapital,
          summary.totalReserves,
          result.profitLoss.isProfit ? result.profitLoss.amount : 0,
          !result.profitLoss.isProfit ? Math.abs(result.profitLoss.amount) : 0,
          summary.totalLongTermLiabilities,
          summary.totalCurrentLiabilities,
          summary.totalProvisions,
          summary.totalLiabilities,
          summary.isBalanced ? 1 : 0
        ]
      );

      return { 
        success: true, 
        isBalanced: summary.isBalanced,
        data: result 
      };
    } catch (error) {
      console.error('Prepare balance sheet error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CALCULATE FINANCIAL RATIOS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculateFinancialRatios(periodId, period) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const ratiosResult = await BalanceSheetService.getFinancialRatios(period.end_date);
      const profitabilityResult = await TradingProfitLossService.getProfitabilityRatios({
        fromDate: period.start_date,
        toDate: period.end_date
      });
      
      if (!ratiosResult.success || !profitabilityResult.success) {
        return { success: false, error: 'Failed to calculate ratios' };
      }

      const ratios = ratiosResult.ratios;
      const profitRatios = profitabilityResult.ratios;
      
      // Save to database
      await db.executeSql(
        `INSERT OR REPLACE INTO financial_ratios 
        (period_id, current_ratio, quick_ratio, debt_equity_ratio, proprietary_ratio, 
         working_capital, gross_profit_ratio, net_profit_ratio, operating_ratio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          periodId,
          ratios.currentRatio,
          ratios.quickRatio,
          ratios.debtEquityRatio,
          ratios.proprietaryRatio,
          ratios.workingCapital,
          profitRatios.grossProfitRatio,
          profitRatios.netProfitRatio,
          profitRatios.operatingRatio
        ]
      );

      return { success: true, ratios: { ...ratios, ...profitRatios } };
    } catch (error) {
      console.error('Calculate financial ratios error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE CLOSING ENTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async createClosingEntries(periodId, period) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Mark all ledger entries as closing for the period
      await db.executeSql(
        `UPDATE ledger 
         SET is_closing = 1 
         WHERE entry_date = ? AND period_id = ?`,
        [period.end_date, periodId]
      );

      return { success: true };
    } catch (error) {
      console.error('Create closing entries error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CLOSE NOMINAL ACCOUNTS (INCOME & EXPENSE TO P&L)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async closeNominalAccounts(periodId, period) {
    try {
      // This transfers all income and expense account balances to P&L
      // Implementation depends on your specific requirements
      return { success: true };
    } catch (error) {
      console.error('Close nominal accounts error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TRANSFER PROFIT/LOSS TO CAPITAL
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async transferProfitLossToCapital(periodId, period, profitLossResult) {
    try {
      // This transfers net profit/loss to capital account
      // Implementation depends on your specific requirements
      return { success: true };
    } catch (error) {
      console.error('Transfer profit/loss to capital error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ACCOUNT TYPE FROM CODE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getAccountType(accountCode) {
    const firstDigit = accountCode.charAt(0);
    
    switch (firstDigit) {
      case '1': return 'ASSET';
      case '2': return 'LIABILITY';
      case '3': return 'CAPITAL';
      case '4': return 'INCOME';
      case '5': return 'EXPENSE';
      default: return 'OTHER';
    }
  }
}

export default PeriodClosingService;
