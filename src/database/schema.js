/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DATABASE SCHEMA - COMPLETE ACCOUNTING SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ACCOUNTING PERIOD RULES:
 * - Financial Year: April 1 to March 31 (India)
 * - Books prepared: Monthly, Quarterly, Annually
 * - Trial Balance: Prepared at end of each period
 * - Final Accounts: Prepared at year-end
 * 
 * BOOK CLOSING RULES:
 * - Cash Book: Daily closing, Monthly summary
 * - Bank Book: Daily closing, Monthly reconciliation
 * - Petty Cash Book: Weekly/Monthly closing
 * - Subsidiary Books: Monthly closing
 * - Ledger: Continuous, Balanced monthly
 * - Trial Balance: Monthly/Quarterly/Annually
 * - Trading Account: Annually (or quarterly for management)
 * - Profit & Loss: Annually (or quarterly for management)
 * - Balance Sheet: Annually (as on last day of financial year)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export class DatabaseSchema {
  static async initializeDatabase() {
    try {
      const db = await SQLite.openDatabase({
        name: 'MindStackAccounting.db',
        location: 'default',
      });

      await this.createTables(db);
      return { success: true, db };
    } catch (error) {
      console.error('Database initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  static async createTables(db) {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. COMPANY MASTER
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS company_master (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        phone TEXT,
        email TEXT,
        gstin TEXT,
        pan TEXT,
        financial_year_start TEXT DEFAULT '04-01',
        financial_year_end TEXT DEFAULT '03-31',
        currency TEXT DEFAULT 'INR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. ACCOUNTING PERIODS
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS accounting_periods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_name TEXT NOT NULL,
        period_type TEXT NOT NULL CHECK(period_type IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        financial_year TEXT NOT NULL,
        is_closed BOOLEAN DEFAULT 0,
        closed_by TEXT,
        closed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(start_date, end_date)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. CHART OF ACCOUNTS (MASTER)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_code TEXT NOT NULL UNIQUE,
        account_name TEXT NOT NULL,
        account_type TEXT NOT NULL CHECK(account_type IN ('ASSET', 'LIABILITY', 'CAPITAL', 'INCOME', 'EXPENSE')),
        account_group TEXT NOT NULL,
        parent_code TEXT,
        opening_balance REAL DEFAULT 0,
        opening_balance_type TEXT CHECK(opening_balance_type IN ('Dr', 'Cr')),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_code) REFERENCES chart_of_accounts(account_code)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. JOURNAL ENTRIES (MAIN BOOK OF ORIGINAL ENTRY)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journal_id TEXT NOT NULL UNIQUE,
        voucher_number TEXT NOT NULL UNIQUE,
        voucher_type TEXT NOT NULL CHECK(voucher_type IN ('JOURNAL', 'PAYMENT', 'RECEIPT', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE')),
        entry_date DATE NOT NULL,
        period_id INTEGER,
        narration TEXT,
        reference_number TEXT,
        total_debit REAL NOT NULL,
        total_credit REAL NOT NULL,
        is_posted BOOLEAN DEFAULT 0,
        posted_at DATETIME,
        is_reversed BOOLEAN DEFAULT 0,
        reversed_by TEXT,
        reversed_at DATETIME,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
        CHECK (total_debit = total_credit)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. JOURNAL ENTRY LINES (DETAILS)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS journal_entry_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        journal_id TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        account_code TEXT NOT NULL,
        account_name TEXT NOT NULL,
        debit_amount REAL DEFAULT 0,
        credit_amount REAL DEFAULT 0,
        ledger_folio TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (account_code) REFERENCES chart_of_accounts(account_code),
        CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 6. LEDGER (POSTED ENTRIES)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ledger_id TEXT NOT NULL UNIQUE,
        account_code TEXT NOT NULL,
        account_name TEXT NOT NULL,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        particulars TEXT NOT NULL,
        voucher_number TEXT NOT NULL,
        voucher_type TEXT NOT NULL,
        ledger_folio TEXT,
        debit_amount REAL DEFAULT 0,
        credit_amount REAL DEFAULT 0,
        running_balance REAL DEFAULT 0,
        balance_type TEXT CHECK(balance_type IN ('Dr', 'Cr')),
        journal_id TEXT NOT NULL,
        is_opening BOOLEAN DEFAULT 0,
        is_closing BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_code) REFERENCES chart_of_accounts(account_code),
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. CASH BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS cash_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        voucher_number TEXT NOT NULL,
        particulars TEXT NOT NULL,
        ledger_folio TEXT,
        receipt_amount REAL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        journal_id TEXT NOT NULL,
        is_opening BOOLEAN DEFAULT 0,
        is_closing BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 8. BANK BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS bank_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        voucher_number TEXT NOT NULL,
        particulars TEXT NOT NULL,
        cheque_number TEXT,
        ledger_folio TEXT,
        deposit_amount REAL DEFAULT 0,
        withdrawal_amount REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        journal_id TEXT NOT NULL,
        is_opening BOOLEAN DEFAULT 0,
        is_closing BOOLEAN DEFAULT 0,
        is_reconciled BOOLEAN DEFAULT 0,
        reconciled_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 9. PETTY CASH BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS petty_cash_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        voucher_number TEXT NOT NULL,
        particulars TEXT NOT NULL,
        ledger_folio TEXT,
        receipt_amount REAL DEFAULT 0,
        payment_amount REAL DEFAULT 0,
        expense_category TEXT,
        balance REAL DEFAULT 0,
        journal_id TEXT NOT NULL,
        is_opening BOOLEAN DEFAULT 0,
        is_closing BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 10. SALES BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS sales_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        invoice_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_code TEXT,
        particulars TEXT,
        ledger_folio TEXT,
        gross_amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        net_amount REAL NOT NULL,
        journal_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 11. PURCHASE BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS purchase_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        invoice_number TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        supplier_code TEXT,
        particulars TEXT,
        ledger_folio TEXT,
        gross_amount REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        net_amount REAL NOT NULL,
        journal_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 12. SALES RETURN BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS sales_return_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        credit_note_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_code TEXT,
        original_invoice TEXT,
        particulars TEXT,
        ledger_folio TEXT,
        return_amount REAL NOT NULL,
        journal_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 13. PURCHASE RETURN BOOK
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS purchase_return_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_date DATE NOT NULL,
        period_id INTEGER,
        debit_note_number TEXT NOT NULL UNIQUE,
        supplier_name TEXT NOT NULL,
        supplier_code TEXT,
        original_invoice TEXT,
        particulars TEXT,
        ledger_folio TEXT,
        return_amount REAL NOT NULL,
        journal_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (journal_id) REFERENCES journal_entries(journal_id),
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 14. TRIAL BALANCE (MONTHLY/QUARTERLY/ANNUAL)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS trial_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        account_code TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        opening_balance REAL DEFAULT 0,
        opening_balance_type TEXT CHECK(opening_balance_type IN ('Dr', 'Cr')),
        total_debit REAL DEFAULT 0,
        total_credit REAL DEFAULT 0,
        closing_balance REAL DEFAULT 0,
        closing_balance_type TEXT CHECK(closing_balance_type IN ('Dr', 'Cr')),
        is_balanced BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
        FOREIGN KEY (account_code) REFERENCES chart_of_accounts(account_code),
        UNIQUE(period_id, account_code)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 15. TRADING ACCOUNT (ANNUAL)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS trading_account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        opening_stock REAL DEFAULT 0,
        purchases REAL DEFAULT 0,
        purchase_returns REAL DEFAULT 0,
        direct_expenses REAL DEFAULT 0,
        sales REAL DEFAULT 0,
        sales_returns REAL DEFAULT 0,
        closing_stock REAL DEFAULT 0,
        gross_profit REAL DEFAULT 0,
        gross_loss REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
        UNIQUE(period_id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 16. PROFIT & LOSS ACCOUNT (ANNUAL)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS profit_loss_account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        gross_profit REAL DEFAULT 0,
        gross_loss REAL DEFAULT 0,
        indirect_incomes REAL DEFAULT 0,
        financial_incomes REAL DEFAULT 0,
        indirect_expenses REAL DEFAULT 0,
        financial_expenses REAL DEFAULT 0,
        net_profit REAL DEFAULT 0,
        net_loss REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
        UNIQUE(period_id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 17. BALANCE SHEET (ANNUAL - AS ON LAST DAY)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS balance_sheet (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        as_on_date DATE NOT NULL,
        fixed_assets REAL DEFAULT 0,
        current_assets REAL DEFAULT 0,
        investments REAL DEFAULT 0,
        other_assets REAL DEFAULT 0,
        total_assets REAL DEFAULT 0,
        capital REAL DEFAULT 0,
        reserves REAL DEFAULT 0,
        net_profit REAL DEFAULT 0,
        net_loss REAL DEFAULT 0,
        long_term_liabilities REAL DEFAULT 0,
        current_liabilities REAL DEFAULT 0,
        provisions REAL DEFAULT 0,
        total_liabilities REAL DEFAULT 0,
        is_balanced BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
        UNIQUE(period_id),
        CHECK (total_assets = total_liabilities)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 18. FINANCIAL RATIOS (CALCULATED)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS financial_ratios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        current_ratio REAL DEFAULT 0,
        quick_ratio REAL DEFAULT 0,
        debt_equity_ratio REAL DEFAULT 0,
        proprietary_ratio REAL DEFAULT 0,
        working_capital REAL DEFAULT 0,
        gross_profit_ratio REAL DEFAULT 0,
        net_profit_ratio REAL DEFAULT 0,
        operating_ratio REAL DEFAULT 0,
        return_on_assets REAL DEFAULT 0,
        return_on_equity REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id),
        UNIQUE(period_id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 19. PERIOD CLOSING LOG
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS period_closing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_id INTEGER NOT NULL,
        closing_type TEXT NOT NULL CHECK(closing_type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
        trial_balance_prepared BOOLEAN DEFAULT 0,
        trading_account_prepared BOOLEAN DEFAULT 0,
        profit_loss_prepared BOOLEAN DEFAULT 0,
        balance_sheet_prepared BOOLEAN DEFAULT 0,
        is_completed BOOLEAN DEFAULT 0,
        closed_by TEXT,
        closed_at DATETIME,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 20. PDF GENERATION LOG
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS pdf_generation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_type TEXT NOT NULL,
        report_name TEXT NOT NULL,
        period_id INTEGER,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        generated_by TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES accounting_periods(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // CREATE INDEXES FOR PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(entry_date)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_journal_period ON journal_entries(period_id)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account_code)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(entry_date)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_ledger_period ON ledger(period_id)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_trial_balance_period ON trial_balance(period_id)');

    console.log('✅ All database tables created successfully');
  }
}

export default DatabaseSchema;
