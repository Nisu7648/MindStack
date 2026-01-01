/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF GENERATION SERVICE - COMPLETE SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Generates professional A4 PDFs for all accounting books and saves to phone storage
 * 
 * Features:
 * - A4 size (210mm × 297mm)
 * - Indian numbering format (1,00,000.00)
 * - Professional table layouts
 * - Company header
 * - Page numbers
 * - Summary totals
 * - Saves to: /storage/emulated/0/MindStack/PDFs/
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform } from 'react-native';

export class PDFGenerationService {
  static PDF_DIR = `${RNFS.ExternalStorageDirectoryPath}/MindStack/PDFs`;

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * REQUEST STORAGE PERMISSION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async requestStoragePermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'MindStack needs access to save PDFs',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ENSURE PDF DIRECTORY EXISTS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async ensurePDFDirectory() {
    try {
      const exists = await RNFS.exists(this.PDF_DIR);
      if (!exists) {
        await RNFS.mkdir(this.PDF_DIR, { NSURLIsExcludedFromBackupKey: false });
      }
      return { success: true, path: this.PDF_DIR };
    } catch (error) {
      console.error('Create directory error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FORMAT INDIAN CURRENCY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatIndianCurrency(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * FORMAT DATE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET COMPANY DETAILS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getCompanyDetails() {
    try {
      const AccountingSettingsService = require('./accountingSettingsService').default;
      const result = await AccountingSettingsService.getSettings();
      return result.data;
    } catch (error) {
      return {
        companyName: 'Your Company Name',
        address: '',
        phone: '',
        email: '',
        gstNumber: '',
        panNumber: ''
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE COMPANY HEADER HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateCompanyHeader(companyDetails, title, period) {
    return `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${companyDetails.companyName || 'Your Company Name'}</h1>
        ${companyDetails.address ? `<p style="margin: 5px 0; font-size: 12px;">${companyDetails.address}</p>` : ''}
        ${companyDetails.phone || companyDetails.email ? `
          <p style="margin: 5px 0; font-size: 12px;">
            ${companyDetails.phone ? `Phone: ${companyDetails.phone}` : ''}
            ${companyDetails.phone && companyDetails.email ? ' | ' : ''}
            ${companyDetails.email ? `Email: ${companyDetails.email}` : ''}
          </p>
        ` : ''}
        ${companyDetails.gstNumber || companyDetails.panNumber ? `
          <p style="margin: 5px 0; font-size: 12px;">
            ${companyDetails.gstNumber ? `GSTIN: ${companyDetails.gstNumber}` : ''}
            ${companyDetails.gstNumber && companyDetails.panNumber ? ' | ' : ''}
            ${companyDetails.panNumber ? `PAN: ${companyDetails.panNumber}` : ''}
          </p>
        ` : ''}
        <h2 style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${title}</h2>
        ${period ? `<p style="margin: 5px 0; font-size: 12px; font-weight: bold;">${period}</p>` : ''}
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE BASE HTML TEMPLATE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateBaseHTML(content) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .summary {
            margin-top: 20px;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #000;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 9px;
            color: #666;
          }
        </style>
      </head>
      <body>
        ${content}
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
          <p>MindStack Accounting System</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE PDF FROM HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePDFFromHTML(html, fileName) {
    try {
      // Request permission
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Storage permission denied'
        };
      }

      // Ensure directory exists
      await this.ensurePDFDirectory();

      // Generate PDF
      const options = {
        html: html,
        fileName: fileName,
        directory: 'MindStack/PDFs',
        base64: false,
        width: 595, // A4 width in points
        height: 842, // A4 height in points
      };

      const file = await RNHTMLtoPDF.convert(options);

      return {
        success: true,
        filePath: file.filePath,
        fileName: fileName,
        message: `PDF saved to: ${file.filePath}`
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
   * GENERATE JOURNAL BOOK PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateJournalBookPDF(entries, period) {
    try {
      const companyDetails = await this.getCompanyDetails();
      
      let totalDebit = 0;
      let totalCredit = 0;

      // Group entries by transaction
      const groupedEntries = {};
      entries.forEach(entry => {
        if (!groupedEntries[entry.voucherNumber]) {
          groupedEntries[entry.voucherNumber] = {
            date: entry.date,
            voucherNumber: entry.voucherNumber,
            narration: entry.narration,
            reference: entry.reference,
            entries: []
          };
        }
        groupedEntries[entry.voucherNumber].entries.push(entry);
      });

      // Generate table rows
      let tableRows = '';
      Object.values(groupedEntries).forEach(transaction => {
        tableRows += `
          <tr>
            <td class="text-center">${this.formatDate(transaction.date)}</td>
            <td colspan="3">
              ${transaction.entries.map((e, idx) => {
                const amount = this.formatIndianCurrency(e.debit || e.credit);
                const dr = e.debit ? 'Dr.' : '';
                const indent = e.debit ? '' : '&nbsp;&nbsp;&nbsp;&nbsp;To ';
                totalDebit += parseFloat(e.debit || 0);
                totalCredit += parseFloat(e.credit || 0);
                return `${indent}${e.accountName} ${dr}`;
              }).join('<br>')}
              <br><i>(${transaction.narration})</i>
              ${transaction.reference ? `<br>Ref: ${transaction.reference}` : ''}
            </td>
            <td class="text-center">${transaction.voucherNumber}</td>
            <td class="text-right">
              ${transaction.entries.map(e => e.debit ? this.formatIndianCurrency(e.debit) : '').filter(x => x).join('<br>')}
            </td>
            <td class="text-right">
              ${transaction.entries.map(e => e.credit ? this.formatIndianCurrency(e.credit) : '').filter(x => x).join('<br>')}
            </td>
          </tr>
        `;
      });

      // Add totals row
      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="5" class="text-right">Total:</td>
          <td class="text-right">${this.formatIndianCurrency(totalDebit)}</td>
          <td class="text-right">${this.formatIndianCurrency(totalCredit)}</td>
        </tr>
      `;

      const content = `
        ${this.generateCompanyHeader(companyDetails, 'JOURNAL BOOK', period)}
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Date</th>
              <th style="width: 40%;">Particulars</th>
              <th style="width: 8%;">L.F.</th>
              <th style="width: 8%;">Voucher No.</th>
              <th style="width: 16%;">Debit (₹)</th>
              <th style="width: 16%;">Credit (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Entries: ${Object.keys(groupedEntries).length}</p>
          <p>Total Debit: ₹${this.formatIndianCurrency(totalDebit)}</p>
          <p>Total Credit: ₹${this.formatIndianCurrency(totalCredit)}</p>
        </div>
      `;

      const html = this.generateBaseHTML(content);
      const fileName = `JournalBook_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await this.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate journal book PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE LEDGER PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateLedgerPDF(accountName, entries, period) {
    try {
      const companyDetails = await this.getCompanyDetails();
      
      let totalDebit = 0;
      let totalCredit = 0;

      // Generate table rows
      let tableRows = '';
      entries.forEach(entry => {
        totalDebit += parseFloat(entry.debit || 0);
        totalCredit += parseFloat(entry.credit || 0);

        tableRows += `
          <tr>
            <td class="text-center">${this.formatDate(entry.date)}</td>
            <td>${entry.particulars}</td>
            <td class="text-center">${entry.voucherNumber}</td>
            <td class="text-right">${entry.debit ? this.formatIndianCurrency(entry.debit) : ''}</td>
            <td class="text-right">${entry.credit ? this.formatIndianCurrency(entry.credit) : ''}</td>
            <td class="text-right">${this.formatIndianCurrency(entry.balance)} ${entry.balanceType}</td>
          </tr>
        `;
      });

      // Add totals row
      const closingBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;
      const closingType = entries.length > 0 ? entries[entries.length - 1].balanceType : 'Dr';

      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="3" class="text-right">Total:</td>
          <td class="text-right">${this.formatIndianCurrency(totalDebit)}</td>
          <td class="text-right">${this.formatIndianCurrency(totalCredit)}</td>
          <td class="text-right">${this.formatIndianCurrency(closingBalance)} ${closingType}</td>
        </tr>
      `;

      const content = `
        ${this.generateCompanyHeader(companyDetails, `LEDGER ACCOUNT - ${accountName}`, period)}
        <table>
          <thead>
            <tr>
              <th style="width: 12%;">Date</th>
              <th style="width: 35%;">Particulars</th>
              <th style="width: 13%;">Voucher No.</th>
              <th style="width: 13%;">Debit (₹)</th>
              <th style="width: 13%;">Credit (₹)</th>
              <th style="width: 14%;">Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Entries: ${entries.length}</p>
          <p>Total Debit: ₹${this.formatIndianCurrency(totalDebit)}</p>
          <p>Total Credit: ₹${this.formatIndianCurrency(totalCredit)}</p>
          <p>Closing Balance: ₹${this.formatIndianCurrency(closingBalance)} ${closingType}</p>
        </div>
      `;

      const html = this.generateBaseHTML(content);
      const fileName = `Ledger_${accountName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await this.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate ledger PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE SUBSIDIARY BOOK PDF (Generic)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateSubsidiaryBookPDF(bookName, entries, columns, period) {
    try {
      const companyDetails = await this.getCompanyDetails();
      
      // Generate table headers
      const headers = columns.map(col => 
        `<th style="width: ${col.width};">${col.label}</th>`
      ).join('');

      // Generate table rows
      let tableRows = '';
      let totals = {};
      
      entries.forEach(entry => {
        const row = columns.map(col => {
          const value = entry[col.field];
          
          // Track totals for numeric columns
          if (col.type === 'number') {
            totals[col.field] = (totals[col.field] || 0) + parseFloat(value || 0);
            return `<td class="text-right">${this.formatIndianCurrency(value)}</td>`;
          } else if (col.type === 'date') {
            return `<td class="text-center">${this.formatDate(value)}</td>`;
          } else {
            return `<td>${value || ''}</td>`;
          }
        }).join('');
        
        tableRows += `<tr>${row}</tr>`;
      });

      // Add totals row
      const totalsRow = columns.map(col => {
        if (col.field === columns[0].field) {
          return `<td colspan="${columns.findIndex(c => c.type === 'number')}" class="text-right"><strong>Total:</strong></td>`;
        } else if (col.type === 'number' && totals[col.field]) {
          return `<td class="text-right"><strong>${this.formatIndianCurrency(totals[col.field])}</strong></td>`;
        } else if (col.type === 'number') {
          return `<td></td>`;
        }
        return null;
      }).filter(x => x !== null).join('');

      if (totalsRow) {
        tableRows += `<tr style="background-color: #f0f0f0;">${totalsRow}</tr>`;
      }

      const content = `
        ${this.generateCompanyHeader(companyDetails, bookName.toUpperCase(), period)}
        <table>
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Entries: ${entries.length}</p>
          ${Object.keys(totals).map(key => {
            const col = columns.find(c => c.field === key);
            return `<p>${col.label}: ₹${this.formatIndianCurrency(totals[key])}</p>`;
          }).join('')}
        </div>
      `;

      const html = this.generateBaseHTML(content);
      const fileName = `${bookName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await this.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate subsidiary book PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LIST ALL SAVED PDFS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async listSavedPDFs() {
    try {
      await this.ensurePDFDirectory();
      
      const files = await RNFS.readDir(this.PDF_DIR);
      const pdfFiles = files
        .filter(file => file.name.endsWith('.pdf'))
        .map(file => ({
          name: file.name,
          path: file.path,
          size: file.size,
          modifiedDate: file.mtime
        }))
        .sort((a, b) => b.modifiedDate - a.modifiedDate);

      return {
        success: true,
        data: pdfFiles,
        count: pdfFiles.length
      };
    } catch (error) {
      console.error('List PDFs error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DELETE PDF
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async deletePDF(filePath) {
    try {
      await RNFS.unlink(filePath);
      return {
        success: true,
        message: 'PDF deleted successfully'
      };
    } catch (error) {
      console.error('Delete PDF error:', error);
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
  static async sharePDF(filePath) {
    try {
      const Share = require('react-native').Share;
      await Share.share({
        title: 'Share PDF',
        url: `file://${filePath}`,
        type: 'application/pdf'
      });
      return { success: true };
    } catch (error) {
      console.error('Share PDF error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default PDFGenerationService;
