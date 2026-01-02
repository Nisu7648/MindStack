/**
 * AUTONOMOUS ACCOUNTING ENGINE
 * 
 * Core intelligence that runs accounting in the background
 * Zero accounting knowledge required from users
 * Auto-captures, auto-classifies, auto-reconciles
 */

import { getDatabase } from '../database/schema';
import { calculateGSTBreakdown } from '../tax/gstCalculator';

/**
 * TRANSACTION AUTO-CAPTURE ENGINE
 * Captures transactions from multiple sources automatically
 */
export class TransactionCaptureEngine {
  
  /**
   * AUTO-CAPTURE FROM POS SALE
   * When a sale happens in POS, automatically create all accounting entries
   */
  static async captureFromPOSSale(saleData) {
    const db = await getDatabase();
    
    try {
      await db.transaction(async (tx) => {
        const {
          customerId,
          items,
          totalAmount,
          taxAmount,
          paymentMode,
          timestamp
        } = saleData;

        // 1. Create sales transaction
        const transactionId = await this.createSalesTransaction(tx, {
          customerId,
          totalAmount,
          taxAmount,
          paymentMode,
          timestamp,
          source: 'POS'
        });

        // 2. Auto-create inventory entries
        for (const item of items) {
          await this.updateInventoryFromSale(tx, item, transactionId);
        }

        // 3. Auto-create tax entries
        if (taxAmount > 0) {
          await this.createTaxEntries(tx, transactionId, taxAmount, saleData);
        }

        // 4. Auto-update customer balance
        await this.updateCustomerBalance(tx, customerId, totalAmount);

        // 5. Auto-create cash/bank entry
        await this.createPaymentEntry(tx, transactionId, paymentMode, totalAmount);

        // 6. Auto-calculate profit
        await this.calculateAndRecordProfit(tx, transactionId, items);

        console.log(`✅ Auto-captured POS sale: Transaction ${transactionId}`);
      });

      return { success: true, message: 'Sale captured automatically' };
    } catch (error) {
      console.error('Auto-capture failed:', error);
      throw error;
    }
  }

  /**
   * AUTO-CAPTURE FROM INVOICE
   * When invoice is created, auto-create all entries
   */
  static async captureFromInvoice(invoiceData) {
    const db = await getDatabase();
    
    try {
      await db.transaction(async (tx) => {
        const {
          invoiceNumber,
          customerId,
          items,
          subtotal,
          gstAmount,
          totalAmount,
          dueDate,
          paymentTerms
        } = invoiceData;

        // 1. Create invoice record
        const invoiceId = await this.createInvoiceRecord(tx, invoiceData);

        // 2. Create sales entry (Dr. Customer, Cr. Sales)
        const transactionId = await this.createSalesEntry(tx, {
          customerId,
          amount: subtotal,
          invoiceId,
          type: 'CREDIT_SALE'
        });

        // 3. Create GST entries
        if (gstAmount > 0) {
          await this.createGSTEntries(tx, transactionId, gstAmount, invoiceData);
        }

        // 4. Update customer receivables
        await this.updateReceivables(tx, customerId, totalAmount, dueDate);

        // 5. Reserve inventory (if applicable)
        for (const item of items) {
          await this.reserveInventory(tx, item, invoiceId);
        }

        // 6. Create payment schedule
        await this.createPaymentSchedule(tx, invoiceId, totalAmount, paymentTerms);

        console.log(`✅ Auto-captured invoice: ${invoiceNumber}`);
      });

      return { success: true, message: 'Invoice captured automatically' };
    } catch (error) {
      console.error('Invoice capture failed:', error);
      throw error;
    }
  }

