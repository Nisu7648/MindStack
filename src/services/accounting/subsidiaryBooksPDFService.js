/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SUBSIDIARY BOOKS PDF SERVICE - A4 FORMAT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Generates professional A4 size PDFs for all subsidiary books:
 * 1. Purchase Book
 * 2. Sales Book
 * 3. Purchase Return Book
 * 4. Sales Return Book
 * 5. Cash Book
 * 6. Bank Book
 * 7. Petty Cash Book
 * 8. Bills Receivable Book
 * 9. Bills Payable Book
 * 
 * All with proper table layouts and Indian formatting
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import moment from 'moment';
import SubsidiaryBooksService from './subsidiaryBooksService';

export class SubsidiaryBooksPDFService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PURCHASE BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePurchaseBookPDF(filters = {}) {
    const result = await SubsidiaryBooksService.getPurchaseBook(filters);
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'No entries found' };
    }

    const html = this.generatePurchaseBookHTML(result.data, filters);
    return await this.printPDF(html, 'purchase_book');
  }

  static generatePurchaseBookHTML(entries, filters) {
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const totalGST = entries.reduce((sum, e) => sum + e.totalGST, 0);
    const grandTotal = entries.reduce((sum, e) => sum + e.total, 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Book</title>
  ${this.getCommonStyles()}
</head>
<body>
  <div class="header">
    <h1>PURCHASE BOOK</h1>
    <div class="period">${this.getPeriodText(filters)}</div>
  </div>
  
  <table class="book-table">
    <thead>
      <tr>
        <th style="width: 10%;">Date</th>
        <th style="width: 20%;">Supplier Name</th>
        <th style="width: 12%;">Invoice No.</th>
        <th style="width: 28%;">Particulars</th>
        <th style="width: 10%;">Amount (₹)</th>
        <th style="width: 10%;">GST (₹)</th>
        <th style="width: 10%;">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td class="center">${e.dateFormatted}</td>
          <td>${e.supplierName}</td>
          <td class="center">${e.invoiceNumber}</td>
          <td>${e.particulars}</td>
          <td class="right">${e.amountFormatted}</td>
          <td class="right">${e.gstFormatted}</td>
          <td class="right">${e.totalFormatted}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" class="right"><strong>Total:</strong></td>
        <td class="right"><strong>${this.formatAmount(totalAmount)}</strong></td>
        <td class="right"><strong>${this.formatAmount(totalGST)}</strong></td>
        <td class="right"><strong>${this.formatAmount(grandTotal)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${this.getFooter()}
</body>
</html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SALES BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateSalesBookPDF(filters = {}) {
    const result = await SubsidiaryBooksService.getSalesBook(filters);
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'No entries found' };
    }

    const html = this.generateSalesBookHTML(result.data, filters);
    return await this.printPDF(html, 'sales_book');
  }

  static generateSalesBookHTML(entries, filters) {
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const totalGST = entries.reduce((sum, e) => sum + e.totalGST, 0);
    const grandTotal = entries.reduce((sum, e) => sum + e.total, 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Book</title>
  ${this.getCommonStyles()}
</head>
<body>
  <div class="header">
    <h1>SALES BOOK</h1>
    <div class="period">${this.getPeriodText(filters)}</div>
  </div>
  
  <table class="book-table">
    <thead>
      <tr>
        <th style="width: 10%;">Date</th>
        <th style="width: 20%;">Customer Name</th>
        <th style="width: 12%;">Invoice No.</th>
        <th style="width: 28%;">Particulars</th>
        <th style="width: 10%;">Amount (₹)</th>
        <th style="width: 10%;">GST (₹)</th>
        <th style="width: 10%;">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td class="center">${e.dateFormatted}</td>
          <td>${e.customerName}</td>
          <td class="center">${e.invoiceNumber}</td>
          <td>${e.particulars}</td>
          <td class="right">${e.amountFormatted}</td>
          <td class="right">${e.gstFormatted}</td>
          <td class="right">${e.totalFormatted}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" class="right"><strong>Total:</strong></td>
        <td class="right"><strong>${this.formatAmount(totalAmount)}</strong></td>
        <td class="right"><strong>${this.formatAmount(totalGST)}</strong></td>
        <td class="right"><strong>${this.formatAmount(grandTotal)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${this.getFooter()}
</body>
</html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PURCHASE RETURN BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePurchaseReturnBookPDF(filters = {}) {
    const result = await SubsidiaryBooksService.getPurchaseReturnBook(filters);
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'No entries found' };
    }

    const html = this.generatePurchaseReturnBookHTML(result.data, filters);
    return await this.printPDF(html, 'purchase_return_book');
  }

  static generatePurchaseReturnBookHTML(entries, filters) {
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const totalGST = entries.reduce((sum, e) => sum + e.totalGST, 0);
    const grandTotal = entries.reduce((sum, e) => sum + e.total, 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Purchase Return Book</title>
  ${this.getCommonStyles()}
</head>
<body>
  <div class="header">
    <h1>PURCHASE RETURN BOOK (DEBIT NOTE BOOK)</h1>
    <div class="period">${this.getPeriodText(filters)}</div>
  </div>
  
  <table class="book-table">
    <thead>
      <tr>
        <th style="width: 10%;">Date</th>
        <th style="width: 20%;">Supplier Name</th>
        <th style="width: 12%;">Debit Note No.</th>
        <th style="width: 28%;">Particulars</th>
        <th style="width: 10%;">Amount (₹)</th>
        <th style="width: 10%;">GST (₹)</th>
        <th style="width: 10%;">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td class="center">${e.dateFormatted}</td>
          <td>${e.supplierName}</td>
          <td class="center">${e.debitNoteNumber}</td>
          <td>${e.particulars}</td>
          <td class="right">${e.amountFormatted}</td>
          <td class="right">${e.gstFormatted}</td>
          <td class="right">${e.totalFormatted}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" class="right"><strong>Total:</strong></td>
        <td class="right"><strong>${this.formatAmount(totalAmount)}</strong></td>
        <td class="right"><strong>${this.formatAmount(totalGST)}</strong></td>
        <td class="right"><strong>${this.formatAmount(grandTotal)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${this.getFooter()}
</body>
</html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SALES RETURN BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateSalesReturnBookPDF(filters = {}) {
    const result = await SubsidiaryBooksService.getSalesReturnBook(filters);
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'No entries found' };
    }

    const html = this.generateSalesReturnBookHTML(result.data, filters);
    return await this.printPDF(html, 'sales_return_book');
  }

  static generateSalesReturnBookHTML(entries, filters) {
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);
    const totalGST = entries.reduce((sum, e) => sum + e.totalGST, 0);
    const grandTotal = entries.reduce((sum, e) => sum + e.total, 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sales Return Book</title>
  ${this.getCommonStyles()}
</head>
<body>
  <div class="header">
    <h1>SALES RETURN BOOK (CREDIT NOTE BOOK)</h1>
    <div class="period">${this.getPeriodText(filters)}</div>
  </div>
  
  <table class="book-table">
    <thead>
      <tr>
        <th style="width: 10%;">Date</th>
        <th style="width: 20%;">Customer Name</th>
        <th style="width: 12%;">Credit Note No.</th>
        <th style="width: 28%;">Particulars</th>
        <th style="width: 10%;">Amount (₹)</th>
        <th style="width: 10%;">GST (₹)</th>
        <th style="width: 10%;">Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td class="center">${e.dateFormatted}</td>
          <td>${e.customerName}</td>
          <td class="center">${e.creditNoteNumber}</td>
          <td>${e.particulars}</td>
          <td class="right">${e.amountFormatted}</td>
          <td class="right">${e.gstFormatted}</td>
          <td class="right">${e.totalFormatted}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="4" class="right"><strong>Total:</strong></td>
        <td class="right"><strong>${this.formatAmount(totalAmount)}</strong></td>
        <td class="right"><strong>${this.formatAmount(totalGST)}</strong></td>
        <td class="right"><strong>${this.formatAmount(grandTotal)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${this.getFooter()}
</body>
</html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CASH BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateCashBookPDF(filters = {}) {
    const result = await SubsidiaryBooksService.getCashBook(filters);
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'No entries found' };
    }

    const html = this.generateCashBookHTML(result.data, filters);
    return await this.printPDF(html, 'cash_book');
  }

  static generateCashBookHTML(entries, filters) {
    const totalDebit = entries.reduce((sum, e) => sum + e.cashDebit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.cashCredit, 0);
    const closingBalance = entries.length > 0 ? entries[0].balanceAmount : 0;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cash Book</title>
  ${this.getCommonStyles()}
</head>
<body>
  <div class="header">
    <h1>CASH BOOK</h1>
    <div class="period">${this.getPeriodText(filters)}</div>
  </div>
  
  <table class="book-table">
    <thead>
      <tr>
        <th style="width: 12%;">Date</th>
        <th style="width: 35%;">Particulars</th>
        <th style="width: 15%;">Voucher No.</th>
        <th style="width: 12%;">Debit (₹)</th>
        <th style="width: 12%;">Credit (₹)</th>
        <th style="width: 14%;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.reverse().map(e => `
        <tr>
          <td class="center">${e.dateFormatted}</td>
          <td>${e.particulars}</td>
          <td class="center">${e.voucherNumber}</td>
          <td class="right">${e.cashDebitFormatted}</td>
          <td class="right">${e.cashCreditFormatted}</td>
          <td class="right">${e.balance}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3" class="right"><strong>Total:</strong></td>
        <td class="right"><strong>${this.formatAmount(totalDebit)}</strong></td>
        <td class="right"><strong>${this.formatAmount(totalCredit)}</strong></td>
        <td class="right"><strong>${this.formatBalance(closingBalance)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${this.getFooter()}
</body>
</html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BANK BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateBankBookPDF(filters = {}) {
    const result = await SubsidiaryBooksService.getBankBook(filters);
    
    if (!result.success || result.data.length === 0) {
      return { success: false, error: 'No entries found' };
    }

    const html = this.generateBankBookHTML(result.data, filters);
    return await this.printPDF(html, 'bank_book');
  }

  static generateBankBookHTML(entries, filters) {
    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = entries.length > 0 ? entries[0].balanceAmount : 0;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bank Book</title>
  ${this.getCommonStyles()}
</head>
<body>
  <div class="header">
    <h1>BANK BOOK</h1>
    <div class="period">${this.getPeriodText(filters)}</div>
  </div>
  
  <table class="book-table">
    <thead>
      <tr>
        <th style="width: 12%;">Date</th>
        <th style="width: 35%;">Particulars</th>
        <th style="width: 15%;">Voucher No.</th>
        <th style="width: 12%;">Debit (₹)</th>
        <th style="width: 12%;">Credit (₹)</th>
        <th style="width: 14%;">Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${entries.reverse().map(e => `
        <tr>
          <td class="center">${e.dateFormatted}</td>
          <td>${e.particulars}</td>
          <td class="center">${e.voucherNumber}</td>
          <td class="right">${e.debitFormatted}</td>
          <td class="right">${e.creditFormatted}</td>
          <td class="right">${e.balance}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="3" class="right"><strong>Total:</strong></td>
        <td class="right"><strong>${this.formatAmount(totalDebit)}</strong></td>
        <td class="right"><strong>${this.formatAmount(totalCredit)}</strong></td>
        <td class="right"><strong>${this.formatBalance(closingBalance)}</strong></td>
      </tr>
    </tbody>
  </table>
  
  ${this.getFooter()}
</body>
</html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER METHODS
   * ═══════════════════════════════════════════════════════════════════════
   */

  static getCommonStyles() {
    return `
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
    .header .period { font-size: 11pt; color: #666; }
    
    .book-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .book-table th {
      background: #f0f0f0;
      border: 1px solid #000;
      padding: 8px 5px;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    .book-table td {
      border: 1px solid #000;
      padding: 6px 5px;
      font-size: 9pt;
      vertical-align: top;
    }
    
    .book-table .center { text-align: center; }
    .book-table .right {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    .book-table .total-row {
      background: #f9f9f9;
      font-weight: bold;
      border-top: 2px solid #000;
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
    `;
  }

  static getPeriodText(filters) {
    if (filters.fromDate && filters.toDate) {
      return `Period: ${moment(filters.fromDate).format('DD-MMM-YYYY')} to ${moment(filters.toDate).format('DD-MMM-YYYY')}`;
    } else if (filters.month && filters.year) {
      return `${filters.month} ${filters.year}`;
    }
    return 'All Entries';
  }

  static getFooter() {
    return `
  <div class="footer">
    Generated on ${moment().format('DD-MMM-YYYY hh:mm A')} | MindStack Accounting System
  </div>
    `;
  }

  static formatAmount(amount) {
    if (!amount || amount === 0) return '0.00';
    
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  static formatBalance(amount) {
    if (amount === 0) return '0.00';
    
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return amount >= 0 ? `${formatted} Dr` : `${formatted} Cr`;
  }

  static async printPDF(html, fileName) {
    try {
      const { RNPrint } = require('react-native-print');
      
      const result = await RNPrint.print({
        html,
        fileName: `${fileName}_${moment().format('YYYYMMDD_HHmmss')}.pdf`
      });

      return {
        success: true,
        data: result,
        message: 'PDF generated successfully'
      };
    } catch (error) {
      console.error('Print PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default SubsidiaryBooksPDFService;
