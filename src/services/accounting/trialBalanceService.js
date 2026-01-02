/**
 * TRIAL BALANCE SERVICE - COMPLETE LOGIC
 */

import StorageService from '../storage/storageService';
import LedgerService from './ledgerService';
import moment from 'moment';

export class TrialBalanceService {
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static async getTrialBalance(filters = {}) {
    try {
      const result = await LedgerService.getAllLedgerAccounts(filters);
      
      if (!result.success) return result;

      const accounts = result.data;
      const trialBalanceData = [];
      
      let totalDebitBalances = 0;
      let totalCreditBalances = 0;
      let totalDebits = 0;
      let totalCredits = 0;

      for (const account of accounts) {
        const debitBalance = account.balance >= 0 ? account.balance : 0;
        const creditBalance = account.balance < 0 ? Math.abs(account.balance) : 0;
        
        totalDebitBalances += debitBalance;
        totalCreditBalances += creditBalance;
        totalDebits += account.totalDebits;
        totalCredits += account.totalCredits;

        trialBalanceData.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          totalDebits: account.totalDebits,
          totalCredits: account.totalCredits,
          debitBalance: debitBalance,
          creditBalance: creditBalance,
          debitBalanceFormatted: this.formatAmount(debitBalance),
          creditBalanceFormatted: this.formatAmount(creditBalance),
          totalDebitsFormatted: this.formatAmount(account.totalDebits),
          totalCreditsFormatted: this.formatAmount(account.totalCredits)
        });
      }

      const difference = Math.abs(totalDebitBalances - totalCreditBalances);
      const isBalanced = difference < 0.01;