  /**
   * AUTO-CAPTURE FROM BANK TRANSACTION
   * When bank data syncs, auto-match and create entries
   */
  static async captureFromBankTransaction(bankTxn) {
    const db = await getDatabase();
    
    try {
      // 1. Try to auto-match with existing invoice/expense
      const match = await this.autoMatchBankTransaction(bankTxn);

      if (match) {
        // Auto-reconcile matched transaction
        await this.autoReconcile(db, bankTxn, match);
        console.log(`✅ Auto-matched and reconciled: ${bankTxn.reference}`);
        return { success: true, matched: true, match };
      }

      // 2. If no match, try to auto-classify
      const classification = await this.autoClassifyExpense(bankTxn);

      if (classification.confidence > 0.8) {
        // Auto-create expense entry
        await this.createExpenseFromBank(db, bankTxn, classification);
        console.log(`✅ Auto-classified expense: ${classification.category}`);
        return { success: true, autoClassified: true, classification };
      }

      // 3. If can't auto-classify, flag for review
      await this.flagForReview(db, bankTxn, 'UNMATCHED');
      console.log(`⚠️ Flagged for review: ${bankTxn.reference}`);
      return { success: true, needsReview: true };

    } catch (error) {
      console.error('Bank transaction capture failed:', error);
      throw error;
    }
  }

  /**
   * AUTO-CAPTURE FROM TEXT INPUT
   * "Paid rent 15000 cash" → Auto-create expense entry
   */
  static async captureFromText(textInput, userId) {
    const db = await getDatabase();
    
    try {
      // 1. Parse natural language
      const parsed = await this.parseNaturalLanguage(textInput);

      if (!parsed.success) {
        return { success: false, error: 'Could not understand input' };
      }

      // 2. Auto-classify expense category
      const category = await this.autoClassifyFromText(parsed.description);

      // 3. Create expense entry
      await db.transaction(async (tx) => {
        const transactionId = await this.createExpenseEntry(tx, {
          description: parsed.description,
          amount: parsed.amount,
          paymentMode: parsed.paymentMode,
          category: category,
          date: parsed.date || new Date(),
          userId
        });

        // 4. Update cash/bank
        await this.updateCashOrBank(tx, parsed.paymentMode, parsed.amount, 'DEBIT');

        // 5. Check if tax deductible
        const taxInfo = await this.checkTaxDeductibility(category, parsed.amount);
        if (taxInfo.deductible) {
          await this.recordTaxDeduction(tx, transactionId, taxInfo);
        }

        console.log(`✅ Auto-captured from text: ${parsed.description}`);
      });

      return { success: true, parsed, category };
    } catch (error) {
      console.error('Text capture failed:', error);
      throw error;
    }
  }

