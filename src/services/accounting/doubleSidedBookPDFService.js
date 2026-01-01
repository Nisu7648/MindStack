/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DOUBLE-SIDED BOOK PDF GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Generates PDFs for Ledger, Cash Book, Bank Book, and Petty Cash Book in 
 * traditional double-sided format:
 * 
 * ┌─────────────────────────────────────┬─────────────────────────────────────┐
 * │           DEBIT SIDE                │           CREDIT SIDE               │
 * ├──────┬──────────┬─────────┬────┬────┼──────┬──────────┬─────────┬────┬────┤
 * │ Date │Particulars│Voucher│ LF │ ₹  │ Date │Particulars│Voucher│ LF │ ₹  │
 * └──────┴──────────┴─────────┴────┴────┴──────┴──────────┴─────────┴────┴────┘
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import PDFGenerationService from './pdfGenerationService';

export class DoubleSidedBookPDFService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE LEDGER ACCOUNT PDF (DOUBLE-SIDED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateLedgerAccountPDF(accountData, period) {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      
      const { debitEntries, creditEntries, summary } = accountData;
      
      // Calculate totals
      const totalDebits = summary.totalDebits;
      const totalCredits = summary.totalCredits;
      const balance = summary.closingBalance;

      // Generate rows (pair debit and credit entries by index)
      const maxRows = Math.max(debitEntries.length, creditEntries.length);
      let tableRows = '';

      for (let i = 0; i < maxRows; i++) {
        const debitEntry = debitEntries[i];
        const creditEntry = creditEntries[i];

        tableRows += `
          <tr>
            ${debitEntry ? `
              <td class="text-center">${PDFGenerationService.formatDate(debitEntry.date)}</td>
              <td>${debitEntry.debitParticulars}</td>
              <td class="text-center">${debitEntry.voucherNumber}</td>
              <td class="text-center">${debitEntry.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(debitEntry.debitAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
            ${creditEntry ? `
              <td class="text-center">${PDFGenerationService.formatDate(creditEntry.date)}</td>
              <td>${creditEntry.creditParticulars}</td>
              <td class="text-center">${creditEntry.voucherNumber}</td>
              <td class="text-center">${creditEntry.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(creditEntry.creditAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
          </tr>
        `;
      }

      // Add totals row
      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalDebits)}</td>
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalCredits)}</td>
        </tr>
      `;

      // Add balance row
      if (balance > 0) {
        tableRows += `
          <tr style="font-weight: bold; background-color: #e8f5e9;">
            <td colspan="4" class="text-right"></td>
            <td class="text-right"></td>
            <td colspan="4" class="text-right">Balance c/d:</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(balance)}</td>
          </tr>
        `;
      } else if (balance < 0) {
        tableRows += `
          <tr style="font-weight: bold; background-color: #ffebee;">
            <td colspan="4" class="text-right">Balance c/d:</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(Math.abs(balance))}</td>
            <td colspan="4" class="text-right"></td>
            <td class="text-right"></td>
          </tr>
        `;
      }

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, `LEDGER - ${summary.accountName}`, period)}
        <div style="margin-bottom: 10px; padding: 10px; background-color: #e3f2fd; border: 1px solid #2196F3;">
          <p style="margin: 0;"><strong>Account Code:</strong> ${summary.accountCode}</p>
          <p style="margin: 0;"><strong>Account Name:</strong> ${summary.accountName}</p>
        </div>
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="5" class="text-center">DEBIT SIDE</th>
              <th colspan="5" class="text-center">CREDIT SIDE</th>
            </tr>
            <tr>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Particulars</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Particulars</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Debits: ₹${PDFGenerationService.formatIndianCurrency(totalDebits)}</p>
          <p>Total Credits: ₹${PDFGenerationService.formatIndianCurrency(totalCredits)}</p>
          <p>Closing Balance: ₹${PDFGenerationService.formatIndianCurrency(Math.abs(balance))} ${balance >= 0 ? 'Dr' : 'Cr'}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `Ledger_${summary.accountName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate ledger account PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE CASH BOOK PDF (DOUBLE-SIDED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateCashBookPDF(entries, period) {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      
      // Separate receipts and payments
      const receipts = entries.filter(e => e.isReceipt);
      const payments = entries.filter(e => e.isPayment);
      
      // Calculate totals
      const totalReceipts = receipts.reduce((sum, e) => sum + e.receiptAmount, 0);
      const totalPayments = payments.reduce((sum, e) => sum + e.paymentAmount, 0);
      const balance = totalReceipts - totalPayments;

      // Generate rows (pair receipts and payments by index)
      const maxRows = Math.max(receipts.length, payments.length);
      let tableRows = '';

      for (let i = 0; i < maxRows; i++) {
        const receipt = receipts[i];
        const payment = payments[i];

        tableRows += `
          <tr>
            ${receipt ? `
              <td class="text-center">${PDFGenerationService.formatDate(receipt.date)}</td>
              <td>${receipt.receiptParticulars}</td>
              <td class="text-center">${receipt.voucherNumber}</td>
              <td class="text-center">${receipt.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(receipt.receiptAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
            ${payment ? `
              <td class="text-center">${PDFGenerationService.formatDate(payment.date)}</td>
              <td>${payment.paymentParticulars}</td>
              <td class="text-center">${payment.voucherNumber}</td>
              <td class="text-center">${payment.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(payment.paymentAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
          </tr>
        `;
      }

      // Add totals row
      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalReceipts)}</td>
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalPayments)}</td>
        </tr>
      `;

      // Add balance row
      if (balance > 0) {
        tableRows += `
          <tr style="font-weight: bold; background-color: #e8f5e9;">
            <td colspan="4" class="text-right"></td>
            <td class="text-right"></td>
            <td colspan="4" class="text-right">Balance c/d:</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(balance)}</td>
          </tr>
        `;
      } else if (balance < 0) {
        tableRows += `
          <tr style="font-weight: bold; background-color: #ffebee;">
            <td colspan="4" class="text-right">Balance c/d:</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(Math.abs(balance))}</td>
            <td colspan="4" class="text-right"></td>
            <td class="text-right"></td>
          </tr>
        `;
      }

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'CASH BOOK', period)}
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="5" class="text-center">DEBIT SIDE (Receipts)</th>
              <th colspan="5" class="text-center">CREDIT SIDE (Payments)</th>
            </tr>
            <tr>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Receipts</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Payments</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Receipts: ₹${PDFGenerationService.formatIndianCurrency(totalReceipts)}</p>
          <p>Total Payments: ₹${PDFGenerationService.formatIndianCurrency(totalPayments)}</p>
          <p>Closing Balance: ₹${PDFGenerationService.formatIndianCurrency(Math.abs(balance))} ${balance >= 0 ? 'Dr' : 'Cr'}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `CashBook_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate cash book PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE BANK BOOK PDF (DOUBLE-SIDED)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateBankBookPDF(entries, period) {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      
      // Separate receipts and payments
      const receipts = entries.filter(e => e.isReceipt);
      const payments = entries.filter(e => e.isPayment);
      
      // Calculate totals
      const totalReceipts = receipts.reduce((sum, e) => sum + e.receiptAmount, 0);
      const totalPayments = payments.reduce((sum, e) => sum + e.paymentAmount, 0);
      const balance = totalReceipts - totalPayments;

      // Generate rows
      const maxRows = Math.max(receipts.length, payments.length);
      let tableRows = '';

      for (let i = 0; i < maxRows; i++) {
        const receipt = receipts[i];
        const payment = payments[i];

        tableRows += `
          <tr>
            ${receipt ? `
              <td class="text-center">${PDFGenerationService.formatDate(receipt.date)}</td>
              <td>${receipt.receiptParticulars}</td>
              <td class="text-center">${receipt.voucherNumber}</td>
              <td class="text-center">${receipt.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(receipt.receiptAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
            ${payment ? `
              <td class="text-center">${PDFGenerationService.formatDate(payment.date)}</td>
              <td>${payment.paymentParticulars}</td>
              <td class="text-center">${payment.voucherNumber}</td>
              <td class="text-center">${payment.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(payment.paymentAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
          </tr>
        `;
      }

      // Add totals row
      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalReceipts)}</td>
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalPayments)}</td>
        </tr>
      `;

      // Add balance row
      if (balance > 0) {
        tableRows += `
          <tr style="font-weight: bold; background-color: #e8f5e9;">
            <td colspan="4" class="text-right"></td>
            <td class="text-right"></td>
            <td colspan="4" class="text-right">Balance c/d:</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(balance)}</td>
          </tr>
        `;
      } else if (balance < 0) {
        tableRows += `
          <tr style="font-weight: bold; background-color: #ffebee;">
            <td colspan="4" class="text-right">Balance c/d:</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(Math.abs(balance))}</td>
            <td colspan="4" class="text-right"></td>
            <td class="text-right"></td>
          </tr>
        `;
      }

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'BANK BOOK', period)}
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="5" class="text-center">DEBIT SIDE (Receipts)</th>
              <th colspan="5" class="text-center">CREDIT SIDE (Payments)</th>
            </tr>
            <tr>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Receipts</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Payments</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Receipts: ₹${PDFGenerationService.formatIndianCurrency(totalReceipts)}</p>
          <p>Total Payments: ₹${PDFGenerationService.formatIndianCurrency(totalPayments)}</p>
          <p>Closing Balance: ₹${PDFGenerationService.formatIndianCurrency(Math.abs(balance))} ${balance >= 0 ? 'Dr' : 'Cr'}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `BankBook_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate bank book PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE PETTY CASH BOOK PDF (DOUBLE-SIDED - IMPREST SYSTEM)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePettyCashBookPDF(entries, period) {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      
      // Separate receipts and payments
      const receipts = entries.filter(e => e.isReceipt);
      const payments = entries.filter(e => e.isPayment);
      
      // Get imprest amount
      const imprestAmount = entries.length > 0 ? entries[0].imprestAmount : 10000;
      
      // Calculate totals
      const totalReceipts = receipts.reduce((sum, e) => sum + e.receiptAmount, 0);
      const totalPayments = payments.reduce((sum, e) => sum + e.paymentAmount, 0);
      const balance = imprestAmount + totalReceipts - totalPayments;

      // Generate rows
      const maxRows = Math.max(receipts.length, payments.length);
      let tableRows = '';

      for (let i = 0; i < maxRows; i++) {
        const receipt = receipts[i];
        const payment = payments[i];

        tableRows += `
          <tr>
            ${receipt ? `
              <td class="text-center">${PDFGenerationService.formatDate(receipt.date)}</td>
              <td>${receipt.receiptParticulars}</td>
              <td class="text-center">${receipt.voucherNumber}</td>
              <td class="text-center">${receipt.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(receipt.receiptAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
            ${payment ? `
              <td class="text-center">${PDFGenerationService.formatDate(payment.date)}</td>
              <td>${payment.paymentParticulars}</td>
              <td class="text-center">${payment.voucherNumber}</td>
              <td class="text-center">${payment.ledgerFolio || ''}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(payment.paymentAmount)}</td>
            ` : `
              <td colspan="5"></td>
            `}
          </tr>
        `;
      }

      // Add totals row
      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(imprestAmount + totalReceipts)}</td>
          <td colspan="4" class="text-right">Total:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalPayments)}</td>
        </tr>
      `;

      // Add balance row
      tableRows += `
        <tr style="font-weight: bold; background-color: #e8f5e9;">
          <td colspan="4" class="text-right"></td>
          <td class="text-right"></td>
          <td colspan="4" class="text-right">Balance c/d:</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(balance)}</td>
        </tr>
      `;

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'PETTY CASH BOOK (IMPREST SYSTEM)', period)}
        <div style="margin-bottom: 10px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107;">
          <p style="margin: 0;"><strong>Imprest Amount:</strong> ₹${PDFGenerationService.formatIndianCurrency(imprestAmount)}</p>
        </div>
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="5" class="text-center">DEBIT SIDE (Receipts)</th>
              <th colspan="5" class="text-center">CREDIT SIDE (Payments)</th>
            </tr>
            <tr>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Receipts</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
              <th style="width: 8%;">Date</th>
              <th style="width: 17%;">Payments</th>
              <th style="width: 8%;">Voucher</th>
              <th style="width: 5%;">L.F.</th>
              <th style="width: 12%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Imprest Amount: ₹${PDFGenerationService.formatIndianCurrency(imprestAmount)}</p>
          <p>Total Receipts: ₹${PDFGenerationService.formatIndianCurrency(totalReceipts)}</p>
          <p>Total Payments: ₹${PDFGenerationService.formatIndianCurrency(totalPayments)}</p>
          <p>Closing Balance: ₹${PDFGenerationService.formatIndianCurrency(balance)}</p>
          <p>Amount to be Reimbursed: ₹${PDFGenerationService.formatIndianCurrency(imprestAmount - balance)}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `PettyCashBook_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate petty cash book PDF error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DoubleSidedBookPDFService;
