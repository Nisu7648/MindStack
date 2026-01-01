/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LEDGER SERVICE - COMPLETE INDIAN ACCOUNTING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LEDGER = Account-wise record of all transactions
 * 
 * Format: Date | Particulars | Voucher No. | Debit | Credit | Balance
 * 
 * RULES:
 * - Every journal entry is posted to respective ledger accounts
 * - Running balance is maintained (Dr or Cr)
 * - Debit Balance: Assets, Expenses, Losses
 * - Credit Balance: Liabilities, Capital, Income, Gains
 * - Balance = Total Debits - Total Credits
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

export class LedgerService {
  static LEDGER_KEY = '@mindstack_ledger';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * POST TO LEDGER - FROM JOURNAL ENTRY
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
          debit: entry.debit,
          credit: entry.credit,
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
    // For debit entry, show credit account
    // For credit entry, show debit account
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
   * Post single ledger entry
   */
  static async postLedgerEntry(data) {
    try {
      const ledgerKey = `${this.LEDGER_KEY}_${data.accountCode}`;
      
      // Get existing ledger
      const existingData = await AsyncStorage.getItem(ledgerKey);
      const ledger = existingData ? JSON.parse(existingData) : [];

      // Calculate running balance
      const previousBalance = ledger.length > 0 ? ledger[0].balanceAmount : 0;
      const balanceAmount = previousBalance + data.debit - data.credit;

      // Create ledger entry
      const ledgerEntry = {
        id: Date.now().toString(),
        accountCode: data.accountCode,
        accountName: data.accountName,
        date: data.date,
        dateFormatted: moment(data.date).format('DD-MMM-YYYY'),
        particulars: data.particulars,
        voucherNumber: data.voucherNumber,
        voucherType: data.voucherType,
        debit: data.debit,
        credit: data.credit,
        debitFormatted: data.debit > 0 ? this.formatAmount(data.debit) : '',
        creditFormatted: data.credit > 0 ? this.formatAmount(data.credit) : '',
        balanceAmount: balanceAmount,
        balance: this.formatBalance(balanceAmount),
        journalId: data.journalId,
        createdAt: new Date().toISOString()
      };

      // Add to ledger (newest first)
      ledger.unshift(ledgerEntry);

      // Save ledger
      await AsyncStorage.setItem(ledgerKey, JSON.stringify(ledger));

      return { success: true, data: ledgerEntry };
    } catch (error) {
      console.error('Post ledger entry error:', error);
      throw error;
    }
  }