  /**
   * AUTO-CAPTURE FROM UPLOADED BILL
   * OCR → Extract data → Create expense entry
   */
  static async captureFromUploadedBill(imageUri, userId) {
    const db = await getDatabase();
    
    try {
      // 1. OCR to extract bill data
      const ocrData = await this.performOCR(imageUri);

      if (!ocrData.success) {
        return { success: false, error: 'Could not read bill' };
      }

      // 2. Extract key information
      const billData = {
        vendorName: ocrData.vendorName,
        amount: ocrData.totalAmount,
        date: ocrData.date,
        billNumber: ocrData.billNumber,
        gstNumber: ocrData.gstNumber,
        items: ocrData.items
      };

      // 3. Auto-classify expense
      const category = await this.autoClassifyFromVendor(billData.vendorName);

      // 4. Create expense entry
      await db.transaction(async (tx) => {
        const transactionId = await this.createExpenseEntry(tx, {
          description: `Bill from ${billData.vendorName}`,
          amount: billData.amount,
          category: category,
          date: billData.date,
          billNumber: billData.billNumber,
          userId,
          attachmentUri: imageUri
        });

        // 5. Create vendor entry if new
        const vendorId = await this.getOrCreateVendor(tx, billData);

        // 6. Update payables
        await this.updatePayables(tx, vendorId, billData.amount);

        // 7. Extract GST if present
        if (billData.gstNumber) {
          await this.extractAndRecordGST(tx, transactionId, ocrData);
        }

        console.log(`✅ Auto-captured from bill: ${billData.billNumber}`);
      });

      return { success: true, billData, category };
    } catch (error) {
      console.error('Bill capture failed:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  static async createSalesTransaction(tx, data) {
    const query = `
      INSERT INTO transactions (
        voucher_type, date, narration, total_amount, 
        status, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await tx.executeSql(query, [
      'SALES',
      data.timestamp,
      `POS Sale - ${data.paymentMode}`,
      data.totalAmount,
      'POSTED',
      data.source,
      new Date().toISOString()
    ]);

    const transactionId = result[0].insertId;

    // Create ledger entries (Double-entry)
    // Dr. Cash/Bank
    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, data.paymentMode === 'CASH' ? 'Cash' : 'Bank', data.totalAmount, 0, data.timestamp]
    );

    // Cr. Sales
    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Sales', 0, data.totalAmount - data.taxAmount, data.timestamp]
    );

    return transactionId;
  }

  static async updateInventoryFromSale(tx, item, transactionId) {
    // 1. Reduce stock quantity
    await tx.executeSql(
      `UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?`,
      [item.quantity, item.productId]
    );

    // 2. Record inventory movement
    await tx.executeSql(
      `INSERT INTO inventory_movements (
        product_id, transaction_id, movement_type, 
        quantity, unit_cost, total_cost, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        item.productId,
        transactionId,
        'SALE',
        -item.quantity,
        item.costPrice,
        item.costPrice * item.quantity,
        new Date().toISOString()
      ]
    );

    // 3. Update COGS (Cost of Goods Sold)
    const cogs = item.costPrice * item.quantity;
    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Cost of Goods Sold', cogs, 0, new Date().toISOString()]
    );

    await tx.executeSql(
      `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
       VALUES (?, ?, ?, ?, ?)`,
      [transactionId, 'Inventory', 0, cogs, new Date().toISOString()]
    );
  }

  static async createTaxEntries(tx, transactionId, taxAmount, saleData) {
    const gstBreakdown = calculateGSTBreakdown(
      taxAmount,
      saleData.customerState,
      saleData.businessState
    );

    if (gstBreakdown.isIntraState) {
      // CGST
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'CGST Payable', 0, gstBreakdown.cgst, new Date().toISOString()]
      );

