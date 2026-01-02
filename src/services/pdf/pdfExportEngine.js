/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COMPLETE PDF EXPORT ENGINE - ALL TABLES & REPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ONE-CLICK PDF EXPORT FOR:
 * - All Accounting Books (9 Subsidiary Books)
 * - All POS Reports (Sales, Purchases, Inventory)
 * - Financial Statements (Trial Balance, P&L, Balance Sheet)
 * - Day Reports, Stock Reports, GST Reports
 * 
 * FEATURES:
 * - Professional Indian format
 * - Company letterhead
 * - GST compliant
 * - Print ready
 * - Download ready
 * - Share via WhatsApp/Email
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import moment from 'moment';
import DatabaseService from '../database/databaseService';

export class PDFExportEngine {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * MASTER PDF GENERATOR - ONE CLICK EXPORT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePDF(reportType, data, options = {}) {
    try {
      const html = await this.generateHTML(reportType, data, options);
      
      const fileName = `${reportType}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
      
      const pdfOptions = {
        html: html,
        fileName: fileName,
        directory: 'Documents/MindStack',
        base64: false,
        ...options.pdfOptions
      };

      const file = await RNHTMLtoPDF.convert(pdfOptions);

      // Log PDF generation
      await this.logPDFGeneration(reportType, file.filePath, options.periodId);

      return {
        success: true,
        filePath: file.filePath,
        fileName: fileName,
        message: 'PDF generated successfully'
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT PDF DIRECTLY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async printPDF(reportType, data, options = {}) {
    try {
      const html = await this.generateHTML(reportType, data, options);

      await RNPrint.print({
        html: html,
        ...options.printOptions
      });

      return { success: true, message: 'Print job sent successfully' };
    } catch (error) {
      console.error('Print error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SHARE PDF (WhatsApp/Email/etc)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async sharePDF(filePath, options = {}) {
    try {
      const shareOptions = {
        title: options.title || 'Share Report',
        message: options.message || 'MindStack Report',
        url: `file://${filePath}`,
        type: 'application/pdf',
        ...options.shareOptions
      };

      await Share.open(shareOptions);