      return {
        success: true,
        data: trialBalanceData,
        summary: {
          totalDebits: totalDebits,
          totalCredits: totalCredits,
          totalDebitBalances: totalDebitBalances,
          totalCreditBalances: totalCreditBalances,
          difference: difference,
          isBalanced: isBalanced,
          totalDebitsFormatted: this.formatAmount(totalDebits),
          totalCreditsFormatted: this.formatAmount(totalCredits),
          totalDebitBalancesFormatted: this.formatAmount(totalDebitBalances),
          totalCreditBalancesFormatted: this.formatAmount(totalCreditBalances),
          differenceFormatted: this.formatAmount(difference)
        }
      };
    } catch (error) {
      console.error('Get trial balance error:', error);
      return { success: false, error: error.message };
    }
  }

  static async getTrialBalanceByGroup(filters = {}) {
    try {
      const result = await this.getTrialBalance(filters);
      
      if (!result.success) return result;

      const data = result.data;
      
      const grouped = {
        assets: [],
        liabilities: [],
        capital: [],
        income: [],
        expenses: [],
        others: []
      };

      for (const account of data) {
        const code = account.accountCode;
        
        if (code.startsWith('1')) {
          grouped.assets.push(account);
        } else if (code.startsWith('2')) {
          grouped.liabilities.push(account);
        } else if (code.startsWith('3')) {
          grouped.capital.push(account);
        } else if (code.startsWith('4')) {
          grouped.income.push(account);
        } else if (code.startsWith('5')) {
          grouped.expenses.push(account);
        } else {
          grouped.others.push(account);
        }
      }

      const groupSummary = {
        assets: {
          count: grouped.assets.length,
          totalDebits: grouped.assets.reduce((sum, a) => sum + a.totalDebits, 0),
          totalCredits: grouped.assets.reduce((sum, a) => sum + a.totalCredits, 0),
          debitBalance: grouped.assets.reduce((sum, a) => sum + a.debitBalance, 0),
          creditBalance: grouped.assets.reduce((sum, a) => sum + a.creditBalance, 0)
        },
        liabilities: {
          count: grouped.liabilities.length,
          totalDebits: grouped.liabilities.reduce((sum, a) => sum + a.totalDebits, 0),
          totalCredits: grouped.liabilities.reduce((sum, a) => sum + a.totalCredits, 0),
          debitBalance: grouped.liabilities.reduce((sum, a) => sum + a.debitBalance, 0),
          creditBalance: grouped.liabilities.reduce((sum, a) => sum + a.creditBalance, 0)
        },
        capital: {
          count: grouped.capital.length,
          totalDebits: grouped.capital.reduce((sum, a) => sum + a.totalDebits, 0),
          totalCredits: grouped.capital.reduce((sum, a) => sum + a.totalCredits, 0),
          debitBalance: grouped.capital.reduce((sum, a) => sum + a.debitBalance, 0),
          creditBalance: grouped.capital.reduce((sum, a) => sum + a.creditBalance, 0)
        },
        income: {
          count: grouped.income.length,
          totalDebits: grouped.income.reduce((sum, a) => sum + a.totalDebits, 0),
          totalCredits: grouped.income.reduce((sum, a) => sum + a.totalCredits, 0),
          debitBalance: grouped.income.reduce((sum, a) => sum + a.debitBalance, 0),
          creditBalance: grouped.income.reduce((sum, a) => sum + a.creditBalance, 0)
        },
        expenses: {
          count: grouped.expenses.length,
          totalDebits: grouped.expenses.reduce((sum, a) => sum + a.totalDebits, 0),
          totalCredits: grouped.expenses.reduce((sum, a) => sum + a.totalCredits, 0),
          debitBalance: grouped.expenses.reduce((sum, a) => sum + a.debitBalance, 0),
          creditBalance: grouped.expenses.reduce((sum, a) => sum + a.creditBalance, 0)
        }
      };

      return {
        success: true,
        data: grouped,
        groupSummary: groupSummary,
        summary: result.summary
      };
    } catch (error) {
      console.error('Get trial balance by group error:', error);
      return { success: false, error: error.message };
    }
  }

  static async validateTrialBalance(filters = {}) {
    try {
      const result = await this.getTrialBalance(filters);
      
      if (!result.success) return result;

      const errors = [];
      const warnings = [];

      if (!result.summary.isBalanced) {
        errors.push({
          type: 'UNBALANCED',
          message: `Trial Balance is not balanced. Difference: ₹${result.summary.differenceFormatted}`,
          difference: result.summary.difference
        });
      }

      if (Math.abs(result.summary.totalDebits - result.summary.totalCredits) > 0.01) {
        errors.push({
          type: 'TOTALS_MISMATCH',
          message: `Total Debits and Credits do not match`,
          totalDebits: result.summary.totalDebits,
          totalCredits: result.summary.totalCredits
        });
      }

      for (const account of result.data) {
        if (account.debitBalance === 0 && account.creditBalance === 0) {
          warnings.push({
            type: 'ZERO_BALANCE',
            message: `Account ${account.accountName} has zero balance`,
            accountCode: account.accountCode
          });
        }
      }

      return {
        success: true,
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings,
        summary: result.summary
      };
    } catch (error) {
      console.error('Validate trial balance error:', error);
      return { success: false, error: error.message };
    }
  }

  static async compareTrialBalances(filters1 = {}, filters2 = {}) {
    try {
      const result1 = await this.getTrialBalance(filters1);
      const result2 = await this.getTrialBalance(filters2);

      if (!result1.success || !result2.success) {
        return { success: false, error: 'Failed to get trial balances' };
      }

      const comparison = [];
      const allAccounts = new Set([
        ...result1.data.map(a => a.accountCode),
        ...result2.data.map(a => a.accountCode)
      ]);

      for (const accountCode of allAccounts) {
        const account1 = result1.data.find(a => a.accountCode === accountCode);
        const account2 = result2.data.find(a => a.accountCode === accountCode);

        const debitBalance1 = account1 ? account1.debitBalance : 0;
        const creditBalance1 = account1 ? account1.creditBalance : 0;
        const debitBalance2 = account2 ? account2.debitBalance : 0;
        const creditBalance2 = account2 ? account2.creditBalance : 0;

        const debitChange = debitBalance2 - debitBalance1;
        const creditChange = creditBalance2 - creditBalance1;

        comparison.push({
          accountCode: accountCode,
          accountName: account1 ? account1.accountName : account2.accountName,
          period1DebitBalance: debitBalance1,
          period1CreditBalance: creditBalance1,
          period2DebitBalance: debitBalance2,
          period2CreditBalance: creditBalance2,
          debitChange: debitChange,
          creditChange: creditChange,
          debitChangeFormatted: this.formatAmount(debitChange),
          creditChangeFormatted: this.formatAmount(creditChange)
        });
      }

      return {
        success: true,
        data: comparison,
        period1Summary: result1.summary,
        period2Summary: result2.summary
      };
    } catch (error) {
      console.error('Compare trial balances error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default TrialBalanceService;
