/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEDGER SERVICE - COMPLETE INDIAN ACCOUNTING SYSTEM WITH FULL RULES
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
 * GOLDEN RULES OF ACCOUNTING:
 * 
 * 1. PERSONAL ACCOUNTS (Debtors, Creditors, Capital):
 *    - Debit: The Receiver
 *    - Credit: The Giver
 * 
 * 2. REAL ACCOUNTS (Assets, Properties):
 *    - Debit: What Comes In
 *    - Credit: What Goes Out
 * 
 * 3. NOMINAL ACCOUNTS (Income, Expenses):
 *    - Debit: All Expenses and Losses
 *    - Credit: All Incomes and Gains
 * 
 * MODERN CLASSIFICATION:
 * 
 * DEBIT SIDE (Dr.):
 * - Assets (Cash, Bank, Stock, Furniture, Building, etc.)
 * - Expenses (Rent, Salary, Electricity, etc.)
 * - Losses (Loss on Sale, Bad Debts, etc.)
 * - Drawings (Owner withdrawals)
 * - Debtors (Receivables)
 * 
 * CREDIT SIDE (Cr.):
 * - Liabilities (Loans, Creditors, etc.)
 * - Capital (Owner's equity)
 * - Income (Sales, Commission, Interest Received, etc.)
 * - Gains (Profit on Sale, Discount Received, etc.)
 * - Reserves & Provisions
 * 
 * BALANCE CALCULATION:
 * - Balance = Total Debits - Total Credits
 * - Positive Balance = Debit Balance (Dr.)
 * - Negative Balance = Credit Balance (Cr.)
 * 
 * ACCOUNT CODE STRUCTURE:
 * 1xxx = Assets (Debit Balance)
 * 2xxx = Liabilities (Credit Balance)
 * 3xxx = Capital (Credit Balance)
 * 4xxx = Income (Credit Balance)
 * 5xxx = Expenses (Debit Balance)
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
   * HELPER: FORMAT BALANCE WITH DR/CR
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatBalance(amount) {
    const absAmount = Math.abs(amount);
    const type = amount >= 0 ? 'Dr' : 'Cr';
    return `${this.formatAmount(absAmount)} ${type}`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * VALIDATE ACCOUNT TYPE AND BALANCE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static validateAccountBalance(accountCode, balance) {
    const firstDigit = accountCode.charAt(0);
    
    // Assets (1xxx) should have Debit Balance
    if (firstDigit === '1' && balance < 0) {
      return {
        valid: false,
        warning: `Asset account ${accountCode} has Credit Balance. Assets should have Debit Balance.`
      };
    }
    
    // Liabilities (2xxx) should have Credit Balance
    if (firstDigit === '2' && balance > 0) {
      return {
        valid: false,
        warning: `Liability account ${accountCode} has Debit Balance. Liabilities should have Credit Balance.`
      };
    }
    
    // Capital (3xxx) should have Credit Balance
    if (firstDigit === '3' && balance > 0) {
      return {
        valid: false,
        warning: `Capital account ${accountCode} has Debit Balance. Capital should have Credit Balance.`
      };
    }
    
    // Income (4xxx) should have Credit Balance
    if (firstDigit === '4' && balance > 0) {
      return {
        valid: false,
        warning: `Income account ${accountCode} has Debit Balance. Income should have Credit Balance.`
      };
    }
    
    // Expenses (5xxx) should have Debit Balance
    if (firstDigit === '5' && balance < 0) {
      return {
        valid: false,
        warning: `Expense account ${accountCode} has Credit Balance. Expenses should have Debit Balance.`
      };
    }
    
    return { valid: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * POST TO LEDGER - FROM JOURNAL ENTRY (DOUBLE-SIDED FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async postToLedger(journalEntry) {
    try {
      // Validate journal entry first
      if (!journalEntry || !journalEntry.entries || journalEntry.entries.length === 0) {
        throw new Error('Invalid journal entry');
      }

      // Verify double entry: Total Debits = Total Credits
      const totalDebits = journalEntry.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalCredits = journalEntry.entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Journal entry not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`);
      }

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
          debitAmount: entry.debit || 0,
          creditAmount: entry.credit || 0,
          isDebit: (entry.debit || 0) > 0,
          isCredit: (entry.credit || 0) > 0,
          debitParticulars: (entry.debit || 0) > 0 ? this.getParticulars(entry, journalEntry) : '',
          creditParticulars: (entry.credit || 0) > 0 ? this.getParticulars(entry, journalEntry) : '',
          journalId: journalEntry.id,
          narration: journalEntry.narration || ''
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Post to ledger error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET PARTICULARS FOR LEDGER ENTRY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getParticulars(entry, journalEntry) {
    // For debit entry, show credit account with "To"
    // For credit entry, show debit account with "By"
    if ((entry.debit || 0) > 0) {
      // This is debit entry, show "To [Credit Account]"
      const creditEntry = journalEntry.entries.find(e => (e.credit || 0) > 0);
      return `To ${creditEntry ? creditEntry.accountName : 'Various'} A/c`;
    } else {
      // This is credit entry, show "By [Debit Account]"
      const debitEntry = journalEntry.entries.find(e => (e.debit || 0) > 0);
      return `By ${debitEntry ? debitEntry.accountName : 'Various'} A/c`;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * POST SINGLE LEDGER ENTRY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async postLedgerEntry(entry) {
    try {
      const ledgerData = await StorageService.readLedger();
      
      if (!ledgerData[entry.accountCode]) {
        ledgerData[entry.accountCode] = {
          accountCode: entry.accountCode,
          accountName: entry.accountName,
          entries: []
        };
      }

      const ledgerEntry = {
        id: `LED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: entry.date,
        particulars: entry.particulars,
        voucherNumber: entry.voucherNumber,
        voucherType: entry.voucherType,
        ledgerFolio: entry.ledgerFolio,
        debitAmount: entry.debitAmount,
        creditAmount: entry.creditAmount,
        isDebit: entry.isDebit,
        isCredit: entry.isCredit,
        debitParticulars: entry.debitParticulars,
        creditParticulars: entry.creditParticulars,
        journalId: entry.journalId,
        narration: entry.narration,
        timestamp: new Date().toISOString()
      };

      ledgerData[entry.accountCode].entries.push(ledgerEntry);

      await StorageService.writeLedger(ledgerData);

      return { success: true, entry: ledgerEntry };
    } catch (error) {
      console.error('Post ledger entry error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER ACCOUNT (DOUBLE-SIDED FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerAccount(accountCode, filters = {}) {
    try {
      const ledgerData = await StorageService.readLedger();
      
      if (!ledgerData[accountCode]) {
        return {
          success: false,
          error: `Account ${accountCode} not found`
        };
      }

      const account = ledgerData[accountCode];
      let entries = [...account.entries];

      // Apply filters
      if (filters.fromDate) {
        entries = entries.filter(e => moment(e.date).isSameOrAfter(moment(filters.fromDate)));
      }
      if (filters.toDate) {
        entries = entries.filter(e => moment(e.date).isSameOrBefore(moment(filters.toDate)));
      }

      // Sort by date
      entries.sort((a, b) => moment(a.date).diff(moment(b.date)));

      // Separate debit and credit entries
      const debitEntries = entries.filter(e => e.isDebit);
      const creditEntries = entries.filter(e => e.isCredit);

      // Calculate totals
      const totalDebits = entries.reduce((sum, e) => sum + (e.debitAmount || 0), 0);
      const totalCredits = entries.reduce((sum, e) => sum + (e.creditAmount || 0), 0);
      const balance = totalDebits - totalCredits;

      // Validate balance
      const validation = this.validateAccountBalance(accountCode, balance);

      return {
        success: true,
        data: entries,
        debitEntries: debitEntries,
        creditEntries: creditEntries,
        summary: {
          accountCode: accountCode,
          accountName: account.accountName,
          totalDebits: totalDebits,
          totalCredits: totalCredits,
          closingBalance: balance,
          totalDebitsFormatted: this.formatAmount(totalDebits),
          totalCreditsFormatted: this.formatAmount(totalCredits),
          closingBalanceFormatted: this.formatBalance(balance)
        },
        validation: validation
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
      const ledgerData = await StorageService.readLedger();
      const accounts = [];

      for (const accountCode in ledgerData) {
        const result = await this.getLedgerAccount(accountCode, filters);
        
        if (result.success) {
          accounts.push({
            accountCode: accountCode,
            accountName: result.summary.accountName,
            totalDebits: result.summary.totalDebits,
            totalCredits: result.summary.totalCredits,
            balance: result.summary.closingBalance,
            balanceFormatted: result.summary.closingBalanceFormatted,
            validation: result.validation
          });
        }
      }

      // Sort by account code
      accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

      return {
        success: true,
        data: accounts
      };
    } catch (error) {
      console.error('Get all ledger accounts error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER SUMMARY BY GROUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerSummaryByGroup(filters = {}) {
    try {
      const result = await this.getAllLedgerAccounts(filters);
      
      if (!result.success) return result;

      const grouped = {
        assets: [],
        liabilities: [],
        capital: [],
        income: [],
        expenses: []
      };

      for (const account of result.data) {
        const firstDigit = account.accountCode.charAt(0);
        
        if (firstDigit === '1') {
          grouped.assets.push(account);
        } else if (firstDigit === '2') {
          grouped.liabilities.push(account);
        } else if (firstDigit === '3') {
          grouped.capital.push(account);
        } else if (firstDigit === '4') {
          grouped.income.push(account);
        } else if (firstDigit === '5') {
          grouped.expenses.push(account);
        }
      }

      const summary = {
        totalAssets: grouped.assets.reduce((sum, a) => sum + Math.abs(a.balance), 0),
        totalLiabilities: grouped.liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0),
        totalCapital: grouped.capital.reduce((sum, a) => sum + Math.abs(a.balance), 0),
        totalIncome: grouped.income.reduce((sum, a) => sum + Math.abs(a.balance), 0),
        totalExpenses: grouped.expenses.reduce((sum, a) => sum + Math.abs(a.balance), 0)
      };

      return {
        success: true,
        grouped: grouped,
        summary: summary
      };
    } catch (error) {
      console.error('Get ledger summary by group error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CLOSE LEDGER ACCOUNTS (YEAR-END CLOSING)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async closeLedgerAccounts(closingDate, filters = {}) {
    try {
      const result = await this.getAllLedgerAccounts(filters);
      
      if (!result.success) return result;

      const closingEntries = [];

      for (const account of result.data) {
        const firstDigit = account.accountCode.charAt(0);
        
        // Close Income and Expense accounts to Profit & Loss
        if (firstDigit === '4' || firstDigit === '5') {
          if (Math.abs(account.balance) > 0.01) {
            closingEntries.push({
              accountCode: account.accountCode,
              accountName: account.accountName,
              balance: account.balance,
              type: firstDigit === '4' ? 'Income' : 'Expense'
            });
          }
        }
      }

      return {
        success: true,
        closingEntries: closingEntries,
        closingDate: closingDate
      };
    } catch (error) {
      console.error('Close ledger accounts error:', error);
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
      const ledgerData = await StorageService.readLedger();
      const results = [];

      for (const accountCode in ledgerData) {
        const account = ledgerData[accountCode];
        
        for (const entry of account.entries) {
          const matchesSearch = 
            entry.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.narration.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesFilters = 
            (!filters.fromDate || moment(entry.date).isSameOrAfter(moment(filters.fromDate))) &&
            (!filters.toDate || moment(entry.date).isSameOrBefore(moment(filters.toDate)));

          if (matchesSearch && matchesFilters) {
            results.push({
              ...entry,
              accountCode: accountCode,
              accountName: account.accountName
            });
          }
        }
      }

      // Sort by date (newest first)
      results.sort((a, b) => moment(b.date).diff(moment(a.date)));

      return {
        success: true,
        data: results,
        count: results.length
      };
    } catch (error) {
      console.error('Search ledger entries error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default LedgerService;