      // SGST
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'SGST Payable', 0, gstBreakdown.sgst, new Date().toISOString()]
      );
    } else {
      // IGST
      await tx.executeSql(
        `INSERT INTO ledger (transaction_id, account_name, debit, credit, date)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, 'IGST Payable', 0, gstBreakdown.igst, new Date().toISOString()]
      );
    }

    // Record in GST transactions table
    await tx.executeSql(
      `INSERT INTO gst_transactions (
        transaction_id, gst_type, cgst, sgst, igst, 
        total_gst, taxable_amount, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        gstBreakdown.isIntraState ? 'INTRA_STATE' : 'INTER_STATE',
        gstBreakdown.cgst,
        gstBreakdown.sgst,
        gstBreakdown.igst,
        taxAmount,
        saleData.totalAmount - taxAmount,
        new Date().toISOString()
      ]
    );
  }

  static async updateCustomerBalance(tx, customerId, amount) {
    await tx.executeSql(
      `UPDATE customers 
       SET outstanding_balance = outstanding_balance + ?,
           last_transaction_date = ?
       WHERE id = ?`,
      [amount, new Date().toISOString(), customerId]
    );
  }

  static async createPaymentEntry(tx, transactionId, paymentMode, amount) {
    await tx.executeSql(
      `INSERT INTO payments (
        transaction_id, payment_mode, amount, 
        payment_date, status
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        transactionId,
        paymentMode,
        amount,
        new Date().toISOString(),
        'COMPLETED'
      ]
    );
  }

  static async calculateAndRecordProfit(tx, transactionId, items) {
    let totalRevenue = 0;
    let totalCost = 0;

    for (const item of items) {
      totalRevenue += item.sellingPrice * item.quantity;
      totalCost += item.costPrice * item.quantity;
    }

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = (grossProfit / totalRevenue) * 100;

    await tx.executeSql(
      `INSERT INTO profit_analysis (
        transaction_id, revenue, cost, gross_profit, 
        profit_margin, date
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        totalRevenue,
        totalCost,
        grossProfit,
        profitMargin,
        new Date().toISOString()
      ]
    );
  }

  static async autoMatchBankTransaction(bankTxn) {
    const db = await getDatabase();
    
    // Try to match with invoices
    const invoiceMatch = await db.executeSql(
      `SELECT * FROM invoices 
       WHERE ABS(total_amount - ?) < 1 
       AND payment_status = 'PENDING'
       AND DATE(due_date) >= DATE(?, '-7 days')
       LIMIT 1`,
      [bankTxn.amount, bankTxn.date]
    );

    if (invoiceMatch[0].rows.length > 0) {
      return {
        type: 'INVOICE',
        record: invoiceMatch[0].rows.item(0),
        confidence: 0.95
      };
    }

    // Try to match with expenses
    const expenseMatch = await db.executeSql(
      `SELECT * FROM expenses 
       WHERE ABS(amount - ?) < 1 
       AND payment_status = 'PENDING'
       AND DATE(date) >= DATE(?, '-7 days')
       LIMIT 1`,
      [bankTxn.amount, bankTxn.date]
    );

    if (expenseMatch[0].rows.length > 0) {
      return {
        type: 'EXPENSE',
        record: expenseMatch[0].rows.item(0),
        confidence: 0.90
      };
    }

    return null;
  }

  static async autoClassifyExpense(bankTxn) {
    // AI-based classification using transaction description
    const description = bankTxn.description.toLowerCase();
    
    const categories = {
      'rent': { category: 'Rent', confidence: 0.95 },
      'salary': { category: 'Salaries', confidence: 0.95 },
      'electricity': { category: 'Utilities', confidence: 0.90 },
      'internet': { category: 'Utilities', confidence: 0.90 },
      'fuel': { category: 'Transportation', confidence: 0.85 },
      'office': { category: 'Office Supplies', confidence: 0.80 },
      'marketing': { category: 'Marketing', confidence: 0.85 },
      'insurance': { category: 'Insurance', confidence: 0.90 }
    };

    for (const [keyword, classification] of Object.entries(categories)) {
      if (description.includes(keyword)) {
        return classification;
      }
    }

    return { category: 'Miscellaneous', confidence: 0.50 };
  }

  static async parseNaturalLanguage(text) {
    // Simple NLP parser for common patterns
    const patterns = [
      {
        regex: /paid\s+(\w+)\s+(\d+)\s+(cash|bank)/i,
        extract: (match) => ({
          description: match[1],
          amount: parseFloat(match[2]),
          paymentMode: match[3].toUpperCase()
        })
      },
      {
        regex: /(\w+)\s+ko\s+(\d+)\s+rupaye\s+(cash|bank)/i,
        extract: (match) => ({
          description: `Payment to ${match[1]}`,
          amount: parseFloat(match[2]),
          paymentMode: match[3].toUpperCase()
        })
      }
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        return {
          success: true,
          ...pattern.extract(match)
        };
      }
    }

    return { success: false };
  }

  static async performOCR(imageUri) {
    // OCR implementation using Tesseract or similar
    // This is a placeholder - actual implementation would use OCR library
    return {
      success: true,
      vendorName: 'Extracted Vendor',
      totalAmount: 1000,
      date: new Date().toISOString(),
      billNumber: 'BILL-001',
      gstNumber: null,
      items: []
    };
  }
}

export default TransactionCaptureEngine;
