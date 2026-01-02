/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BANK RECONCILIATION STATEMENT (BRS) SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LEGAL COMPLIANCE:
 * ✓ Companies Act 2013, Section 128 - Books of Accounts
 * ✓ RBI Guidelines - Bank Reconciliation
 * ✓ ICAI Standards - AS 1 (Disclosure of Accounting Policies)
 * ✓ Ind AS 7 - Statement of Cash Flows
 * 
 * PURPOSE:
 * Reconcile differences between:
 * 1. Cash Book Balance (Company's books)
 * 2. Bank Statement Balance (Bank's records)
 * 
 * COMMON DIFFERENCES:
 * - Cheques issued but not presented
 * - Cheques deposited but not cleared
 * - Bank charges not recorded in books
 * - Interest credited by bank
 * - Direct deposits/payments
 * - Errors in recording
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DatabaseService } from '../database/databaseService';
import moment from 'moment';

export class BankReconciliationStatementService {
  /**
   * Generate Bank Reconciliation Statement
   * As per Indian Accounting Standards
   */
  static async generateBRS(bankAccountId, asOnDate) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Step 1: Get Cash Book Balance (as per company books)
      const cashBookBalance = await this.getCashBookBalance(db, bankAccountId, asOnDate);
      
      // Step 2: Get Bank Statement Balance (as per bank)
      const bankStatementBalance = await this.getBankStatementBalance(db, bankAccountId, asOnDate);
      
      // Step 3: Identify reconciling items
      const chequesIssued = await this.getChequesIssuedNotPresented(db, bankAccountId, asOnDate);
      const chequesDeposited = await this.getChequesDepositedNotCleared(db, bankAccountId, asOnDate);
      const bankCharges = await this.getBankChargesNotRecorded(db, bankAccountId, asOnDate);
      const interestCredited = await this.getInterestNotRecorded(db, bankAccountId, asOnDate);
      const directDeposits = await this.getDirectDepositsNotRecorded(db, bankAccountId, asOnDate);
      const errors = await this.getRecordingErrors(db, bankAccountId, asOnDate);
      
      // Step 4: Calculate reconciled balance
      const reconciliation = this.calculateReconciliation({
        cashBookBalance,
        bankStatementBalance,
        chequesIssued,
        chequesDeposited,
        bankCharges,
        interestCredited,
        directDeposits,
        errors
      });
      
      return {
        success: true,
        brs: {
          asOnDate,
          bankAccountId,
          cashBookBalance,
          bankStatementBalance,
          reconciliation,
          chequesIssued,
          chequesDeposited,
          bankCharges,
          interestCredited,
          directDeposits,
          errors,
          isReconciled: Math.abs(reconciliation.difference) < 0.01,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Generate BRS error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Cash Book Balance (Company's Books)
   */
  static async getCashBookBalance(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT 
          SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) -
          SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) as balance
        FROM journal_entries
        WHERE account_id = ?
        AND transaction_date <= ?
        AND is_cancelled = 0`,
        [bankAccountId, asOnDate]
      );

      return result.rows.item(0).balance || 0;
    } catch (error) {
      console.error('Get cash book balance error:', error);
      return 0;
    }
  }

  /**
   * Get Bank Statement Balance (Bank's Records)
   */
  static async getBankStatementBalance(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT balance
        FROM bank_feed_transactions
        WHERE connection_id = ?
        AND transaction_date <= ?
        ORDER BY transaction_date DESC, id DESC
        LIMIT 1`,
        [bankAccountId, asOnDate]
      );

      if (result.rows.length > 0) {
        return result.rows.item(0).balance || 0;
      }

      return 0;
    } catch (error) {
      console.error('Get bank statement balance error:', error);
      return 0;
    }
  }

  /**
   * Get Cheques Issued but Not Presented
   * (Deducted in books but not in bank statement)
   */
  static async getChequesIssuedNotPresented(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT 
          je.id,
          je.transaction_date,
          je.voucher_number,
          je.description,
          je.credit_amount as amount,
          je.cheque_number,
          je.cheque_date
        FROM journal_entries je
        WHERE je.account_id = ?
        AND je.transaction_date <= ?
        AND je.credit_amount > 0
        AND je.cheque_number IS NOT NULL
        AND je.is_cancelled = 0
        AND NOT EXISTS (
          SELECT 1 FROM bank_feed_transactions bft
          WHERE bft.reference = je.cheque_number
          AND bft.transaction_date <= ?
        )
        ORDER BY je.transaction_date`,
        [bankAccountId, asOnDate, asOnDate]
      );

      const cheques = [];
      for (let i = 0; i < result.rows.length; i++) {
        cheques.push(result.rows.item(i));
      }

      return {
        items: cheques,
        total: cheques.reduce((sum, c) => sum + c.amount, 0)
      };
    } catch (error) {
      console.error('Get cheques issued error:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get Cheques Deposited but Not Cleared
   * (Added in books but not in bank statement)
   */
  static async getChequesDepositedNotCleared(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT 
          je.id,
          je.transaction_date,
          je.voucher_number,
          je.description,
          je.debit_amount as amount,
          je.cheque_number,
          je.cheque_date
        FROM journal_entries je
        WHERE je.account_id = ?
        AND je.transaction_date <= ?
        AND je.debit_amount > 0
        AND je.cheque_number IS NOT NULL
        AND je.is_cancelled = 0
        AND NOT EXISTS (
          SELECT 1 FROM bank_feed_transactions bft
          WHERE bft.reference = je.cheque_number
          AND bft.transaction_date <= ?
        )
        ORDER BY je.transaction_date`,
        [bankAccountId, asOnDate, asOnDate]
      );

      const cheques = [];
      for (let i = 0; i < result.rows.length; i++) {
        cheques.push(result.rows.item(i));
      }

      return {
        items: cheques,
        total: cheques.reduce((sum, c) => sum + c.amount, 0)
      };
    } catch (error) {
      console.error('Get cheques deposited error:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get Bank Charges Not Recorded in Books
   */
  static async getBankChargesNotRecorded(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT 
          bft.id,
          bft.transaction_date,
          bft.description,
          bft.amount,
          bft.reference
        FROM bank_feed_transactions bft
        WHERE bft.connection_id = ?
        AND bft.transaction_date <= ?
        AND bft.transaction_type = 'DEBIT'
        AND (bft.description LIKE '%charge%' OR bft.description LIKE '%fee%')
        AND bft.is_reconciled = 0
        ORDER BY bft.transaction_date`,
        [bankAccountId, asOnDate]
      );

      const charges = [];
      for (let i = 0; i < result.rows.length; i++) {
        charges.push(result.rows.item(i));
      }

      return {
        items: charges,
        total: charges.reduce((sum, c) => sum + c.amount, 0)
      };
    } catch (error) {
      console.error('Get bank charges error:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get Interest Credited by Bank Not Recorded
   */
  static async getInterestNotRecorded(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT 
          bft.id,
          bft.transaction_date,
          bft.description,
          bft.amount,
          bft.reference
        FROM bank_feed_transactions bft
        WHERE bft.connection_id = ?
        AND bft.transaction_date <= ?
        AND bft.transaction_type = 'CREDIT'
        AND bft.description LIKE '%interest%'
        AND bft.is_reconciled = 0
        ORDER BY bft.transaction_date`,
        [bankAccountId, asOnDate]
      );

      const interest = [];
      for (let i = 0; i < result.rows.length; i++) {
        interest.push(result.rows.item(i));
      }

      return {
        items: interest,
        total: interest.reduce((sum, i) => sum + i.amount, 0)
      };
    } catch (error) {
      console.error('Get interest error:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Get Direct Deposits/Payments Not Recorded
   */
  static async getDirectDepositsNotRecorded(db, bankAccountId, asOnDate) {
    try {
      const [result] = await db.executeSql(
        `SELECT 
          bft.id,
          bft.transaction_date,
          bft.description,
          bft.amount,
          bft.transaction_type,
          bft.reference
        FROM bank_feed_transactions bft
        WHERE bft.connection_id = ?
        AND bft.transaction_date <= ?
        AND bft.is_reconciled = 0
        AND bft.description NOT LIKE '%charge%'
        AND bft.description NOT LIKE '%fee%'
        AND bft.description NOT LIKE '%interest%'
        ORDER BY bft.transaction_date`,
        [bankAccountId, asOnDate]
      );

      const deposits = [];
      for (let i = 0; i < result.rows.length; i++) {
        deposits.push(result.rows.item(i));
      }

      return {
        items: deposits,
        creditTotal: deposits.filter(d => d.transaction_type === 'CREDIT').reduce((sum, d) => sum + d.amount, 0),
        debitTotal: deposits.filter(d => d.transaction_type === 'DEBIT').reduce((sum, d) => sum + d.amount, 0)
      };
    } catch (error) {
      console.error('Get direct deposits error:', error);
      return { items: [], creditTotal: 0, debitTotal: 0 };
    }
  }

  /**
   * Get Recording Errors
   */
  static async getRecordingErrors(db, bankAccountId, asOnDate) {
    try {
      // Find transactions with amount mismatches
      const [result] = await db.executeSql(
        `SELECT 
          je.id as journal_id,
          je.transaction_date,
          je.voucher_number,
          je.description,
          je.debit_amount,
          je.credit_amount,
          bft.id as bank_txn_id,
          bft.amount as bank_amount,
          ABS((je.debit_amount + je.credit_amount) - bft.amount) as difference
        FROM journal_entries je
        INNER JOIN bank_feed_transactions bft 
          ON je.reference_number = bft.reference
        WHERE je.account_id = ?
        AND je.transaction_date <= ?
        AND ABS((je.debit_amount + je.credit_amount) - bft.amount) > 0.01
        ORDER BY je.transaction_date`,
        [bankAccountId, asOnDate]
      );

      const errors = [];
      for (let i = 0; i < result.rows.length; i++) {
        errors.push(result.rows.item(i));
      }

      return {
        items: errors,
        total: errors.reduce((sum, e) => sum + e.difference, 0)
      };
    } catch (error) {
      console.error('Get recording errors error:', error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Calculate Reconciliation
   * 
   * METHOD 1: Starting from Cash Book Balance
   * Cash Book Balance (Dr)                           XXX
   * Add: Cheques deposited but not cleared          +XXX
   * Add: Bank charges not recorded                  +XXX
   * Less: Cheques issued but not presented          -XXX
   * Less: Interest credited not recorded            -XXX
   * Less: Direct deposits not recorded              -XXX
   * Add: Direct payments not recorded               +XXX
   * Add/Less: Errors                                ±XXX
   * ─────────────────────────────────────────────────────
   * Bank Statement Balance                           XXX
   */
  static calculateReconciliation(data) {
    const {
      cashBookBalance,
      bankStatementBalance,
      chequesIssued,
      chequesDeposited,
      bankCharges,
      interestCredited,
      directDeposits,
      errors
    } = data;

    // Start with Cash Book Balance
    let calculatedBankBalance = cashBookBalance;

    // Add: Cheques deposited but not cleared
    calculatedBankBalance += chequesDeposited.total;

    // Add: Bank charges not recorded in books
    calculatedBankBalance += bankCharges.total;

    // Less: Cheques issued but not presented
    calculatedBankBalance -= chequesIssued.total;

    // Less: Interest credited by bank
    calculatedBankBalance -= interestCredited.total;

    // Adjust for direct deposits/payments
    calculatedBankBalance += directDeposits.creditTotal;
    calculatedBankBalance -= directDeposits.debitTotal;

    // Adjust for errors
    calculatedBankBalance += errors.total;

    const difference = calculatedBankBalance - bankStatementBalance;

    return {
      cashBookBalance,
      bankStatementBalance,
      calculatedBankBalance,
      difference,
      isReconciled: Math.abs(difference) < 0.01,
      reconciliationSteps: [
        { description: 'Cash Book Balance (as per books)', amount: cashBookBalance },
        { description: 'Add: Cheques deposited but not cleared', amount: chequesDeposited.total },
        { description: 'Add: Bank charges not recorded', amount: bankCharges.total },
        { description: 'Less: Cheques issued but not presented', amount: -chequesIssued.total },
        { description: 'Less: Interest credited not recorded', amount: -interestCredited.total },
        { description: 'Add: Direct deposits not recorded', amount: directDeposits.creditTotal },
        { description: 'Less: Direct payments not recorded', amount: -directDeposits.debitTotal },
        { description: 'Adjust: Recording errors', amount: errors.total },
        { description: 'Calculated Bank Balance', amount: calculatedBankBalance, isFinal: true },
        { description: 'Actual Bank Statement Balance', amount: bankStatementBalance, isFinal: true },
        { description: 'Difference (if any)', amount: difference, isDifference: true }
      ]
    };
  }

  /**
   * Generate BRS in Standard Format (PDF/Print Ready)
   */
  static async generateBRSReport(bankAccountId, asOnDate, companyInfo) {
    try {
      const brsData = await this.generateBRS(bankAccountId, asOnDate);
      
      if (!brsData.success) {
        throw new Error(brsData.error);
      }

      const { brs } = brsData;

      // Format report
      const report = {
        header: {
          companyName: companyInfo.name,
          reportTitle: 'BANK RECONCILIATION STATEMENT',
          asOnDate: moment(asOnDate).format('DD MMMM YYYY'),
          bankAccount: await this.getBankAccountName(bankAccountId)
        },
        body: {
          cashBookBalance: {
            label: 'Balance as per Cash Book',
            amount: brs.cashBookBalance,
            type: brs.cashBookBalance >= 0 ? 'Dr' : 'Cr'
          },
          additions: [
            {
              label: 'Add: Cheques deposited but not cleared',
              items: brs.chequesDeposited.items,
              total: brs.chequesDeposited.total
            },
            {
              label: 'Add: Bank charges not recorded in books',
              items: brs.bankCharges.items,
              total: brs.bankCharges.total
            },
            {
              label: 'Add: Direct deposits not recorded',
              items: brs.directDeposits.items.filter(d => d.transaction_type === 'CREDIT'),
              total: brs.directDeposits.creditTotal
            }
          ],
          deductions: [
            {
              label: 'Less: Cheques issued but not presented',
              items: brs.chequesIssued.items,
              total: brs.chequesIssued.total
            },
            {
              label: 'Less: Interest credited by bank',
              items: brs.interestCredited.items,
              total: brs.interestCredited.total
            },
            {
              label: 'Less: Direct payments not recorded',
              items: brs.directDeposits.items.filter(d => d.transaction_type === 'DEBIT'),
              total: brs.directDeposits.debitTotal
            }
          ],
          errors: brs.errors.items.length > 0 ? {
            label: 'Adjustments for recording errors',
            items: brs.errors.items,
            total: brs.errors.total
          } : null,
          bankStatementBalance: {
            label: 'Balance as per Bank Statement',
            amount: brs.bankStatementBalance,
            type: brs.bankStatementBalance >= 0 ? 'Dr' : 'Cr'
          },
          difference: {
            amount: brs.reconciliation.difference,
            isReconciled: brs.isReconciled
          }
        },
        footer: {
          preparedBy: companyInfo.preparedBy || 'System Generated',
          preparedDate: moment().format('DD MMMM YYYY, hh:mm A'),
          signature: '________________________',
          designation: 'Authorized Signatory'
        }
      };

      return {
        success: true,
        report,
        brs
      };
    } catch (error) {
      console.error('Generate BRS report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Bank Account Name
   */
  static async getBankAccountName(bankAccountId) {
    try {
      const db = await DatabaseService.getDatabase();
      const [result] = await db.executeSql(
        'SELECT account_name FROM bank_connections WHERE id = ?',
        [bankAccountId]
      );

      if (result.rows.length > 0) {
        return result.rows.item(0).account_name;
      }

      return 'Unknown Bank Account';
    } catch (error) {
      return 'Unknown Bank Account';
    }
  }

  /**
   * Auto-reconcile matched items
   */
  static async autoReconcileMatchedItems(bankAccountId, asOnDate) {
    try {
      const db = await DatabaseService.getDatabase();
      
      // Find exact matches between journal entries and bank transactions
      const [matches] = await db.executeSql(
        `SELECT 
          je.id as journal_id,
          bft.id as bank_txn_id,
          je.amount,
          je.transaction_date,
          je.description
        FROM journal_entries je
        INNER JOIN bank_feed_transactions bft
          ON je.reference_number = bft.reference
          AND ABS(je.amount - bft.amount) < 0.01
        WHERE je.account_id = ?
        AND je.transaction_date <= ?
        AND bft.is_reconciled = 0
        AND je.is_cancelled = 0`,
        [bankAccountId, asOnDate]
      );

      let reconciledCount = 0;

      for (let i = 0; i < matches.rows.length; i++) {
        const match = matches.rows.item(i);
        
        // Mark as reconciled
        await db.executeSql(
          `UPDATE bank_feed_transactions 
          SET is_reconciled = 1, 
              reconciled_with_entry_id = ?,
              reconciled_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [match.journal_id, match.bank_txn_id]
        );

        reconciledCount++;
      }

      return {
        success: true,
        reconciledCount,
        message: `Auto-reconciled ${reconciledCount} transactions`
      };
    } catch (error) {
      console.error('Auto reconcile error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default BankReconciliationStatementService;
