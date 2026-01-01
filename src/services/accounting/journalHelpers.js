/**
 * ═══════════════════════════════════════════════════════════════════════════
 * JOURNAL ENTRY HELPERS - COMMON BUSINESS TRANSACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Pre-built journal entry templates for common Indian business transactions
 * Following Golden Rules of Accounting and Indian Accounting Standards
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { JournalService, VOUCHER_TYPES, ACCOUNT_GROUPS, PAYMENT_MODES } from './journalService';

export class JournalHelpers {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CASH SALE - Goods sold for cash
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Cash A/c                 ₹X
   *     Cr. Sales A/c                    ₹X
   * 
   * Golden Rule: Real Account (Cash comes in - Debit)
   *              Nominal Account (Income - Credit)
   */
  static async recordCashSale(data) {
    const { amount, customerName, invoiceNumber, gstRate = 0, date } = data;

    let salesAmount = amount;
    let gstAmount = 0;
    let cgst = 0;
    let sgst = 0;

    if (gstRate > 0) {
      salesAmount = amount / (1 + gstRate / 100);
      gstAmount = amount - salesAmount;
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    }

    const entries = [
      {
        accountCode: ACCOUNT_GROUPS.CASH,
        accountName: 'Cash',
        accountType: 'REAL',
        debit: amount,
        credit: 0,
        narration: `Cash received from ${customerName || 'customer'}`
      },
      {
        accountCode: ACCOUNT_GROUPS.DOMESTIC_SALES,
        accountName: 'Sales',
        accountType: 'NOMINAL',
        debit: 0,
        credit: salesAmount,
        narration: `Goods sold to ${customerName || 'customer'}`
      }
    ];

    if (gstRate > 0) {
      entries.push({
        accountCode: ACCOUNT_GROUPS.GST_OUTPUT_CGST,
        accountName: 'GST Output CGST',
        accountType: 'PERSONAL',
        debit: 0,
        credit: cgst,
        narration: `CGST @ ${gstRate / 2}%`
      });
      entries.push({
        accountCode: ACCOUNT_GROUPS.GST_OUTPUT_SGST,
        accountName: 'GST Output SGST',
        accountType: 'PERSONAL',
        debit: 0,
        credit: sgst,
        narration: `SGST @ ${gstRate / 2}%`
      });
    }

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.SALES,
      date: date || new Date().toISOString(),
      narration: `Cash sale to ${customerName || 'customer'}${invoiceNumber ? ` - Invoice ${invoiceNumber}` : ''}`,
      reference: invoiceNumber,
      entries,
      paymentMode: PAYMENT_MODES.CASH,
      partyDetails: { name: customerName },
      gstDetails: gstRate > 0 ? { rate: gstRate, cgst, sgst, amount: gstAmount } : null
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREDIT SALE - Goods sold on credit
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Debtor/Customer A/c      ₹X
   *     Cr. Sales A/c                    ₹X
   * 
   * Golden Rule: Personal Account (Receiver - Debit)
   *              Nominal Account (Income - Credit)
   */
  static async recordCreditSale(data) {
    const { amount, customerName, invoiceNumber, gstRate = 0, date } = data;

    let salesAmount = amount;
    let gstAmount = 0;
    let cgst = 0;
    let sgst = 0;

    if (gstRate > 0) {
      salesAmount = amount / (1 + gstRate / 100);
      gstAmount = amount - salesAmount;
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    }

    const entries = [
      {
        accountCode: ACCOUNT_GROUPS.ACCOUNTS_RECEIVABLE,
        accountName: customerName || 'Sundry Debtors',
        accountType: 'PERSONAL',
        debit: amount,
        credit: 0,
        narration: `Goods sold on credit to ${customerName || 'customer'}`
      },
      {
        accountCode: ACCOUNT_GROUPS.DOMESTIC_SALES,
        accountName: 'Sales',
        accountType: 'NOMINAL',
        debit: 0,
        credit: salesAmount,
        narration: `Credit sale to ${customerName || 'customer'}`
      }
    ];

    if (gstRate > 0) {
      entries.push({
        accountCode: ACCOUNT_GROUPS.GST_OUTPUT_CGST,
        accountName: 'GST Output CGST',
        accountType: 'PERSONAL',
        debit: 0,
        credit: cgst,
        narration: `CGST @ ${gstRate / 2}%`
      });
      entries.push({
        accountCode: ACCOUNT_GROUPS.GST_OUTPUT_SGST,
        accountName: 'GST Output SGST',
        accountType: 'PERSONAL',
        debit: 0,
        credit: sgst,
        narration: `SGST @ ${gstRate / 2}%`
      });
    }

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.SALES,
      date: date || new Date().toISOString(),
      narration: `Credit sale to ${customerName || 'customer'}${invoiceNumber ? ` - Invoice ${invoiceNumber}` : ''}`,
      reference: invoiceNumber,
      entries,
      paymentMode: PAYMENT_MODES.CREDIT,
      partyDetails: { name: customerName },
      gstDetails: gstRate > 0 ? { rate: gstRate, cgst, sgst, amount: gstAmount } : null
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CASH PURCHASE - Goods purchased for cash
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Purchase A/c             ₹X
   *     Cr. Cash A/c                     ₹X
   * 
   * Golden Rule: Nominal Account (Expense - Debit)
   *              Real Account (Cash goes out - Credit)
   */
  static async recordCashPurchase(data) {
    const { amount, supplierName, invoiceNumber, gstRate = 0, date } = data;

    let purchaseAmount = amount;
    let gstAmount = 0;
    let cgst = 0;
    let sgst = 0;

    if (gstRate > 0) {
      purchaseAmount = amount / (1 + gstRate / 100);
      gstAmount = amount - purchaseAmount;
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    }

    const entries = [
      {
        accountCode: ACCOUNT_GROUPS.PURCHASES,
        accountName: 'Purchases',
        accountType: 'NOMINAL',
        debit: purchaseAmount,
        credit: 0,
        narration: `Goods purchased from ${supplierName || 'supplier'}`
      }
    ];

    if (gstRate > 0) {
      entries.push({
        accountCode: '10500', // GST Input CGST
        accountName: 'GST Input CGST',
        accountType: 'REAL',
        debit: cgst,
        credit: 0,
        narration: `CGST @ ${gstRate / 2}% (ITC)`
      });
      entries.push({
        accountCode: '10501', // GST Input SGST
        accountName: 'GST Input SGST',
        accountType: 'REAL',
        debit: sgst,
        credit: 0,
        narration: `SGST @ ${gstRate / 2}% (ITC)`
      });
    }

    entries.push({
      accountCode: ACCOUNT_GROUPS.CASH,
      accountName: 'Cash',
      accountType: 'REAL',
      debit: 0,
      credit: amount,
      narration: `Cash paid to ${supplierName || 'supplier'}`
    });

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.PURCHASE,
      date: date || new Date().toISOString(),
      narration: `Cash purchase from ${supplierName || 'supplier'}${invoiceNumber ? ` - Invoice ${invoiceNumber}` : ''}`,
      reference: invoiceNumber,
      entries,
      paymentMode: PAYMENT_MODES.CASH,
      partyDetails: { name: supplierName },
      gstDetails: gstRate > 0 ? { rate: gstRate, cgst, sgst, amount: gstAmount } : null
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PAYMENT TO CREDITOR - Paying supplier
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Creditor/Supplier A/c    ₹X
   *     Cr. Cash/Bank A/c                ₹X
   * 
   * Golden Rule: Personal Account (Giver - Debit)
   *              Real Account (Cash/Bank goes out - Credit)
   */
  static async recordPaymentToCreditor(data) {
    const { amount, supplierName, paymentMode = PAYMENT_MODES.CASH, reference, date } = data;

    const entries = [
      {
        accountCode: ACCOUNT_GROUPS.ACCOUNTS_PAYABLE,
        accountName: supplierName || 'Sundry Creditors',
        accountType: 'PERSONAL',
        debit: amount,
        credit: 0,
        narration: `Payment made to ${supplierName || 'supplier'}`
      },
      {
        accountCode: paymentMode === PAYMENT_MODES.CASH ? ACCOUNT_GROUPS.CASH : ACCOUNT_GROUPS.BANK,
        accountName: paymentMode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
        accountType: 'REAL',
        debit: 0,
        credit: amount,
        narration: `Payment to ${supplierName || 'supplier'} via ${paymentMode}`
      }
    ];

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.PAYMENT,
      date: date || new Date().toISOString(),
      narration: `Payment to ${supplierName || 'supplier'} via ${paymentMode}`,
      reference,
      entries,
      paymentMode,
      partyDetails: { name: supplierName }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RECEIPT FROM DEBTOR - Receiving from customer
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Cash/Bank A/c            ₹X
   *     Cr. Debtor/Customer A/c          ₹X
   * 
   * Golden Rule: Real Account (Cash/Bank comes in - Debit)
   *              Personal Account (Giver - Credit)
   */
  static async recordReceiptFromDebtor(data) {
    const { amount, customerName, paymentMode = PAYMENT_MODES.CASH, reference, date } = data;

    const entries = [
      {
        accountCode: paymentMode === PAYMENT_MODES.CASH ? ACCOUNT_GROUPS.CASH : ACCOUNT_GROUPS.BANK,
        accountName: paymentMode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
        accountType: 'REAL',
        debit: amount,
        credit: 0,
        narration: `Receipt from ${customerName || 'customer'} via ${paymentMode}`
      },
      {
        accountCode: ACCOUNT_GROUPS.ACCOUNTS_RECEIVABLE,
        accountName: customerName || 'Sundry Debtors',
        accountType: 'PERSONAL',
        debit: 0,
        credit: amount,
        narration: `Payment received from ${customerName || 'customer'}`
      }
    ];

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.RECEIPT,
      date: date || new Date().toISOString(),
      narration: `Receipt from ${customerName || 'customer'} via ${paymentMode}`,
      reference,
      entries,
      paymentMode,
      partyDetails: { name: customerName }
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * EXPENSE PAYMENT - Paying business expenses
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Expense A/c              ₹X
   *     Cr. Cash/Bank A/c                ₹X
   * 
   * Golden Rule: Nominal Account (Expense - Debit)
   *              Real Account (Cash/Bank goes out - Credit)
   */
  static async recordExpensePayment(data) {
    const { amount, expenseType, description, paymentMode = PAYMENT_MODES.CASH, tdsSection = null, date } = data;

    let expenseAmount = amount;
    let tdsAmount = 0;
    let paymentAmount = amount;

    // Calculate TDS if applicable
    if (tdsSection && tdsSection.rate) {
      tdsAmount = (amount * tdsSection.rate) / 100;
      paymentAmount = amount - tdsAmount;
    }

    const entries = [
      {
        accountCode: this.getExpenseAccountCode(expenseType),
        accountName: expenseType || 'Expense',
        accountType: 'NOMINAL',
        debit: expenseAmount,
        credit: 0,
        narration: description || `${expenseType} expense`
      },
      {
        accountCode: paymentMode === PAYMENT_MODES.CASH ? ACCOUNT_GROUPS.CASH : ACCOUNT_GROUPS.BANK,
        accountName: paymentMode === PAYMENT_MODES.CASH ? 'Cash' : 'Bank',
        accountType: 'REAL',
        debit: 0,
        credit: paymentAmount,
        narration: `Payment for ${expenseType} via ${paymentMode}`
      }
    ];

    // Add TDS entry if applicable
    if (tdsAmount > 0) {
      entries.push({
        accountCode: ACCOUNT_GROUPS.TDS_PAYABLE,
        accountName: 'TDS Payable',
        accountType: 'PERSONAL',
        debit: 0,
        credit: tdsAmount,
        narration: `TDS deducted u/s ${tdsSection.section} @ ${tdsSection.rate}%`
      });
    }

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.PAYMENT,
      date: date || new Date().toISOString(),
      narration: description || `${expenseType} expense payment`,
      entries,
      paymentMode,
      tdsDetails: tdsAmount > 0 ? { section: tdsSection.section, rate: tdsSection.rate, amount: tdsAmount } : null
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CONTRA ENTRY - Cash to Bank or Bank to Cash
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry (Cash deposited to Bank):
   * Dr. Bank A/c                 ₹X
   *     Cr. Cash A/c                     ₹X
   * 
   * Golden Rule: Real Account (Bank comes in - Debit)
   *              Real Account (Cash goes out - Credit)
   */
  static async recordContraEntry(data) {
    const { amount, fromAccount, toAccount, description, date } = data;

    const entries = [
      {
        accountCode: toAccount === 'BANK' ? ACCOUNT_GROUPS.BANK : ACCOUNT_GROUPS.CASH,
        accountName: toAccount === 'BANK' ? 'Bank' : 'Cash',
        accountType: 'REAL',
        debit: amount,
        credit: 0,
        narration: description || `Transfer from ${fromAccount} to ${toAccount}`
      },
      {
        accountCode: fromAccount === 'CASH' ? ACCOUNT_GROUPS.CASH : ACCOUNT_GROUPS.BANK,
        accountName: fromAccount === 'CASH' ? 'Cash' : 'Bank',
        accountType: 'REAL',
        debit: 0,
        credit: amount,
        narration: description || `Transfer from ${fromAccount} to ${toAccount}`
      }
    ];

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.CONTRA,
      date: date || new Date().toISOString(),
      narration: description || `Contra entry: ${fromAccount} to ${toAccount}`,
      entries
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * DEPRECIATION ENTRY - As per Companies Act Schedule II
   * ═══════════════════════════════════════════════════════════════════════
   * 
   * Entry:
   * Dr. Depreciation Expense A/c ₹X
   *     Cr. Accumulated Depreciation A/c ₹X
   * 
   * Golden Rule: Nominal Account (Expense - Debit)
   *              Real Account (Asset reduction - Credit)
   */
  static async recordDepreciation(data) {
    const { amount, assetName, assetCode, rate, method = 'SLM', date } = data;

    const entries = [
      {
        accountCode: ACCOUNT_GROUPS.DEPRECIATION,
        accountName: 'Depreciation',
        accountType: 'NOMINAL',
        debit: amount,
        credit: 0,
        narration: `Depreciation on ${assetName} @ ${rate}% (${method})`
      },
      {
        accountCode: `${assetCode}_ACC_DEP`,
        accountName: `Accumulated Depreciation - ${assetName}`,
        accountType: 'REAL',
        debit: 0,
        credit: amount,
        narration: `Accumulated depreciation on ${assetName}`
      }
    ];

    return await JournalService.createJournalEntry({
      voucherType: VOUCHER_TYPES.JOURNAL,
      date: date || new Date().toISOString(),
      narration: `Depreciation on ${assetName} @ ${rate}% (${method})`,
      entries
    });
  }

  /**
   * Helper: Get expense account code based on expense type
   */
  static getExpenseAccountCode(expenseType) {
    const expenseMap = {
      'Rent': ACCOUNT_GROUPS.RENT,
      'Salary': ACCOUNT_GROUPS.SALARIES,
      'Electricity': ACCOUNT_GROUPS.ELECTRICITY,
      'Telephone': ACCOUNT_GROUPS.TELEPHONE,
      'Interest': ACCOUNT_GROUPS.INTEREST_EXPENSE
    };
    return expenseMap[expenseType] || ACCOUNT_GROUPS.INDIRECT_EXPENSES;
  }
}

export default JournalHelpers;
