/**
 * ═══════════════════════════════════════════════════════════════════════════
 * JOURNAL BOOK SERVICE - TRADITIONAL INDIAN FORMAT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Creates traditional Indian journal book with:
 * - A4 size paper format
 * - Columns: Date | Particulars | L.F. | Debit | Credit
 * - Boxed entries for professional look
 * - Month-wise and day-wise search
 * - PDF generation for printing
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalService } from './journalService';
import moment from 'moment';

export class JournalBookService {
  static JOURNAL_BOOK_KEY = '@mindstack_journal_book';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECORD TRANSACTION IN JOURNAL BOOK
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * When user enters transaction in main screen, it gets recorded in:
   * 1. Journal Entry (double-entry system)
   * 2. Journal Book (traditional format)
   * 3. Ledger (account-wise)
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async recordInJournalBook(journalEntry) {
    try {
      // Create journal book entry in traditional format
      const bookEntry = {
        id: journalEntry.id,
        voucherNumber: journalEntry.voucherNumber,
        voucherType: journalEntry.voucherType,
        date: journalEntry.date,
        dateFormatted: moment(journalEntry.date).format('DD-MMM-YYYY'),
        day: moment(journalEntry.date).format('DD'),
        month: moment(journalEntry.date).format('MMMM'),
        year: moment(journalEntry.date).format('YYYY'),
        monthYear: moment(journalEntry.date).format('MMMM YYYY'),
        financialYear: journalEntry.financialYear,
        
        // Traditional journal book format
        entries: journalEntry.entries.map((entry, index) => ({
          lineNumber: index + 1,
          date: index === 0 ? moment(journalEntry.date).format('DD-MMM-YYYY') : '', // Date only on first line
          particulars: this.formatParticulars(entry, journalEntry.narration, index),
          lf: this.getLedgerFolio(entry.accountCode), // Ledger Folio reference
          debit: entry.debit > 0 ? this.formatAmount(entry.debit) : '',
          credit: entry.credit > 0 ? this.formatAmount(entry.credit) : '',
          debitAmount: entry.debit,
          creditAmount: entry.credit
        })),
        
        // Totals
        totalDebit: this.formatAmount(journalEntry.totalDebit),
        totalCredit: this.formatAmount(journalEntry.totalCredit),
        
        // Additional info
        narration: journalEntry.narration,
        reference: journalEntry.reference,
        createdAt: journalEntry.createdAt,
        
        // For search and filtering
        searchText: `${journalEntry.voucherNumber} ${journalEntry.narration} ${journalEntry.entries.map(e => e.accountName).join(' ')}`.toLowerCase()
      };

      // Save to journal book
      await this.saveToJournalBook(bookEntry);

      return {
        success: true,
        data: bookEntry,
        message: 'Transaction recorded in journal book'
      };
    } catch (error) {
      console.error('Record in journal book error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format particulars column (traditional Indian style)
   */
  static formatParticulars(entry, narration, index) {
    if (entry.debit > 0) {
      // Debit entry - account name followed by "Dr."
      return `${entry.accountName} A/c Dr.`;
    } else {
      // Credit entry - indented with "To" prefix
      return `    To ${entry.accountName} A/c`;
    }
  }

  /**
   * Get Ledger Folio (page reference)
   */
  static getLedgerFolio(accountCode) {
    // In traditional books, L.F. is the page number in ledger
    // We'll use account code as reference
    return accountCode.substring(0, 5);
  }

  /**
   * Format amount in Indian style (with commas)
   */
  static formatAmount(amount) {
    if (!amount || amount === 0) return '';
    
    // Indian numbering system: 1,00,000.00
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Save to journal book storage
   */
  static async saveToJournalBook(bookEntry) {
    try {
      const existingData = await AsyncStorage.getItem(this.JOURNAL_BOOK_KEY);
      const journalBook = existingData ? JSON.parse(existingData) : [];

      journalBook.unshift(bookEntry);

      await AsyncStorage.setItem(this.JOURNAL_BOOK_KEY, JSON.stringify(journalBook));

      return { success: true };
    } catch (error) {
      console.error('Save to journal book error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET JOURNAL BOOK ENTRIES - WITH FILTERS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getJournalBook(filters = {}) {
    try {
      const data = await AsyncStorage.getItem(this.JOURNAL_BOOK_KEY);
      let entries = data ? JSON.parse(data) : [];

      // Filter by date range
      if (filters.fromDate) {
        entries = entries.filter(e => 
          moment(e.date).isSameOrAfter(moment(filters.fromDate), 'day')
        );
      }

      if (filters.toDate) {
        entries = entries.filter(e => 
          moment(e.date).isSameOrBefore(moment(filters.toDate), 'day')
        );
      }

      // Filter by month
      if (filters.month) {
        entries = entries.filter(e => e.month === filters.month);
      }

      // Filter by year
      if (filters.year) {
        entries = entries.filter(e => e.year === filters.year);
      }

      // Filter by month-year
      if (filters.monthYear) {
        entries = entries.filter(e => e.monthYear === filters.monthYear);
      }

      // Filter by financial year
      if (filters.financialYear) {
        entries = entries.filter(e => e.financialYear.year === filters.financialYear);
      }

      // Filter by voucher type
      if (filters.voucherType) {
        entries = entries.filter(e => e.voucherType === filters.voucherType);
      }

      // Search by text
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        entries = entries.filter(e => e.searchText.includes(searchLower));
      }

      return {
        success: true,
        data: entries,
        count: entries.length,
        summary: this.generateSummary(entries)
      };
    } catch (error) {
      console.error('Get journal book error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Generate summary statistics
   */
  static generateSummary(entries) {
    const totalDebit = entries.reduce((sum, e) => {
      return sum + e.entries.reduce((s, entry) => s + entry.debitAmount, 0);
    }, 0);

    const totalCredit = entries.reduce((sum, e) => {
      return sum + e.entries.reduce((s, entry) => s + entry.creditAmount, 0);
    }, 0);

    return {
      totalEntries: entries.length,
      totalDebit: this.formatAmount(totalDebit),
      totalCredit: this.formatAmount(totalCredit),
      totalDebitRaw: totalDebit,
      totalCreditRaw: totalCredit
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET JOURNAL BOOK BY MONTH
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getJournalBookByMonth(month, year) {
    return await this.getJournalBook({
      month,
      year
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET JOURNAL BOOK BY DATE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getJournalBookByDate(date) {
    return await this.getJournalBook({
      fromDate: date,
      toDate: date
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SEARCH JOURNAL BOOK
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async searchJournalBook(searchText) {
    return await this.getJournalBook({
      searchText
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE JOURNAL BOOK HTML FOR PDF
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Creates traditional Indian journal book format in HTML
   * Ready for PDF conversion
   * 
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateJournalBookHTML(entries, title = 'JOURNAL BOOK') {
    const summary = this.generateSummary(entries);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header .period {
      font-size: 11pt;
      color: #333;
    }
    
    .journal-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .journal-table th {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 8px 5px;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    .journal-table td {
      border: 1px solid #000;
      padding: 6px 5px;
      font-size: 9pt;
      vertical-align: top;
    }
    
    .journal-table .date-col {
      width: 12%;
      text-align: center;
    }
    
    .journal-table .particulars-col {
      width: 48%;
      text-align: left;
    }
    
    .journal-table .lf-col {
      width: 8%;
      text-align: center;
    }
    
    .journal-table .debit-col,
    .journal-table .credit-col {
      width: 16%;
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    .journal-table .particulars-debit {
      font-weight: bold;
    }
    
    .journal-table .particulars-credit {
      padding-left: 20px;
    }
    
    .journal-table .narration-row td {
      border-top: none;
      padding-top: 2px;
      font-style: italic;
      color: #555;
    }
    
    .journal-table .total-row {
      background: #f9f9f9;
      font-weight: bold;
    }
    
    .journal-table .total-row td {
      border-top: 2px solid #000;
      padding: 8px 5px;
    }
    
    .voucher-separator {
      height: 10px;
      border: none;
    }
    
    .summary {
      margin-top: 20px;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #000;
    }
    
    .summary h3 {
      font-size: 12pt;
      margin-bottom: 10px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 10pt;
    }
    
    .summary-row.total {
      font-weight: bold;
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
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .page {
        box-shadow: none;
        margin: 0;
        padding: 15mm;
      }
      
      .page-break {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <h1>JOURNAL BOOK</h1>
      <div class="period">${title}</div>
    </div>
    
    <!-- Journal Table -->
    <table class="journal-table">
      <thead>
        <tr>
          <th class="date-col">Date</th>
          <th class="particulars-col">Particulars</th>
          <th class="lf-col">L.F.</th>
          <th class="debit-col">Debit (₹)</th>
          <th class="credit-col">Credit (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateJournalRows(entries)}
      </tbody>
    </table>
    
    <!-- Summary -->
    <div class="summary">
      <h3>Summary</h3>
      <div class="summary-row">
        <span>Total Entries:</span>
        <span>${summary.totalEntries}</span>
      </div>
      <div class="summary-row total">
        <span>Total Debit:</span>
        <span>₹ ${summary.totalDebit}</span>
      </div>
      <div class="summary-row total">
        <span>Total Credit:</span>
        <span>₹ ${summary.totalCredit}</span>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      Generated on ${moment().format('DD-MMM-YYYY hh:mm A')} | MindStack Accounting System
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate journal rows HTML
   */
  static generateJournalRows(entries) {
    let html = '';

    entries.forEach((entry, entryIndex) => {
      // Add each line of the journal entry
      entry.entries.forEach((line, lineIndex) => {
        html += `
        <tr>
          <td class="date-col">${line.date}</td>
          <td class="particulars-col ${line.debitAmount > 0 ? 'particulars-debit' : 'particulars-credit'}">
            ${line.particulars}
          </td>
          <td class="lf-col">${line.lf}</td>
          <td class="debit-col">${line.debit}</td>
          <td class="credit-col">${line.credit}</td>
        </tr>
        `;
      });

      // Add narration row
      html += `
      <tr class="narration-row">
        <td></td>
        <td colspan="4" style="padding-left: 30px;">
          <em>(Being ${entry.narration})</em>
          ${entry.reference ? `<br><small>Ref: ${entry.reference}</small>` : ''}
        </td>
      </tr>
      `;

      // Add total row for this voucher
      html += `
      <tr class="total-row">
        <td colspan="3" style="text-align: right; padding-right: 10px;">
          <strong>Voucher Total:</strong>
        </td>
        <td class="debit-col"><strong>${entry.totalDebit}</strong></td>
        <td class="credit-col"><strong>${entry.totalCredit}</strong></td>
      </tr>
      `;

      // Add separator between vouchers
      if (entryIndex < entries.length - 1) {
        html += `<tr class="voucher-separator"><td colspan="5"></td></tr>`;
      }
    });

    return html;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE PDF (React Native)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePDF(entries, title = 'JOURNAL BOOK') {
    try {
      const html = this.generateJournalBookHTML(entries, title);
      
      // Use react-native-print to generate PDF
      const { RNPrint } = require('react-native-print');
      
      const result = await RNPrint.print({
        html,
        fileName: `journal_book_${moment().format('YYYYMMDD_HHmmss')}.pdf`
      });

      return {
        success: true,
        data: result,
        message: 'PDF generated successfully'
      };
    } catch (error) {
      console.error('Generate PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SHARE PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async sharePDF(entries, title = 'JOURNAL BOOK') {
    try {
      const html = this.generateJournalBookHTML(entries, title);
      
      // Use react-native-share to share PDF
      const { Share } = require('react-native');
      
      const result = await Share.share({
        message: `Journal Book - ${title}`,
        title: 'Journal Book',
        url: html // In production, convert to PDF file first
      });

      return {
        success: true,
        data: result,
        message: 'PDF shared successfully'
      };
    } catch (error) {
      console.error('Share PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET AVAILABLE MONTHS (for dropdown/filter)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAvailableMonths() {
    try {
      const data = await AsyncStorage.getItem(this.JOURNAL_BOOK_KEY);
      const entries = data ? JSON.parse(data) : [];

      const months = [...new Set(entries.map(e => e.monthYear))];
      months.sort((a, b) => moment(a, 'MMMM YYYY').diff(moment(b, 'MMMM YYYY')));

      return {
        success: true,
        data: months
      };
    } catch (error) {
      console.error('Get available months error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

export default JournalBookService;