      return { success: true, message: 'Share dialog opened' };
    } catch (error) {
      console.error('Share error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE HTML FOR DIFFERENT REPORT TYPES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateHTML(reportType, data, options = {}) {
    const companyInfo = await this.getCompanyInfo();
    
    const header = this.generateHeader(companyInfo, options.title || reportType);
    const footer = this.generateFooter();
    const styles = this.getStyles();

    let content = '';

    switch (reportType) {
      // ═══════════════════════════════════════════════════════════════════
      // ACCOUNTING BOOKS
      // ═══════════════════════════════════════════════════════════════════
      case 'CASH_BOOK':
        content = this.generateCashBookHTML(data, options);
        break;
      case 'BANK_BOOK':
        content = this.generateBankBookHTML(data, options);
        break;
      case 'PETTY_CASH_BOOK':
        content = this.generatePettyCashBookHTML(data, options);
        break;
      case 'PURCHASE_BOOK':
        content = this.generatePurchaseBookHTML(data, options);
        break;
      case 'SALES_BOOK':
        content = this.generateSalesBookHTML(data, options);
        break;
      case 'PURCHASE_RETURN_BOOK':
        content = this.generatePurchaseReturnBookHTML(data, options);
        break;
      case 'SALES_RETURN_BOOK':
        content = this.generateSalesReturnBookHTML(data, options);
        break;
      case 'BILLS_RECEIVABLE_BOOK':
        content = this.generateBillsReceivableBookHTML(data, options);
        break;
      case 'BILLS_PAYABLE_BOOK':
        content = this.generateBillsPayableBookHTML(data, options);
        break;
      case 'JOURNAL':
        content = this.generateJournalHTML(data, options);
        break;
      case 'LEDGER':
        content = this.generateLedgerHTML(data, options);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // FINANCIAL STATEMENTS
      // ═══════════════════════════════════════════════════════════════════
      case 'TRIAL_BALANCE':
        content = this.generateTrialBalanceHTML(data, options);
        break;
      case 'TRADING_ACCOUNT':
        content = this.generateTradingAccountHTML(data, options);
        break;
      case 'PROFIT_LOSS':
        content = this.generateProfitLossHTML(data, options);
        break;
      case 'BALANCE_SHEET':
        content = this.generateBalanceSheetHTML(data, options);
        break;

      // ═══════════════════════════════════════════════════════════════════
      // POS REPORTS
      // ═══════════════════════════════════════════════════════════════════
      case 'INVOICE':
        content = this.generateInvoiceHTML(data, options);
        break;
      case 'SALES_REPORT':
        content = this.generateSalesReportHTML(data, options);
        break;
      case 'PURCHASE_REPORT':
        content = this.generatePurchaseReportHTML(data, options);
        break;
      case 'STOCK_REPORT':
        content = this.generateStockReportHTML(data, options);
        break;
      case 'DAY_CLOSING_REPORT':
        content = this.generateDayClosingReportHTML(data, options);
        break;
      case 'GST_REPORT':
        content = this.generateGSTReportHTML(data, options);
        break;
      case 'PRODUCT_LIST':
        content = this.generateProductListHTML(data, options);
        break;
      case 'LOW_STOCK_REPORT':
        content = this.generateLowStockReportHTML(data, options);
        break;

      default:
        content = '<p>Report type not supported</p>';
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${options.title || reportType}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${header}
          ${content}
          ${footer}
        </body>
      </html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE HEADER (COMPANY LETTERHEAD)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateHeader(companyInfo, title) {
    return `
      <div class="header">
        <div class="company-name">${companyInfo.company_name || 'MindStack Business'}</div>
        <div class="company-details">
          ${companyInfo.address || ''}<br>
          ${companyInfo.city ? companyInfo.city + ', ' : ''}${companyInfo.state || ''} ${companyInfo.pincode || ''}<br>
          ${companyInfo.phone ? 'Phone: ' + companyInfo.phone : ''} 
          ${companyInfo.email ? '| Email: ' + companyInfo.email : ''}<br>
          ${companyInfo.gstin ? 'GSTIN: ' + companyInfo.gstin : ''} 
          ${companyInfo.pan ? '| PAN: ' + companyInfo.pan : ''}
        </div>
        <div class="report-title">${title}</div>
        <div class="report-date">Generated on: ${moment().format('DD-MMM-YYYY hh:mm A')}</div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE FOOTER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateFooter() {
    return `
      <div class="footer">
        <div class="footer-left">Generated by MindStack POS & Accounting System</div>
        <div class="footer-right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CSS STYLES (PROFESSIONAL INDIAN FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getStyles() {
    return `
      @page {
        size: A4;
        margin: 15mm;
      }
      
      body {
        font-family: 'Arial', sans-serif;
        font-size: 10pt;
        line-height: 1.4;
        color: #000;
      }
      
      .header {
        text-align: center;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      
      .company-name {
        font-size: 18pt;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .company-details {
        font-size: 9pt;
        margin-bottom: 10px;
      }
      
      .report-title {
        font-size: 14pt;
        font-weight: bold;
        margin-top: 10px;
        text-transform: uppercase;
      }
      
      .report-date {
        font-size: 9pt;
        color: #666;
        margin-top: 5px;
      }
      
      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        border-top: 1px solid #000;
        padding-top: 5px;
        font-size: 8pt;
        display: flex;
        justify-content: space-between;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      
      th {
        background-color: #f0f0f0;
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
        font-weight: bold;
      }
      
      td {
        border: 1px solid #000;
        padding: 6px;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-center {
        text-align: center;
      }
      
      .total-row {
        font-weight: bold;
        background-color: #f9f9f9;
      }
      
      .double-sided-table {
        display: flex;
        gap: 10px;
      }
      
      .double-sided-table > div {
        flex: 1;
      }
      
      .section-title {
        font-size: 12pt;
        font-weight: bold;
        margin-top: 15px;
        margin-bottom: 10px;
        border-bottom: 1px solid #000;
        padding-bottom: 5px;
      }
      
      .summary-box {
        border: 1px solid #000;
        padding: 10px;
        margin-bottom: 15px;
        background-color: #f9f9f9;
      }
      
      .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }
      
      .amount {
        font-family: 'Courier New', monospace;
      }
      
      .signature-section {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
      }
      
      .signature-box {
        text-align: center;
        width: 200px;
      }
      
      .signature-line {
        border-top: 1px solid #000;
        margin-top: 50px;
        padding-top: 5px;
      }
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CASH BOOK HTML (DOUBLE-SIDED FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateCashBookHTML(data, options) {
    const { entries, period } = data;
    
    let receipts = [];
    let payments = [];
    
    entries.forEach(entry => {
      if (entry.receipt_amount > 0) {
        receipts.push(entry);
      } else if (entry.payment_amount > 0) {
        payments.push(entry);
      }
    });

    const totalReceipts = receipts.reduce((sum, e) => sum + e.receipt_amount, 0);
    const totalPayments = payments.reduce((sum, e) => sum + e.payment_amount, 0);
    const balance = totalReceipts - totalPayments;

    return `
      <div class="section-title">Cash Book - ${period || 'All Transactions'}</div>
      
      <div class="double-sided-table">
        <div>
          <h4>RECEIPTS (Dr Side)</h4>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Voucher</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${receipts.map(entry => `
                <tr>
                  <td>${moment(entry.entry_date).format('DD-MMM-YY')}</td>
                  <td>${entry.particulars}</td>
                  <td>${entry.voucher_number}</td>
                  <td class="text-right amount">${this.formatAmount(entry.receipt_amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">TOTAL RECEIPTS</td>
                <td class="text-right amount">${this.formatAmount(totalReceipts)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h4>PAYMENTS (Cr Side)</h4>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Voucher</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(entry => `
                <tr>
                  <td>${moment(entry.entry_date).format('DD-MMM-YY')}</td>
                  <td>${entry.particulars}</td>
                  <td>${entry.voucher_number}</td>
                  <td class="text-right amount">${this.formatAmount(entry.payment_amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">TOTAL PAYMENTS</td>
                <td class="text-right amount">${this.formatAmount(totalPayments)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="summary-box">
        <div class="summary-row">
          <strong>Closing Balance:</strong>
          <span class="amount">${this.formatAmount(balance)} ${balance >= 0 ? 'Dr' : 'Cr'}</span>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INVOICE HTML (GST COMPLIANT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateInvoiceHTML(data, options) {
    const { invoice, items } = data;

    return `
      <div class="section-title">TAX INVOICE</div>
      
      <table style="margin-bottom: 15px; border: none;">
        <tr style="border: none;">
          <td style="border: none; width: 50%;">
            <strong>Invoice No:</strong> ${invoice.invoice_number}<br>
            <strong>Date:</strong> ${moment(invoice.invoice_date).format('DD-MMM-YYYY')}<br>
            <strong>Time:</strong> ${invoice.invoice_time}
          </td>
          <td style="border: none; width: 50%;">
            ${invoice.customer_name ? `<strong>Customer:</strong> ${invoice.customer_name}<br>` : ''}
            ${invoice.customer_phone ? `<strong>Phone:</strong> ${invoice.customer_phone}<br>` : ''}
            ${invoice.customer_gstin ? `<strong>GSTIN:</strong> ${invoice.customer_gstin}` : ''}
          </td>
        </tr>
      </table>
      
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product</th>
            <th>HSN</th>
            <th class="text-right">Qty</th>
            <th>Unit</th>
            <th class="text-right">Price</th>
            <th class="text-right">GST%</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${item.product_name}</td>
              <td>${item.hsn_code || '-'}</td>
              <td class="text-right">${item.quantity}</td>
              <td>${item.unit}</td>
              <td class="text-right amount">${this.formatAmount(item.price)}</td>
              <td class="text-right">${item.gst_percentage}%</td>
              <td class="text-right amount">${this.formatAmount(item.total_amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-left: auto; width: 300px;">
        <table>
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td class="text-right amount">${this.formatAmount(invoice.subtotal)}</td>
          </tr>
          ${invoice.discount_amount > 0 ? `
          <tr>
            <td><strong>Discount:</strong></td>
            <td class="text-right amount">- ${this.formatAmount(invoice.discount_amount)}</td>
          </tr>
          ` : ''}
          ${invoice.cgst_amount > 0 ? `
          <tr>
            <td><strong>CGST:</strong></td>
            <td class="text-right amount">${this.formatAmount(invoice.cgst_amount)}</td>
          </tr>
          ` : ''}
          ${invoice.sgst_amount > 0 ? `
          <tr>
            <td><strong>SGST:</strong></td>
            <td class="text-right amount">${this.formatAmount(invoice.sgst_amount)}</td>
          </tr>
          ` : ''}
          ${invoice.igst_amount > 0 ? `
          <tr>
            <td><strong>IGST:</strong></td>
            <td class="text-right amount">${this.formatAmount(invoice.igst_amount)}</td>
          </tr>
          ` : ''}
          ${invoice.round_off !== 0 ? `
          <tr>
            <td><strong>Round Off:</strong></td>
            <td class="text-right amount">${this.formatAmount(invoice.round_off)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>GRAND TOTAL:</strong></td>
            <td class="text-right amount"><strong>₹ ${this.formatAmount(invoice.grand_total)}</strong></td>
          </tr>
        </table>
      </div>
      
      <div style="margin-top: 20px;">
        <strong>Payment Mode:</strong> ${invoice.payment_mode}<br>
        <strong>Amount in Words:</strong> ${this.numberToWords(invoice.grand_total)} Rupees Only
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">Customer Signature</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Authorized Signatory</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; font-size: 9pt;">
        <strong>Thank you for your business!</strong>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * STOCK REPORT HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateStockReportHTML(data, options) {
    const { products } = data;

    const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.purchase_price), 0);

    return `
      <div class="section-title">Stock Report - ${moment().format('DD-MMM-YYYY')}</div>
      
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product Name</th>
            <th>SKU</th>
            <th class="text-right">Current Stock</th>
            <th>Unit</th>
            <th class="text-right">Purchase Price</th>
            <th class="text-right">Selling Price</th>
            <th class="text-right">Stock Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${products.map((product, index) => {
            const stockValue = product.current_stock * product.purchase_price;
            const status = product.current_stock === 0 ? 'Out of Stock' : 
                          product.current_stock <= product.minimum_stock_level ? 'Low Stock' : 'Healthy';
            
            return `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${product.product_name}</td>
                <td>${product.sku || '-'}</td>
                <td class="text-right">${product.current_stock}</td>
                <td>${product.unit}</td>
                <td class="text-right amount">${this.formatAmount(product.purchase_price)}</td>
                <td class="text-right amount">${this.formatAmount(product.selling_price)}</td>
                <td class="text-right amount">${this.formatAmount(stockValue)}</td>
                <td>${status}</td>
              </tr>
            `;
          }).join('')}
          <tr class="total-row">
            <td colspan="7" class="text-right"><strong>TOTAL STOCK VALUE:</strong></td>
            <td class="text-right amount"><strong>₹ ${this.formatAmount(totalValue)}</strong></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      
      <div class="summary-box">
        <div class="summary-row">
          <strong>Total Products:</strong>
          <span>${products.length}</span>
        </div>
        <div class="summary-row">
          <strong>Total Stock Value:</strong>
          <span class="amount">₹ ${this.formatAmount(totalValue)}</span>
        </div>
      </div>
    `;
  }

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
   * HELPER: NUMBER TO WORDS (INDIAN STYLE)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    const crores = Math.floor(num / 10000000);
    const lakhs = Math.floor((num % 10000000) / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const remainder = Math.floor(num % 100);

    let words = '';

    if (crores > 0) words += this.convertTwoDigit(crores) + ' Crore ';
    if (lakhs > 0) words += this.convertTwoDigit(lakhs) + ' Lakh ';
    if (thousands > 0) words += this.convertTwoDigit(thousands) + ' Thousand ';
    if (hundreds > 0) words += ones[hundreds] + ' Hundred ';
    if (remainder > 0) words += this.convertTwoDigit(remainder);

    return words.trim();
  }

  static convertTwoDigit(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num < 10) return ones[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET COMPANY INFO
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getCompanyInfo() {
    try {
      const db = await DatabaseService.getDatabase();
      const [result] = await db.executeSql('SELECT * FROM company_master LIMIT 1');
      
      if (result.rows.length > 0) {
        return result.rows.item(0);
      }
      
      return {
        company_name: 'MindStack Business',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        gstin: '',
        pan: ''
      };
    } catch (error) {
      console.error('Get company info error:', error);
      return { company_name: 'MindStack Business' };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOG PDF GENERATION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async logPDFGeneration(reportType, filePath, periodId) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const fileStats = await RNFS.stat(filePath);
      
      await db.executeSql(
        `INSERT INTO pdf_generation_log 
        (report_type, report_name, period_id, file_path, file_size, generated_by) 
        VALUES (?, ?, ?, ?, ?, 'SYSTEM')`,
        [reportType, reportType, periodId, filePath, fileStats.size]
      );

      return { success: true };
    } catch (error) {
      console.error('Log PDF generation error:', error);
      return { success: false };
    }
  }

  // Additional HTML generators for other report types...
  // (I'll add more in the next file to keep this manageable)
}

export default PDFExportEngine;
