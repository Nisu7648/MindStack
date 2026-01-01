/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEDGER SERVICE - COMPLETE INDIAN ACCOUNTING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LEDGER = Account-wise record of all transactions
 * 
 * TRADITIONAL DOUBLE-SIDED FORMAT:
 * ┌─────────────────────────────────────┬─────────────────────────────────────┐
 * │           DEBIT SIDE                │           CREDIT SIDE               │
 * ├──────┬──────────┬─────────┬────┬────┼──────┬──────────┬─────────┬────┬────┤
 * │ Date │ Particulars│Voucher│ LF │ ₹  │ Date │Particulars│Voucher│ LF │ ₹  │
 * └──────┴──────────┴─────────┴────┴────┴──────┴──────────┴─────────┴────┴────┘
 * 
 * RULES:
 * - Every journal entry is posted to respective ledger accounts
 * - Debit entries go to DEBIT SIDE
 * - Credit entries go to CREDIT SIDE
 * - Balance is calculated: Total Debits - Total Credits
 * - Debit Balance: Assets, Expenses, Losses
 * - Credit Balance: Liabilities, Capital, Income, Gains
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import StorageService from '../storage/storageService';
import moment from 'moment';

export class LedgerService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT AMOUNT (INDIAN STYLE)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT BALANCE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatBalance(amount) {
    const absAmount = Math.abs(amount);
    const type = amount >= 0 ? 'Dr' : 'Cr';
    return `${this.formatAmount(absAmount)} ${type}`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * POST TO LEDGER - FROM JOURNAL ENTRY (DOUBLE-SIDED FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async postToLedger(journalEntry) {
    try {
      // Post each line to respective account ledger
      for (const entry of journalEntry.entries) {
        await this.postLedgerEntry({
          accountCode: entry.accountCode,
          accountName: entry.accountName,
          date: journalEntry.date,
          particulars: this.getParticulars(entry, journalEntry),
          voucherNumber: journalEntry.voucherNumber,
          voucherType: journalEntry.voucherType,
          ledgerFolio: entry.ledgerFolio || '',
          debit: entry.debit,
          credit: entry.credit,
          isDebit: entry.debit > 0,
          isCredit: entry.credit > 0,
          journalId: journalEntry.id
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Post to ledger error:', error);
      throw error;
    }
  }

  /**
   * Get particulars for ledger entry
   */
  static getParticulars(entry, journalEntry) {
    // For debit entry, show credit account with "To"
    // For credit entry, show debit account with "By"
    if (entry.debit > 0) {
      // This is debit entry, show "To [Credit Account]"
      const creditEntry = journalEntry.entries.find(e => e.credit > 0);
      return `To ${creditEntry ? creditEntry.accountName : 'Various'} A/c`;
    } else {
      // This is credit entry, show "By [Debit Account]"
      const debitEntry = journalEntry.entries.find(e => e.debit > 0);
      return `By ${debitEntry ? debitEntry.accountName : 'Various'} A/c`;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * POST SINGLE LEDGER ENTRY (DOUBLE-SIDED FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async postLedgerEntry(data) {
    try {
      const ledgerEntry = {
        id: Date.now().toString(),
        accountCode: data.accountCode,
        accountName: data.accountName,
        date: data.date,
        dateFormatted: moment(data.date).format('DD-MMM-YYYY'),
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        voucherType: data.voucherType,
        ledgerFolio: data.ledgerFolio || '',
        
        // Debit side
        isDebit: data.isDebit,
        debitParticulars: data.isDebit ? data.particulars : '',
        debitAmount: data.debit || 0,
        
        // Credit side
        isCredit: data.isCredit,
        creditParticulars: data.isCredit ? data.particulars : '',
        creditAmount: data.credit || 0,
        
        // Common
        debit: data.debit || 0,
        credit: data.credit || 0,
        journalId: data.journalId
      };

      await StorageService.saveToLedger(data.accountCode, ledgerEntry);
      return { success: true, data: ledgerEntry };
    } catch (error) {
      console.error('Post ledger entry error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER ACCOUNT (DOUBLE-SIDED WITH BALANCES)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerAccount(accountCode, filters = {}) {
    try {
      const result = await StorageService.getLedger(accountCode, filters);
      
      if (!result.success) return result;

      let entries = result.data;
      let runningBalance = 0;

      // Calculate running balance
      entries = entries.map(entry => {
        runningBalance += entry.debit - entry.credit;
        
        return {
          ...entry,
          balance: runningBalance,
          balanceFormatted: this.formatBalance(runningBalance)
        };
      });

      // Separate debit and credit entries
      const debitEntries = entries.filter(e => e.isDebit);
      const creditEntries = entries.filter(e => e.isCredit);

      // Calculate totals
      const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);
      const closingBalance = totalDebits - totalCredits;

      return {
        success: true,
        data: entries,
        debitEntries: debitEntries,
        creditEntries: creditEntries,
        summary: {
          accountCode: accountCode,
          accountName: entries.length > 0 ? entries[0].accountName : '',
          totalDebits: totalDebits,
          totalCredits: totalCredits,
          closingBalance: closingBalance,
          closingBalanceFormatted: this.formatBalance(closingBalance)
        }
      };
    } catch (error) {
      console.error('Get ledger account error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL LEDGER ACCOUNTS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAllLedgerAccounts(filters = {}) {
    try {
      const result = await StorageService.getAllLedgers(filters);
      
      if (!result.success) return result;

      const accounts = [];
      
      for (const [accountCode, entries] of Object.entries(result.data)) {
        if (entries.length === 0) continue;

        // Calculate totals
        const totalDebits = entries.reduce((sum, e) => sum + e.debit, 0);
        const totalCredits = entries.reduce((sum, e) => sum + e.credit, 0);
        const balance = totalDebits - totalCredits;

        accounts.push({
          accountCode: accountCode,
          accountName: entries[0].accountName,
          totalDebits: totalDebits,
          totalCredits: totalCredits,
          balance: balance,
          balanceFormatted: this.formatBalance(balance),
          entryCount: entries.length
        });
      }

      return {
        success: true,
        data: accounts,
        summary: {
          totalAccounts: accounts.length,
          totalDebits: accounts.reduce((sum, a) => sum + a.totalDebits, 0),
          totalCredits: accounts.reduce((sum, a) => sum + a.totalCredits, 0)
        }
      };
    } catch (error) {
      console.error('Get all ledger accounts error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ACCOUNT BALANCE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAccountBalance(accountCode) {
    try {
      const result = await this.getLedgerAccount(accountCode);
      
      if (!result.success) {
        return { success: true, balance: 0, balanceFormatted: '0.00 Dr' };
      }

      return {
        success: true,
        balance: result.summary.closingBalance,
        balanceFormatted: result.summary.closingBalanceFormatted
      };
    } catch (error) {
      console.error('Get account balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET TRIAL BALANCE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getTrialBalance(filters = {}) {
    try {
      const result = await this.getAllLedgerAccounts(filters);
      
      if (!result.success) return result;

      const accounts = result.data;
      
      // Separate debit and credit balances
      const debitBalances = accounts.filter(a => a.balance >= 0);
      const creditBalances = accounts.filter(a => a.balance < 0);

      const totalDebitBalances = debitBalances.reduce((sum, a) => sum + a.balance, 0);
      const totalCreditBalances = creditBalances.reduce((sum, a) => sum + Math.abs(a.balance), 0);

      return {
        success: true,
        data: {
          debitBalances: debitBalances,
          creditBalances: creditBalances.map(a => ({
            ...a,
            balance: Math.abs(a.balance),
            balanceFormatted: this.formatAmount(Math.abs(a.balance))
          }))
        },
        summary: {
          totalDebitBalances: totalDebitBalances,
          totalCreditBalances: totalCreditBalances,
          difference: Math.abs(totalDebitBalances - totalCreditBalances),
          isBalanced: Math.abs(totalDebitBalances - totalCreditBalances) < 0.01
        }
      };
    } catch (error) {
      console.error('Get trial balance error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SEARCH LEDGER ENTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async searchLedgerEntries(searchTerm, filters = {}) {
    try {
      const result = await StorageService.getAllLedgers(filters);
      
      if (!result.success) return result;

      const matchingEntries = [];
      
      for (const [accountCode, entries] of Object.entries(result.data)) {
        const filtered = entries.filter(entry => 
          entry.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        matchingEntries.push(...filtered);
      }

      return {
        success: true,
        data: matchingEntries,
        count: matchingEntries.length
      };
    } catch (error) {
      console.error('Search ledger entries error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER SUMMARY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerSummary(filters = {}) {
    try {
      const result = await this.getAllLedgerAccounts(filters);
      
      if (!result.success) return result;

      const accounts = result.data;
      
      // Categorize accounts
      const assets = accounts.filter(a => a.balance >= 0 && a.accountCode.startsWith('1'));
      const liabilities = accounts.filter(a => a.balance < 0 && a.accountCode.startsWith('2'));
      const capital = accounts.filter(a => a.balance < 0 && a.accountCode.startsWith('3'));
      const income = accounts.filter(a => a.balance < 0 && a.accountCode.startsWith('4'));
      const expenses = accounts.filter(a => a.balance >= 0 && a.accountCode.startsWith('5'));

      return {
        success: true,
        data: {
          totalAccounts: accounts.length,
          assets: {
            count: assets.length,
            total: assets.reduce((sum, a) => sum + a.balance, 0)
          },
          liabilities: {
            count: liabilities.length,
            total: liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0)
          },
          capital: {
            count: capital.length,
            total: capital.reduce((sum, a) => sum + Math.abs(a.balance), 0)
          },
          income: {
            count: income.length,
            total: income.reduce((sum, a) => sum + Math.abs(a.balance), 0)
          },
          expenses: {
            count: expenses.length,
            total: expenses.reduce((sum, a) => sum + a.balance, 0)
          }
        }
      };
    } catch (error) {
      console.error('Get ledger summary error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default LedgerService;
