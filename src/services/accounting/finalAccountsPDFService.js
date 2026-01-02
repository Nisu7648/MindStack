/**
 * FINAL ACCOUNTS PDF SERVICE - COMPLETE LOGIC
 */

import PDFGenerationService from './pdfGenerationService';
import TrialBalanceService from './trialBalanceService';
import TradingProfitLossService from './tradingProfitLossService';
import BalanceSheetService from './balanceSheetService';

export class FinalAccountsPDFService {
  static async generateTrialBalancePDF(filters = {}, period = '') {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      const result = await TrialBalanceService.getTrialBalance(filters);

      if (!result.success) {
        return { success: false, error: 'Failed to get trial balance data' };
      }

      let tableRows = '';
      
      for (const account of result.data) {
        tableRows += `
          <tr>
            <td>${account.accountCode}</td>
            <td>${account.accountName}</td>
            <td class="text-right">${account.totalDebitsFormatted}</td>
            <td class="text-right">${account.totalCreditsFormatted}</td>
            <td class="text-right">${account.debitBalanceFormatted}</td>
            <td class="text-right">${account.creditBalanceFormatted}</td>
          </tr>
        `;
      }

      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f0f0;">
          <td colspan="2" class="text-right">TOTAL:</td>
          <td class="text-right">${result.summary.totalDebitsFormatted}</td>
          <td class="text-right">${result.summary.totalCreditsFormatted}</td>
          <td class="text-right">${result.summary.totalDebitBalancesFormatted}</td>
          <td class="text-right">${result.summary.totalCreditBalancesFormatted}</td>
        </tr>
      `;

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'TRIAL BALANCE', period)}
        <table>
          <thead>
            <tr>
              <th style="width: 10%;">Code</th>
              <th style="width: 30%;">Account Name</th>
              <th style="width: 15%;">Total Debits (₹)</th>
              <th style="width: 15%;">Total Credits (₹)</th>
              <th style="width: 15%;">Debit Balance (₹)</th>
              <th style="width: 15%;">Credit Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Debits: ₹${result.summary.totalDebitsFormatted}</p>
          <p>Total Credits: ₹${result.summary.totalCreditsFormatted}</p>
          <p>Total Debit Balances: ₹${result.summary.totalDebitBalancesFormatted}</p>
          <p>Total Credit Balances: ₹${result.summary.totalCreditBalancesFormatted}</p>
          <p>Difference: ₹${result.summary.differenceFormatted}</p>
          <p>Status: ${result.summary.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `TrialBalance_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate trial balance PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateTradingAccountPDF(filters = {}, period = '') {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      const result = await TradingProfitLossService.getTradingAccount(filters);

      if (!result.success) {
        return { success: false, error: 'Failed to get trading account data' };
      }

      const data = result.data;
      const calc = result.calculations;

      let debitRows = `
        <tr>
          <td>Opening Stock</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(data.openingStock)}</td>
        </tr>
        <tr>
          <td>Purchases</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(data.purchases)}</td>
        </tr>
        <tr>
          <td>Less: Purchase Returns</td>
          <td class="text-right">(${PDFGenerationService.formatIndianCurrency(data.purchaseReturns)})</td>
        </tr>
        <tr style="font-weight: bold;">
          <td>Net Purchases</td>
          <td class="text-right">${calc.netPurchasesFormatted}</td>
        </tr>
      `;

      for (const expense of data.directExpenses) {
        debitRows += `
          <tr>
            <td>${expense.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(expense.amount)}</td>
          </tr>
        `;
      }

      if (calc.isGrossProfit) {
        debitRows += `
          <tr style="font-weight: bold; background-color: #e8f5e9;">
            <td>Gross Profit c/d</td>
            <td class="text-right">${calc.grossProfitFormatted}</td>
          </tr>
        `;
      }

      let creditRows = `
        <tr>
          <td>Sales</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(data.sales)}</td>
        </tr>
        <tr>
          <td>Less: Sales Returns</td>
          <td class="text-right">(${PDFGenerationService.formatIndianCurrency(data.salesReturns)})</td>
        </tr>
        <tr style="font-weight: bold;">
          <td>Net Sales</td>
          <td class="text-right">${calc.netSalesFormatted}</td>
        </tr>
        <tr>
          <td>Closing Stock</td>
          <td class="text-right">${PDFGenerationService.formatIndianCurrency(data.closingStock)}</td>
        </tr>
      `;

      if (!calc.isGrossProfit) {
        creditRows += `
          <tr style="font-weight: bold; background-color: #ffebee;">
            <td>Gross Loss c/d</td>
            <td class="text-right">${calc.grossProfitFormatted}</td>
          </tr>
        `;
      }

      const totalDebit = data.openingStock + calc.netPurchases + calc.totalDirectExpenses + (calc.isGrossProfit ? calc.grossProfit : 0);
      const totalCredit = calc.netSales + data.closingStock + (!calc.isGrossProfit ? calc.grossProfit : 0);

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'TRADING ACCOUNT', period)}
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="2" class="text-center">DEBIT SIDE (Dr.)</th>
              <th colspan="2" class="text-center">CREDIT SIDE (Cr.)</th>
            </tr>
            <tr>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 10%;">Amount (₹)</th>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 10%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2">
                <table style="width: 100%; border: none;">
                  ${debitRows}
                </table>
              </td>
              <td colspan="2">
                <table style="width: 100%; border: none;">
                  ${creditRows}
                </table>
              </td>
            </tr>
            <tr style="font-weight: bold; background-color: #f0f0f0;">
              <td class="text-right">TOTAL:</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalDebit)}</td>
              <td class="text-right">TOTAL:</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(totalCredit)}</td>
            </tr>
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Net Sales: ₹${calc.netSalesFormatted}</p>
          <p>Cost of Goods Sold: ₹${calc.costOfGoodsSoldFormatted}</p>
          <p>${calc.isGrossProfit ? 'Gross Profit' : 'Gross Loss'}: ₹${calc.grossProfitFormatted}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `TradingAccount_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate trading account PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateProfitLossAccountPDF(filters = {}, period = '') {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      const result = await TradingProfitLossService.getProfitAndLossAccount(filters);

      if (!result.success) {
        return { success: false, error: 'Failed to get profit & loss data' };
      }

      const data = result.data;
      const calc = result.calculations;

      let debitRows = '';

      if (calc.grossLoss > 0) {
        debitRows += `
          <tr style="font-weight: bold; background-color: #ffebee;">
            <td>Gross Loss b/d</td>
            <td class="text-right">${calc.grossLossFormatted}</td>
          </tr>
        `;
      }

      for (const expense of data.indirectExpenses) {
        debitRows += `
          <tr>
            <td>${expense.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(expense.amount)}</td>
          </tr>
        `;
      }

      for (const expense of data.financialExpenses) {
        debitRows += `
          <tr>
            <td>${expense.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(expense.amount)}</td>
          </tr>
        `;
      }

      if (calc.isNetProfit) {
        debitRows += `
          <tr style="font-weight: bold; background-color: #e8f5e9;">
            <td>Net Profit</td>
            <td class="text-right">${calc.netProfitFormatted}</td>
          </tr>
        `;
      }

      let creditRows = '';

      if (calc.grossProfit > 0) {
        creditRows += `
          <tr style="font-weight: bold; background-color: #e8f5e9;">
            <td>Gross Profit b/d</td>
            <td class="text-right">${calc.grossProfitFormatted}</td>
          </tr>
        `;
      }

      for (const income of data.indirectIncomes) {
        creditRows += `
          <tr>
            <td>${income.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(income.amount)}</td>
          </tr>
        `;
      }

      for (const income of data.financialIncomes) {
        creditRows += `
          <tr>
            <td>${income.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(income.amount)}</td>
          </tr>
        `;
      }

      if (!calc.isNetProfit) {
        creditRows += `
          <tr style="font-weight: bold; background-color: #ffebee;">
            <td>Net Loss</td>
            <td class="text-right">${calc.netProfitFormatted}</td>
          </tr>
        `;
      }

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'PROFIT & LOSS ACCOUNT', period)}
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="2" class="text-center">DEBIT SIDE (Dr.) - EXPENSES</th>
              <th colspan="2" class="text-center">CREDIT SIDE (Cr.) - INCOMES</th>
            </tr>
            <tr>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 10%;">Amount (₹)</th>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 10%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2">
                <table style="width: 100%; border: none;">
                  ${debitRows}
                </table>
              </td>
              <td colspan="2">
                <table style="width: 100%; border: none;">
                  ${creditRows}
                </table>
              </td>
            </tr>
            <tr style="font-weight: bold; background-color: #f0f0f0;">
              <td class="text-right">TOTAL:</td>
              <td class="text-right">${calc.totalExpensesFormatted}</td>
              <td class="text-right">TOTAL:</td>
              <td class="text-right">${calc.totalIncomesFormatted}</td>
            </tr>
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Incomes: ₹${calc.totalIncomesFormatted}</p>
          <p>Total Expenses: ₹${calc.totalExpensesFormatted}</p>
          <p>${calc.isNetProfit ? 'Net Profit' : 'Net Loss'}: ₹${calc.netProfitFormatted}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `ProfitLossAccount_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate profit & loss account PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateBalanceSheetPDF(asOnDate, filters = {}) {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();
      const result = await BalanceSheetService.getBalanceSheet(asOnDate, filters);

      if (!result.success) {
        return { success: false, error: 'Failed to get balance sheet data' };
      }

      const assets = result.assets;
      const liabilities = result.liabilities;
      const summary = result.summary;

      let assetRows = '<tr><td colspan="2" style="font-weight: bold; background-color: #e3f2fd;">FIXED ASSETS</td></tr>';
      for (const asset of assets.fixedAssets) {
        assetRows += `
          <tr>
            <td>${asset.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(asset.amount)}</td>
          </tr>
        `;
      }
      assetRows += `
        <tr style="font-weight: bold;">
          <td>Total Fixed Assets</td>
          <td class="text-right">${summary.totalFixedAssetsFormatted}</td>
        </tr>
      `;

      assetRows += '<tr><td colspan="2" style="font-weight: bold; background-color: #e3f2fd;">CURRENT ASSETS</td></tr>';
      for (const asset of assets.currentAssets) {
        assetRows += `
          <tr>
            <td>${asset.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(asset.amount)}</td>
          </tr>
        `;
      }
      assetRows += `
        <tr style="font-weight: bold;">
          <td>Total Current Assets</td>
          <td class="text-right">${summary.totalCurrentAssetsFormatted}</td>
        </tr>
      `;

      if (assets.investments.length > 0) {
        assetRows += '<tr><td colspan="2" style="font-weight: bold; background-color: #e3f2fd;">INVESTMENTS</td></tr>';
        for (const asset of assets.investments) {
          assetRows += `
            <tr>
              <td>${asset.accountName}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(asset.amount)}</td>
            </tr>
          `;
        }
        assetRows += `
          <tr style="font-weight: bold;">
            <td>Total Investments</td>
            <td class="text-right">${summary.totalInvestmentsFormatted}</td>
          </tr>
        `;
      }

      let liabilityRows = '<tr><td colspan="2" style="font-weight: bold; background-color: #fff3cd;">CAPITAL & RESERVES</td></tr>';
      for (const liability of liabilities.capital) {
        liabilityRows += `
          <tr>
            <td>${liability.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(liability.amount)}</td>
          </tr>
        `;
      }
      for (const liability of liabilities.reserves) {
        liabilityRows += `
          <tr>
            <td>${liability.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(liability.amount)}</td>
          </tr>
        `;
      }
      if (result.profitLoss.isProfit) {
        liabilityRows += `
          <tr style="background-color: #e8f5e9;">
            <td>Add: Net Profit</td>
            <td class="text-right">${result.profitLoss.formatted}</td>
          </tr>
        `;
      } else {
        liabilityRows += `
          <tr style="background-color: #ffebee;">
            <td>Less: Net Loss</td>
            <td class="text-right">(${result.profitLoss.formatted})</td>
          </tr>
        `;
      }
      liabilityRows += `
        <tr style="font-weight: bold;">
          <td>Total Capital & Reserves</td>
          <td class="text-right">${summary.capitalAndReservesFormatted}</td>
        </tr>
      `;

      if (liabilities.longTermLiabilities.length > 0) {
        liabilityRows += '<tr><td colspan="2" style="font-weight: bold; background-color: #fff3cd;">LONG TERM LIABILITIES</td></tr>';
        for (const liability of liabilities.longTermLiabilities) {
          liabilityRows += `
            <tr>
              <td>${liability.accountName}</td>
              <td class="text-right">${PDFGenerationService.formatIndianCurrency(liability.amount)}</td>
            </tr>
          `;
        }
        liabilityRows += `
          <tr style="font-weight: bold;">
            <td>Total Long Term Liabilities</td>
            <td class="text-right">${summary.totalLongTermLiabilitiesFormatted}</td>
          </tr>
        `;
      }

      liabilityRows += '<tr><td colspan="2" style="font-weight: bold; background-color: #fff3cd;">CURRENT LIABILITIES</td></tr>';
      for (const liability of liabilities.currentLiabilities) {
        liabilityRows += `
          <tr>
            <td>${liability.accountName}</td>
            <td class="text-right">${PDFGenerationService.formatIndianCurrency(liability.amount)}</td>
          </tr>
        `;
      }
      liabilityRows += `
        <tr style="font-weight: bold;">
          <td>Total Current Liabilities</td>
          <td class="text-right">${summary.totalCurrentLiabilitiesFormatted}</td>
        </tr>
      `;

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'BALANCE SHEET', `As on ${asOnDate}`)}
        <table>
          <thead>
            <tr style="background-color: #2196F3; color: white;">
              <th colspan="2" class="text-center">LIABILITIES</th>
              <th colspan="2" class="text-center">ASSETS</th>
            </tr>
            <tr>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 10%;">Amount (₹)</th>
              <th style="width: 20%;">Particulars</th>
              <th style="width: 10%;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2">
                <table style="width: 100%; border: none;">
                  ${liabilityRows}
                </table>
              </td>
              <td colspan="2">
                <table style="width: 100%; border: none;">
                  ${assetRows}
                </table>
              </td>
            </tr>
            <tr style="font-weight: bold; background-color: #f0f0f0;">
              <td class="text-right">TOTAL:</td>
              <td class="text-right">${summary.totalLiabilitiesFormatted}</td>
              <td class="text-right">TOTAL:</td>
              <td class="text-right">${summary.totalAssetsFormatted}</td>
            </tr>
          </tbody>
        </table>
        <div class="summary">
          <p><strong>Summary:</strong></p>
          <p>Total Assets: ₹${summary.totalAssetsFormatted}</p>
          <p>Total Liabilities: ₹${summary.totalLiabilitiesFormatted}</p>
          <p>Difference: ₹${summary.differenceFormatted}</p>
          <p>Status: ${summary.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `BalanceSheet_${asOnDate.replace(/\//g, '-')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate balance sheet PDF error:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateCompleteFinalAccountsPDF(filters = {}, period = '', asOnDate = '') {
    try {
      const companyDetails = await PDFGenerationService.getCompanyDetails();

      const trialBalance = await TrialBalanceService.getTrialBalance(filters);
      const tradingAccount = await TradingProfitLossService.getTradingAccount(filters);
      const profitLoss = await TradingProfitLossService.getProfitAndLossAccount(filters);
      const balanceSheet = await BalanceSheetService.getBalanceSheet(asOnDate, filters);

      if (!trialBalance.success || !tradingAccount.success || !profitLoss.success || !balanceSheet.success) {
        return { success: false, error: 'Failed to generate complete final accounts' };
      }

      const content = `
        ${PDFGenerationService.generateCompanyHeader(companyDetails, 'COMPLETE FINAL ACCOUNTS', period)}
        
        <h2 style="text-align: center; color: #2196F3; margin-top: 30px;">1. TRIAL BALANCE</h2>
        <p style="text-align: center;">Status: ${trialBalance.summary.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}</p>
        
        <h2 style="text-align: center; color: #2196F3; margin-top: 30px;">2. TRADING ACCOUNT</h2>
        <p style="text-align: center;">${tradingAccount.calculations.isGrossProfit ? 'Gross Profit' : 'Gross Loss'}: ₹${tradingAccount.calculations.grossProfitFormatted}</p>
        
        <h2 style="text-align: center; color: #2196F3; margin-top: 30px;">3. PROFIT & LOSS ACCOUNT</h2>
        <p style="text-align: center;">${profitLoss.calculations.isNetProfit ? 'Net Profit' : 'Net Loss'}: ₹${profitLoss.calculations.netProfitFormatted}</p>
        
        <h2 style="text-align: center; color: #2196F3; margin-top: 30px;">4. BALANCE SHEET</h2>
        <p style="text-align: center;">Total Assets: ₹${balanceSheet.summary.totalAssetsFormatted}</p>
        <p style="text-align: center;">Total Liabilities: ₹${balanceSheet.summary.totalLiabilitiesFormatted}</p>
        <p style="text-align: center;">Status: ${balanceSheet.summary.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}</p>
        
        <div class="summary" style="margin-top: 30px;">
          <h3>FINANCIAL SUMMARY</h3>
          <p><strong>Gross Profit:</strong> ₹${tradingAccount.calculations.grossProfitFormatted}</p>
          <p><strong>Net Profit:</strong> ₹${profitLoss.calculations.netProfitFormatted}</p>
          <p><strong>Total Assets:</strong> ₹${balanceSheet.summary.totalAssetsFormatted}</p>
          <p><strong>Total Liabilities:</strong> ₹${balanceSheet.summary.totalLiabilitiesFormatted}</p>
          <p><strong>Working Capital:</strong> ₹${PDFGenerationService.formatIndianCurrency(balanceSheet.summary.totalCurrentAssets - balanceSheet.summary.totalCurrentLiabilities)}</p>
        </div>
      `;

      const html = PDFGenerationService.generateBaseHTML(content);
      const fileName = `CompleteFinalAccounts_${period.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      return await PDFGenerationService.generatePDFFromHTML(html, fileName);
    } catch (error) {
      console.error('Generate complete final accounts PDF error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default FinalAccountsPDFService;