  /**
   * Format amount in Indian style
   */
  static formatAmount(amount) {
    if (!amount || amount === 0) return '';
    
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format balance with Dr/Cr notation
   */
  static formatBalance(amount) {
    if (amount === 0) return '0.00';
    
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return amount >= 0 ? `${formatted} Dr` : `${formatted} Cr`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER ACCOUNT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerAccount(accountCode, filters = {}) {
    try {
      const ledgerKey = `${this.LEDGER_KEY}_${accountCode}`;
      const data = await AsyncStorage.getItem(ledgerKey);
      let ledger = data ? JSON.parse(data) : [];

      // Apply filters
      if (filters.fromDate) {
        ledger = ledger.filter(e => 
          moment(e.date).isSameOrAfter(moment(filters.fromDate), 'day')
        );
      }

      if (filters.toDate) {
        ledger = ledger.filter(e => 
          moment(e.date).isSameOrBefore(moment(filters.toDate), 'day')
        );
      }

      if (filters.voucherType) {
        ledger = ledger.filter(e => e.voucherType === filters.voucherType);
      }

      // Calculate summary
      const summary = this.calculateLedgerSummary(ledger);

      return {
        success: true,
        data: ledger,
        summary,
        accountCode,
        accountName: ledger.length > 0 ? ledger[0].accountName : ''
      };
    } catch (error) {
      console.error('Get ledger account error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Calculate ledger summary
   */
  static calculateLedgerSummary(ledger) {
    const totalDebit = ledger.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = ledger.reduce((sum, e) => sum + e.credit, 0);
    const balance = totalDebit - totalCredit;

    return {
      totalDebit: this.formatAmount(totalDebit),
      totalCredit: this.formatAmount(totalCredit),
      balance: this.formatBalance(balance),
      totalDebitRaw: totalDebit,
      totalCreditRaw: totalCredit,
      balanceRaw: balance,
      entries: ledger.length
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL LEDGER ACCOUNTS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAllLedgerAccounts() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const ledgerKeys = allKeys.filter(key => key.startsWith(this.LEDGER_KEY));

      const accounts = [];

      for (const key of ledgerKeys) {
        const accountCode = key.replace(`${this.LEDGER_KEY}_`, '');
        const result = await this.getLedgerAccount(accountCode);
        
        if (result.success && result.data.length > 0) {
          accounts.push({
            accountCode,
            accountName: result.accountName,
            summary: result.summary
          });
        }
      }

      return {
        success: true,
        data: accounts,
        count: accounts.length
      };
    } catch (error) {
      console.error('Get all ledger accounts error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE LEDGER HTML FOR PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateLedgerHTML(accountCode, accountName, ledger, summary, period = '') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ledger - ${accountName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 10pt; }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 { font-size: 18pt; margin-bottom: 5px; }
    .header .account-name { font-size: 14pt; font-weight: bold; color: #333; }
    .header .period { font-size: 11pt; color: #666; }
    
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .ledger-table th {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 8px 5px;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    .ledger-table td {
      border: 1px solid #000;
      padding: 6px 5px;
      font-size: 9pt;
      vertical-align: top;
    }
    
    .ledger-table .date-col { width: 12%; text-align: center; }
    .ledger-table .particulars-col { width: 35%; text-align: left; }
    .ledger-table .voucher-col { width: 13%; text-align: center; }
    .ledger-table .debit-col,
    .ledger-table .credit-col,
    .ledger-table .balance-col {
      width: 13.33%;
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    .ledger-table .total-row {
      background: #f9f9f9;
      font-weight: bold;
      border-top: 2px solid #000;
    }
    
    .summary {
      margin-top: 20px;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #000;
    }
    
    .summary h3 { font-size: 12pt; margin-bottom: 10px; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 10pt;
    }
    
    .summary-row.balance {
      font-weight: bold;
      font-size: 12pt;
      border-top: 2px solid #000;
      padding-top: 10px;
      margin-top: 5px;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LEDGER ACCOUNT</h1>
    <div class="account-name">${accountName} (A/c Code: ${accountCode})</div>
    ${period ? `<div class="period">${period}</div>` : ''}
  </div>
  
  <table class="ledger-table">
    <thead>
      <tr>
        <th class="date-col">Date</th>
        <th class="particulars-col">Particulars</th>
        <th class="voucher-col">Voucher No.</th>
        <th class="debit-col">Debit (₹)</th>
        <th class="credit-col">Credit (₹)</th>
        <th class="balance-col">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${this.generateLedgerRows(ledger)}
      <tr class="total-row">
        <td colspan="3" style="text-align: right; padding-right: 10px;">
          <strong>Total:</strong>
        </td>
        <td class="debit-col"><strong>${summary.totalDebit}</strong></td>
        <td class="credit-col"><strong>${summary.totalCredit}</strong></td>
        <td class="balance-col"><strong>${summary.balance}</strong></td>
      </tr>
    </tbody>
  </table>
  
  <div class="summary">
    <h3>Summary</h3>
    <div class="summary-row">
      <span>Total Entries:</span>
      <span>${summary.entries}</span>
    </div>
    <div class="summary-row">
      <span>Total Debit:</span>
      <span>₹ ${summary.totalDebit}</span>
    </div>
    <div class="summary-row">
      <span>Total Credit:</span>
      <span>₹ ${summary.totalCredit}</span>
    </div>
    <div class="summary-row balance">
      <span>Closing Balance:</span>
      <span>₹ ${summary.balance}</span>
    </div>
  </div>
  
  <div class="footer">
    Generated on ${moment().format('DD-MMM-YYYY hh:mm A')} | MindStack Accounting System
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate ledger rows HTML
   */
  static generateLedgerRows(ledger) {
    let html = '';

    ledger.forEach(entry => {
      html += `
      <tr>
        <td class="date-col">${entry.dateFormatted}</td>
        <td class="particulars-col">${entry.particulars}</td>
        <td class="voucher-col">${entry.voucherNumber}</td>
        <td class="debit-col">${entry.debitFormatted}</td>
        <td class="credit-col">${entry.creditFormatted}</td>
        <td class="balance-col">${entry.balance}</td>
      </tr>
      `;
    });

    return html;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE LEDGER PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateLedgerPDF(accountCode, filters = {}) {
    try {
      const result = await this.getLedgerAccount(accountCode, filters);
      
      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          error: 'No entries found for this account'
        };
      }

      let period = '';
      if (filters.fromDate && filters.toDate) {
        period = `Period: ${moment(filters.fromDate).format('DD-MMM-YYYY')} to ${moment(filters.toDate).format('DD-MMM-YYYY')}`;
      }

      const html = this.generateLedgerHTML(
        accountCode,
        result.accountName,
        result.data,
        result.summary,
        period
      );

      // Use react-native-print
      const { RNPrint } = require('react-native-print');
      
      const pdfResult = await RNPrint.print({
        html,
        fileName: `ledger_${accountCode}_${moment().format('YYYYMMDD_HHmmss')}.pdf`
      });

      return {
        success: true,
        data: pdfResult,
        message: 'Ledger PDF generated successfully'
      };
    } catch (error) {
      console.error('Generate ledger PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default LedgerService;
