/**
 * ONE-CLICK SERVICE MANAGER
 * 
 * Automatically connects ALL services to screens
 * User clicks button → Service runs → Result shown
 * NO manual integration needed
 * 
 * Background services run automatically
 */

import TransactionRecordingService from '../accounting/transactionRecordingService';
import InvoiceEngine from '../invoice/InvoiceEngine';
import InvoiceDeliveryService from '../invoice/InvoiceDeliveryService';
import TaxOptimizationEngine from '../tax/TaxOptimizationEngine';
import InventoryAccountingEngine from '../autonomous/InventoryAccountingEngine';
import PayrollService from '../payroll/payrollService';
import BankReconciliationService from '../banking/bankReconciliationService';
import FinalAccountsPDFService from '../accounting/finalAccountsPDFService';
import PeriodClosingService from '../accounting/periodClosingService';
import BusinessHealthMonitor from '../health/BusinessHealthMonitor';
import AITransactionParser from '../ai/AITransactionParser';
import { supabase } from '../supabase';

class OneClickServiceManager {
  
  /**
   * ========================================
   * ONE-CLICK INVOICE CREATION
   * ========================================
   * User clicks "Create Invoice" → Everything happens automatically
   */
  static async createInvoiceOneClick(invoiceData, businessId) {
    try {
      console.log('🚀 ONE-CLICK INVOICE CREATION STARTED...');

      // Step 1: Create invoice
      const invoice = await InvoiceEngine.createInvoice(invoiceData, businessId);
      if (!invoice.success) throw new Error(invoice.error);

      // Step 2: Auto-create accounting entries (5+ entries)
      await TransactionRecordingService.recordTransaction({
        type: 'sale',
        invoiceId: invoice.invoiceId,
        amount: invoiceData.totalAmount,
        date: invoiceData.invoiceDate,
        businessId
      });

      // Step 3: Auto-update inventory
      await InventoryAccountingEngine.recordStockSale({
        items: invoiceData.items,
        invoiceId: invoice.invoiceId,
        date: invoiceData.invoiceDate
      });

      // Step 4: Auto-calculate tax savings
      const taxSavings = await TaxOptimizationEngine.getRealTimeSavings({
        amount: invoiceData.totalAmount,
        type: 'sale',
        date: invoiceData.invoiceDate,
        items: invoiceData.items
      });

      // Step 5: Generate PDF
      const pdf = await InvoiceDeliveryService.generatePDF(invoice.invoice, businessId);

      console.log('✅ ONE-CLICK INVOICE COMPLETE!');

      return {
        success: true,
        invoice: invoice.invoice,
        pdf: pdf.filePath,
        taxSavings: taxSavings.totalPotentialSavings,
        message: `Invoice created! ${taxSavings.hasSavings ? `💰 Save ₹${taxSavings.totalPotentialSavings}` : ''}`
      };

    } catch (error) {
      console.error('One-click invoice error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK JOURNAL ENTRY
   * ========================================
   * User creates journal entry → Auto-posted to ledger + PDF generated
   */
  static async createJournalEntryOneClick(journalData, businessId) {
    try {
      console.log('📝 ONE-CLICK JOURNAL ENTRY STARTED...');

      // Step 1: Create journal entry in database
      const { data: journalEntry, error } = await supabase
        .from('journal_entries')
        .insert({
          business_id: businessId,
          voucher_number: journalData.voucherNumber,
          date: journalData.date,
          narration: journalData.narration,
          total_debit: journalData.entries.reduce((sum, e) => sum + e.debit, 0),
          total_credit: journalData.entries.reduce((sum, e) => sum + e.credit, 0)
        })
        .select()
        .single();

      if (error) throw error;

      // Step 2: Create journal entry lines
      const lines = journalData.entries.map(entry => ({
        journal_entry_id: journalEntry.id,
        account_id: entry.accountId,
        account_name: entry.accountName,
        debit: entry.debit,
        credit: entry.credit
      }));

      await supabase.from('journal_entry_lines').insert(lines);

      // Step 3: Auto-post to ledger
      for (const entry of journalData.entries) {
        await supabase.from('ledger_entries').insert({
          business_id: businessId,
          account_id: entry.accountId,
          date: journalData.date,
          voucher_type: 'Journal',
          voucher_number: journalData.voucherNumber,
          narration: journalData.narration,
          debit: entry.debit,
          credit: entry.credit
        });
      }

      // Step 4: Generate PDF
      const pdf = await FinalAccountsPDFService.generateJournalEntryPDF(journalEntry, journalData);

      console.log('✅ ONE-CLICK JOURNAL ENTRY COMPLETE!');

      return {
        success: true,
        journalEntry,
        pdf: pdf.filePath,
        message: `Journal entry ${journalData.voucherNumber} created and posted to ledger!`
      };

    } catch (error) {
      console.error('One-click journal entry error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK AI TRANSACTION
   * ========================================
   * User types "Sold 5 laptops to John for 50000" → Everything happens
   */
  static async createAITransactionOneClick(naturalLanguageInput, businessId, userId) {
    try {
      console.log('🤖 AI TRANSACTION STARTED...');

      // Step 1: Parse natural language
      const parsed = await AITransactionParser.parseTransaction(naturalLanguageInput);
      if (!parsed.success) throw new Error(parsed.error);

      // Step 2: Create transaction based on type
      let result;
      if (parsed.transactionType === 'sale') {
        result = await this.createInvoiceOneClick({
          customerId: parsed.partyId,
          items: parsed.items,
          totalAmount: parsed.amount,
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString()
        }, businessId);
      } else if (parsed.transactionType === 'purchase') {
        result = await this.createPurchaseOneClick(parsed, businessId);
      } else if (parsed.transactionType === 'expense') {
        result = await this.createExpenseOneClick(parsed, businessId);
      }

      console.log('✅ AI TRANSACTION COMPLETE!');
      return result;

    } catch (error) {
      console.error('AI transaction error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK PURCHASE
   * ========================================
   */
  static async createPurchaseOneClick(purchaseData, businessId) {
    try {
      console.log('🛒 ONE-CLICK PURCHASE STARTED...');

      // Step 1: Record purchase
      await InventoryAccountingEngine.recordStockPurchase({
        vendorId: purchaseData.vendorId,
        items: purchaseData.items,
        totalAmount: purchaseData.amount,
        date: new Date().toISOString()
      });

      // Step 2: Auto-create accounting entries
      await TransactionRecordingService.recordTransaction({
        type: 'purchase',
        amount: purchaseData.amount,
        date: new Date().toISOString(),
        businessId
      });

      console.log('✅ ONE-CLICK PURCHASE COMPLETE!');
      return { success: true, message: 'Purchase recorded!' };

    } catch (error) {
      console.error('One-click purchase error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK EXPENSE
   * ========================================
   */
  static async createExpenseOneClick(expenseData, businessId) {
    try {
      console.log('💸 ONE-CLICK EXPENSE STARTED...');

      // Auto-create accounting entries
      await TransactionRecordingService.recordTransaction({
        type: 'expense',
        amount: expenseData.amount,
        category: expenseData.category,
        date: new Date().toISOString(),
        businessId
      });

      console.log('✅ ONE-CLICK EXPENSE COMPLETE!');
      return { success: true, message: 'Expense recorded!' };

    } catch (error) {
      console.error('One-click expense error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK PERIOD CLOSING
   * ========================================
   * User clicks "Close Month" → Everything happens
   */
  static async closePeriodOneClick(period, businessId) {
    try {
      console.log('📊 ONE-CLICK PERIOD CLOSING STARTED...');

      // Step 1: Close period
      const result = await PeriodClosingService.closePeriod(period, businessId);
      if (!result.success) throw new Error(result.error);

      // Step 2: Generate all PDFs
      const trialBalance = await FinalAccountsPDFService.generateTrialBalancePDF({}, period);
      const tradingAccount = await FinalAccountsPDFService.generateTradingAccountPDF({}, period);
      const profitLoss = await FinalAccountsPDFService.generateProfitLossPDF({}, period);
      const balanceSheet = await FinalAccountsPDFService.generateBalanceSheetPDF({}, period);

      console.log('✅ ONE-CLICK PERIOD CLOSING COMPLETE!');

      return {
        success: true,
        pdfs: {
          trialBalance: trialBalance.filePath,
          tradingAccount: tradingAccount.filePath,
          profitLoss: profitLoss.filePath,
          balanceSheet: balanceSheet.filePath
        },
        message: 'Period closed! All reports generated!'
      };

    } catch (error) {
      console.error('One-click period closing error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK PAYROLL
   * ========================================
   * User clicks "Process Payroll" → Everything happens
   */
  static async processPayrollOneClick(month, year, businessId) {
    try {
      console.log('💼 ONE-CLICK PAYROLL STARTED...');

      // Step 1: Calculate payroll
      const result = await PayrollService.processMonthlyPayroll(month, year, businessId);
      if (!result.success) throw new Error(result.error);

      // Step 2: Generate payslips
      const payslips = await PayrollService.generateAllPayslips(month, year, businessId);

      // Step 3: Create accounting entries
      await TransactionRecordingService.recordTransaction({
        type: 'expense',
        amount: result.totalPayroll,
        category: 'salary',
        date: new Date().toISOString(),
        businessId
      });

      console.log('✅ ONE-CLICK PAYROLL COMPLETE!');

      return {
        success: true,
        totalPayroll: result.totalPayroll,
        employeeCount: result.employeeCount,
        payslips: payslips.files,
        message: `Payroll processed! ₹${result.totalPayroll} for ${result.employeeCount} employees`
      };

    } catch (error) {
      console.error('One-click payroll error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK BANK RECONCILIATION
   * ========================================
   * User clicks "Reconcile Bank" → Everything happens
   */
  static async reconcileBankOneClick(connectionId) {
    try {
      console.log('🏦 ONE-CLICK BANK RECONCILIATION STARTED...');

      // Auto-match transactions
      const result = await BankReconciliationService.autoMatchTransactions(connectionId);
      if (!result.success) throw new Error(result.error);

      console.log('✅ ONE-CLICK BANK RECONCILIATION COMPLETE!');

      return {
        success: true,
        matchedCount: result.matchedCount,
        message: `Matched ${result.matchedCount} transactions automatically!`
      };

    } catch (error) {
      console.error('One-click bank reconciliation error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * ONE-CLICK BUSINESS HEALTH CHECK
   * ========================================
   * Runs automatically in background
   */
  static async checkBusinessHealthOneClick(businessId) {
    try {
      console.log('🏥 BUSINESS HEALTH CHECK STARTED...');

      const health = await BusinessHealthMonitor.getBusinessHealth(businessId);

      console.log('✅ BUSINESS HEALTH CHECK COMPLETE!');

      return {
        success: true,
        status: health.overallStatus,
        score: health.healthScore,
        alerts: health.alerts,
        message: `Business health: ${health.overallStatus} (${health.healthScore}/100)`
      };

    } catch (error) {
      console.error('Business health check error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ========================================
   * BACKGROUND AUTOMATION
   * ========================================
   * Runs automatically every hour
   */
  static async runBackgroundAutomation(businessId) {
    try {
      console.log('⚙️ BACKGROUND AUTOMATION STARTED...');

      // 1. Check business health
      await this.checkBusinessHealthOneClick(businessId);

      // 2. Auto-reconcile bank (if connected)
      // await this.reconcileBankOneClick(connectionId);

      // 3. Check tax optimization opportunities
      // await TaxOptimizationEngine.scanForOpportunities(businessId);

      console.log('✅ BACKGROUND AUTOMATION COMPLETE!');

    } catch (error) {
      console.error('Background automation error:', error);
    }
  }
}

export default OneClickServiceManager;
