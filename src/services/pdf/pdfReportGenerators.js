/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PDF EXPORT ENGINE - PART 2: ALL REMAINING REPORTS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * HTML GENERATORS FOR:
 * - All Subsidiary Books (Purchase, Sales, Returns, Bills)
 * - Financial Statements (Trial Balance, Trading, P&L, Balance Sheet)
 * - POS Reports (Sales, Purchase, Day Closing, GST)
 * - Ledger Reports
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import moment from 'moment';

export class PDFReportGenerators {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BANK BOOK HTML (DOUBLE-SIDED FORMAT)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateBankBookHTML(data, options) {
    const { entries, period } = data;
    
    let deposits = entries.filter(e => e.deposit_amount > 0);
    let withdrawals = entries.filter(e => e.withdrawal_amount > 0);

    const totalDeposits = deposits.reduce((sum, e) => sum + e.deposit_amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, e) => sum + e.withdrawal_amount, 0);
    const balance = totalDeposits - totalWithdrawals;

    return `
      <div class="section-title">Bank Book - ${period || 'All Transactions'}</div>
      
      <div class="double-sided-table">
        <div>
          <h4>DEPOSITS (Dr Side)</h4>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Cheque No</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${deposits.map(entry => `
                <tr>
                  <td>${moment(entry.entry_date).format('DD-MMM-YY')}</td>
                  <td>${entry.particulars}</td>
                  <td>${entry.cheque_number || '-'}</td>
                  <td class="text-right amount">${this.formatAmount(entry.deposit_amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">TOTAL DEPOSITS</td>
                <td class="text-right amount">${this.formatAmount(totalDeposits)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h4>WITHDRAWALS (Cr Side)</h4>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Cheque No</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${withdrawals.map(entry => `
                <tr>
                  <td>${moment(entry.entry_date).format('DD-MMM-YY')}</td>
                  <td>${entry.particulars}</td>
                  <td>${entry.cheque_number || '-'}</td>
                  <td class="text-right amount">${this.formatAmount(entry.withdrawal_amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">TOTAL WITHDRAWALS</td>
                <td class="text-right amount">${this.formatAmount(totalWithdrawals)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="summary-box">
        <div class="summary-row">
          <strong>Closing Balance:</strong>
          <span class="amount">${this.formatAmount(Math.abs(balance))} ${balance >= 0 ? 'Dr' : 'Cr'}</span>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PURCHASE BOOK HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generatePurchaseBookHTML(data, options) {
    const { entries, period } = data;

    const totalGross = entries.reduce((sum, e) => sum + e.gross_amount, 0);
    const totalDiscount = entries.reduce((sum, e) => sum + (e.discount || 0), 0);
    const totalTax = entries.reduce((sum, e) => sum + (e.tax_amount || 0), 0);
    const totalNet = entries.reduce((sum, e) => sum + e.net_amount, 0);

    return `
      <div class="section-title">Purchase Book - ${period || 'All Purchases'}</div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice No</th>
            <th>Supplier Name</th>
            <th>Particulars</th>
            <th class="text-right">Gross Amount</th>
            <th class="text-right">Discount</th>
            <th class="text-right">Tax</th>
            <th class="text-right">Net Amount</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td>${moment(entry.entry_date).format('DD-MMM-YY')}</td>
              <td>${entry.invoice_number}</td>
              <td>${entry.supplier_name}</td>
              <td>${entry.particulars || '-'}</td>
              <td class="text-right amount">${this.formatAmount(entry.gross_amount)}</td>
              <td class="text-right amount">${this.formatAmount(entry.discount || 0)}</td>
              <td class="text-right amount">${this.formatAmount(entry.tax_amount || 0)}</td>
              <td class="text-right amount">${this.formatAmount(entry.net_amount)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>TOTAL</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalGross)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalDiscount)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalTax)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalNet)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SALES BOOK HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateSalesBookHTML(data, options) {
    const { entries, period } = data;

    const totalGross = entries.reduce((sum, e) => sum + e.gross_amount, 0);
    const totalDiscount = entries.reduce((sum, e) => sum + (e.discount || 0), 0);
    const totalTax = entries.reduce((sum, e) => sum + (e.tax_amount || 0), 0);
    const totalNet = entries.reduce((sum, e) => sum + e.net_amount, 0);

    return `
      <div class="section-title">Sales Book - ${period || 'All Sales'}</div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice No</th>
            <th>Customer Name</th>
            <th>Particulars</th>
            <th class="text-right">Gross Amount</th>
            <th class="text-right">Discount</th>
            <th class="text-right">Tax</th>
            <th class="text-right">Net Amount</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td>${moment(entry.entry_date).format('DD-MMM-YY')}</td>
              <td>${entry.invoice_number}</td>
              <td>${entry.customer_name}</td>
              <td>${entry.particulars || '-'}</td>
              <td class="text-right amount">${this.formatAmount(entry.gross_amount)}</td>
              <td class="text-right amount">${this.formatAmount(entry.discount || 0)}</td>
              <td class="text-right amount">${this.formatAmount(entry.tax_amount || 0)}</td>
              <td class="text-right amount">${this.formatAmount(entry.net_amount)}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="4" class="text-right"><strong>TOTAL</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalGross)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalDiscount)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalTax)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalNet)}</strong></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TRIAL BALANCE HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateTrialBalanceHTML(data, options) {
    const { entries, period } = data;

    const totalDebit = entries.reduce((sum, e) => sum + (e.closing_balance_type === 'Dr' ? e.closing_balance : 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.closing_balance_type === 'Cr' ? e.closing_balance : 0), 0);

    return `
      <div class="section-title">Trial Balance - ${period || 'Current Period'}</div>
      
      <table>
        <thead>
          <tr>
            <th>Account Code</th>
            <th>Account Name</th>
            <th>Account Type</th>
            <th class="text-right">Debit (₹)</th>
            <th class="text-right">Credit (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td>${entry.account_code}</td>
              <td>${entry.account_name}</td>
              <td>${entry.account_type}</td>
              <td class="text-right amount">${entry.closing_balance_type === 'Dr' ? this.formatAmount(entry.closing_balance) : '-'}</td>
              <td class="text-right amount">${entry.closing_balance_type === 'Cr' ? this.formatAmount(entry.closing_balance) : '-'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="3" class="text-right"><strong>TOTAL</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalDebit)}</strong></td>
            <td class="text-right amount"><strong>${this.formatAmount(totalCredit)}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div class="summary-box">
        <div class="summary-row">
          <strong>Difference:</strong>
          <span class="amount">${this.formatAmount(Math.abs(totalDebit - totalCredit))}</span>
        </div>
        <div class="summary-row">
          <strong>Status:</strong>
          <span>${Math.abs(totalDebit - totalCredit) < 0.01 ? '✓ BALANCED' : '✗ NOT BALANCED'}</span>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TRADING ACCOUNT HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateTradingAccountHTML(data, options) {
    const { tradingAccount, period } = data;

    return `
      <div class="section-title">Trading Account - ${period || 'Current Year'}</div>
      
      <div class="double-sided-table">
        <div>
          <h4>DEBIT SIDE (Expenses)</h4>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Opening Stock</td>
                <td class="text-right amount">${this.formatAmount(tradingAccount.opening_stock)}</td>
              </tr>
              <tr>
                <td>Purchases</td>
                <td class="text-right amount">${this.formatAmount(tradingAccount.purchases)}</td>
              </tr>
              <tr>
                <td>Less: Purchase Returns</td>
                <td class="text-right amount">(${this.formatAmount(tradingAccount.purchase_returns)})</td>
              </tr>
              <tr>
                <td>Direct Expenses</td>
                <td class="text-right amount">${this.formatAmount(tradingAccount.direct_expenses)}</td>
              </tr>
              ${tradingAccount.gross_profit > 0 ? `
              <tr class="total-row">
                <td><strong>Gross Profit c/d</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(tradingAccount.gross_profit)}</strong></td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(
                  tradingAccount.opening_stock + 
                  tradingAccount.purchases - 
                  tradingAccount.purchase_returns + 
                  tradingAccount.direct_expenses + 
                  tradingAccount.gross_profit
                )}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h4>CREDIT SIDE (Income)</h4>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Sales</td>
                <td class="text-right amount">${this.formatAmount(tradingAccount.sales)}</td>
              </tr>
              <tr>
                <td>Less: Sales Returns</td>
                <td class="text-right amount">(${this.formatAmount(tradingAccount.sales_returns)})</td>
              </tr>
              <tr>
                <td>Closing Stock</td>
                <td class="text-right amount">${this.formatAmount(tradingAccount.closing_stock)}</td>
              </tr>
              ${tradingAccount.gross_loss > 0 ? `
              <tr class="total-row">
                <td><strong>Gross Loss c/d</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(tradingAccount.gross_loss)}</strong></td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(
                  tradingAccount.sales - 
                  tradingAccount.sales_returns + 
                  tradingAccount.closing_stock + 
                  tradingAccount.gross_loss
                )}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROFIT & LOSS ACCOUNT HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateProfitLossHTML(data, options) {
    const { profitLoss, period } = data;

    return `
      <div class="section-title">Profit & Loss Account - ${period || 'Current Year'}</div>
      
      <div class="double-sided-table">
        <div>
          <h4>DEBIT SIDE (Expenses)</h4>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${profitLoss.gross_loss > 0 ? `
              <tr>
                <td>Gross Loss b/d</td>
                <td class="text-right amount">${this.formatAmount(profitLoss.gross_loss)}</td>
              </tr>
              ` : ''}
              <tr>
                <td>Indirect Expenses</td>
                <td class="text-right amount">${this.formatAmount(profitLoss.indirect_expenses)}</td>
              </tr>
              <tr>
                <td>Financial Expenses</td>
                <td class="text-right amount">${this.formatAmount(profitLoss.financial_expenses)}</td>
              </tr>
              ${profitLoss.net_profit > 0 ? `
              <tr class="total-row">
                <td><strong>Net Profit</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(profitLoss.net_profit)}</strong></td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(
                  profitLoss.gross_loss + 
                  profitLoss.indirect_expenses + 
                  profitLoss.financial_expenses + 
                  profitLoss.net_profit
                )}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h4>CREDIT SIDE (Income)</h4>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${profitLoss.gross_profit > 0 ? `
              <tr>
                <td>Gross Profit b/d</td>
                <td class="text-right amount">${this.formatAmount(profitLoss.gross_profit)}</td>
              </tr>
              ` : ''}
              <tr>
                <td>Indirect Incomes</td>
                <td class="text-right amount">${this.formatAmount(profitLoss.indirect_incomes)}</td>
              </tr>
              <tr>
                <td>Financial Incomes</td>
                <td class="text-right amount">${this.formatAmount(profitLoss.financial_incomes)}</td>
              </tr>
              ${profitLoss.net_loss > 0 ? `
              <tr class="total-row">
                <td><strong>Net Loss</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(profitLoss.net_loss)}</strong></td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(
                  profitLoss.gross_profit + 
                  profitLoss.indirect_incomes + 
                  profitLoss.financial_incomes + 
                  profitLoss.net_loss
                )}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BALANCE SHEET HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateBalanceSheetHTML(data, options) {
    const { balanceSheet, period, asOnDate } = data;

    return `
      <div class="section-title">Balance Sheet as on ${moment(asOnDate).format('DD-MMM-YYYY')}</div>
      
      <div class="double-sided-table">
        <div>
          <h4>LIABILITIES</h4>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Capital</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.capital)}</td>
              </tr>
              <tr>
                <td>Add: Reserves</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.reserves)}</td>
              </tr>
              ${balanceSheet.net_profit > 0 ? `
              <tr>
                <td>Add: Net Profit</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.net_profit)}</td>
              </tr>
              ` : ''}
              ${balanceSheet.net_loss > 0 ? `
              <tr>
                <td>Less: Net Loss</td>
                <td class="text-right amount">(${this.formatAmount(balanceSheet.net_loss)})</td>
              </tr>
              ` : ''}
              <tr>
                <td>Long Term Liabilities</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.long_term_liabilities)}</td>
              </tr>
              <tr>
                <td>Current Liabilities</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.current_liabilities)}</td>
              </tr>
              <tr>
                <td>Provisions</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.provisions)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>TOTAL LIABILITIES</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(balanceSheet.total_liabilities)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h4>ASSETS</h4>
          <table>
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fixed Assets</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.fixed_assets)}</td>
              </tr>
              <tr>
                <td>Investments</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.investments)}</td>
              </tr>
              <tr>
                <td>Current Assets</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.current_assets)}</td>
              </tr>
              <tr>
                <td>Other Assets</td>
                <td class="text-right amount">${this.formatAmount(balanceSheet.other_assets)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>TOTAL ASSETS</strong></td>
                <td class="text-right amount"><strong>${this.formatAmount(balanceSheet.total_assets)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="summary-box">
        <div class="summary-row">
          <strong>Status:</strong>
          <span>${balanceSheet.is_balanced ? '✓ BALANCED' : '✗ NOT BALANCED'}</span>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DAY CLOSING REPORT HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateDayClosingReportHTML(data, options) {
    const { dayClosing } = data;

    return `
      <div class="section-title">Day Closing Report - ${moment(dayClosing.closing_date).format('DD-MMM-YYYY')}</div>
      
      <div class="summary-box">
        <h4>SALES SUMMARY</h4>
        <div class="summary-row">
          <strong>Total Invoices:</strong>
          <span>${dayClosing.total_invoices}</span>
        </div>
        <div class="summary-row">
          <strong>Total Sales:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_sales)}</span>
        </div>
        <div class="summary-row">
          <strong>Cash Sales:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_cash_sales)}</span>
        </div>
        <div class="summary-row">
          <strong>UPI Sales:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_upi_sales)}</span>
        </div>
        <div class="summary-row">
          <strong>Card Sales:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_card_sales)}</span>
        </div>
      </div>
      
      <div class="summary-box">
        <h4>CASH RECONCILIATION</h4>
        <div class="summary-row">
          <strong>Opening Cash:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.opening_cash)}</span>
        </div>
        <div class="summary-row">
          <strong>Cash Sales:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_cash_sales)}</span>
        </div>
        <div class="summary-row">
          <strong>Less: Returns:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_returns)}</span>
        </div>
        <div class="summary-row">
          <strong>Less: Expenses:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.total_expenses)}</span>
        </div>
        <div class="summary-row">
          <strong>Expected Cash:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.expected_cash)}</span>
        </div>
        <div class="summary-row">
          <strong>Actual Cash:</strong>
          <span class="amount">₹ ${this.formatAmount(dayClosing.actual_cash)}</span>
        </div>
        <div class="summary-row" style="border-top: 2px solid #000; padding-top: 10px; margin-top: 10px;">
          <strong>Difference:</strong>
          <span class="amount" style="color: ${dayClosing.cash_difference === 0 ? 'green' : 'red'};">
            ₹ ${this.formatAmount(Math.abs(dayClosing.cash_difference))} 
            ${dayClosing.cash_difference > 0 ? '(Excess)' : dayClosing.cash_difference < 0 ? '(Short)' : ''}
          </span>
        </div>
        ${dayClosing.difference_reason ? `
        <div class="summary-row">
          <strong>Reason:</strong>
          <span>${dayClosing.difference_reason}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">Cashier Signature</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">Manager Signature</div>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GST REPORT HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateGSTReportHTML(data, options) {
    const { entries, period, summary } = data;

    return `
      <div class="section-title">GST Report - ${period || 'Current Period'}</div>
      
      <div class="summary-box">
        <h4>GST SUMMARY</h4>
        <div class="summary-row">
          <strong>Total Taxable Amount:</strong>
          <span class="amount">₹ ${this.formatAmount(summary.total_taxable)}</span>
        </div>
        <div class="summary-row">
          <strong>Total CGST:</strong>
          <span class="amount">₹ ${this.formatAmount(summary.total_cgst)}</span>
        </div>
        <div class="summary-row">
          <strong>Total SGST:</strong>
          <span class="amount">₹ ${this.formatAmount(summary.total_sgst)}</span>
        </div>
        <div class="summary-row">
          <strong>Total IGST:</strong>
          <span class="amount">₹ ${this.formatAmount(summary.total_igst)}</span>
        </div>
        <div class="summary-row" style="border-top: 2px solid #000; padding-top: 10px; margin-top: 10px;">
          <strong>Total GST:</strong>
          <span class="amount"><strong>₹ ${this.formatAmount(summary.total_gst)}</strong></span>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice No</th>
            <th>Party Name</th>
            <th>GSTIN</th>
            <th class="text-right">Taxable</th>
            <th class="text-right">CGST</th>
            <th class="text-right">SGST</th>
            <th class="text-right">IGST</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td>${moment(entry.date).format('DD-MMM-YY')}</td>
              <td>${entry.invoice_number}</td>
              <td>${entry.party_name}</td>
              <td>${entry.gstin || '-'}</td>
              <td class="text-right amount">${this.formatAmount(entry.taxable_amount)}</td>
              <td class="text-right amount">${this.formatAmount(entry.cgst_amount)}</td>
              <td class="text-right amount">${this.formatAmount(entry.sgst_amount)}</td>
              <td class="text-right amount">${this.formatAmount(entry.igst_amount)}</td>
              <td class="text-right amount">${this.formatAmount(entry.total_amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOW STOCK REPORT HTML
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateLowStockReportHTML(data, options) {
    const { products } = data;

    return `
      <div class="section-title">Low Stock Alert Report - ${moment().format('DD-MMM-YYYY')}</div>
      
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Product Name</th>
            <th>SKU</th>
            <th class="text-right">Current Stock</th>
            <th class="text-right">Minimum Stock</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${products.map((product, index) => {
            const status = product.current_stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
            const statusColor = product.current_stock === 0 ? 'red' : 'orange';
            
            return `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${product.product_name}</td>
                <td>${product.sku || '-'}</td>
                <td class="text-right">${product.current_stock}</td>
                <td class="text-right">${product.minimum_stock_level}</td>
                <td>${product.unit}</td>
                <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="summary-box">
        <div class="summary-row">
          <strong>Total Low Stock Items:</strong>
          <span>${products.length}</span>
        </div>
        <div class="summary-row">
          <strong>Out of Stock:</strong>
          <span>${products.filter(p => p.current_stock === 0).length}</span>
        </div>
      </div>
    `;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER: FORMAT AMOUNT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static formatAmount(amount) {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}

export default PDFReportGenerators;
