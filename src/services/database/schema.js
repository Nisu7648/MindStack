/**
 * SQLite Database Schema for MindStack
 * Implements double-entry bookkeeping with GST, TDS, and inventory management
 */

import { openDatabase, enablePromise } from 'react-native-sqlite-storage';

enablePromise(true);

export const DB_NAME = 'mindstack.db';
export const DB_VERSION = 1;

/**
 * Initialize database with all required tables
 */
export const initDatabase = async () => {
  try {
    const db = await openDatabase({ name: DB_NAME, location: 'default' });
    
    // Execute all schema creation queries
    await createAccountsTable(db);
    await createLedgerTable(db);
    await createTransactionsTable(db);
    await createInventoryTables(db);
    await createGSTTables(db);
    await createTDSTables(db);
    await createBankTables(db);
    await createInvoiceTables(db);
    await createVersionTable(db);
    
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

/**
 * Chart of Accounts Table
 */
const createAccountsTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
      sub_type TEXT,
      parent_id INTEGER,
      balance DECIMAL(15,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES accounts(id)
    );
  `;
  await db.executeSql(query);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);');
};

/**
 * Ledger Table (Double Entry)
 */
const createLedgerTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      date DATE NOT NULL,
      account_id INTEGER NOT NULL,
      description TEXT,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      balance DECIMAL(15,2) DEFAULT 0.00,
      reference_type TEXT,
      reference_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );
  `;
  await db.executeSql(query);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account_id);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(date);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger(transaction_id);');
};

/**
 * Transactions Table
 */
const createTransactionsTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      txn_date DATE NOT NULL,
      txn_type TEXT NOT NULL,
      reference TEXT,
      description TEXT NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL,
      status TEXT DEFAULT 'posted' CHECK(status IN ('draft', 'posted', 'void')),
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.executeSql(query);
  
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(txn_date);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(txn_type);');
};

/**
 * Inventory Tables
 */
const createInventoryTables = async (db) => {
  // Main inventory table
  const inventoryQuery = `
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      hsn_code TEXT,
      unit TEXT DEFAULT 'NOS',
      qty INTEGER DEFAULT 0,
      reorder_level INTEGER DEFAULT 0,
      cost_method TEXT DEFAULT 'FIFO' CHECK(cost_method IN ('FIFO', 'WAC')),
      avg_cost DECIMAL(15,2) DEFAULT 0.00,
      total_value DECIMAL(15,2) DEFAULT 0.00,
      gst_rate DECIMAL(5,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.executeSql(inventoryQuery);
  
  // Inventory layers for FIFO
  const layersQuery = `
    CREATE TABLE IF NOT EXISTS inventory_layers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      date DATE NOT NULL,
      qty INTEGER NOT NULL,
      unit_cost DECIMAL(15,2) NOT NULL,
      remaining_qty INTEGER NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory(id)
    );
  `;
  await db.executeSql(layersQuery);
  
  // Inventory movements
  const movementsQuery = `
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('IN', 'OUT', 'ADJUST')),
      date DATE NOT NULL,
      qty INTEGER NOT NULL,
      unit_cost DECIMAL(15,2),
      total_cost DECIMAL(15,2),
      balance_qty INTEGER,
      balance_value DECIMAL(15,2),
      reference_type TEXT,
      reference_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES inventory(id)
    );
  `;
  await db.executeSql(movementsQuery);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory(item_code);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_inventory_hsn ON inventory(hsn_code);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_layers_item ON inventory_layers(item_id);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_movements_item ON inventory_movements(item_id);');
};

/**
 * GST Tables
 */
const createGSTTables = async (db) => {
  // GST configuration
  const gstConfigQuery = `
    CREATE TABLE IF NOT EXISTS gst_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gstin TEXT UNIQUE NOT NULL,
      legal_name TEXT NOT NULL,
      trade_name TEXT,
      address TEXT NOT NULL,
      state_code TEXT NOT NULL,
      registration_date DATE,
      gst_type TEXT CHECK(gst_type IN ('REGULAR', 'COMPOSITION', 'CASUAL', 'SEZ')),
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.executeSql(gstConfigQuery);
  
  // GST transactions
  const gstTransactionsQuery = `
    CREATE TABLE IF NOT EXISTS gst_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      transaction_date DATE NOT NULL,
      transaction_type TEXT NOT NULL CHECK(transaction_type IN ('SALE', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE')),
      supply_type TEXT CHECK(supply_type IN ('B2B', 'B2C', 'EXPORT', 'IMPORT')),
      party_gstin TEXT,
      party_name TEXT,
      place_of_supply TEXT NOT NULL,
      taxable_value DECIMAL(15,2) NOT NULL,
      cgst_rate DECIMAL(5,2) DEFAULT 0.00,
      cgst_amount DECIMAL(15,2) DEFAULT 0.00,
      sgst_rate DECIMAL(5,2) DEFAULT 0.00,
      sgst_amount DECIMAL(15,2) DEFAULT 0.00,
      igst_rate DECIMAL(5,2) DEFAULT 0.00,
      igst_amount DECIMAL(15,2) DEFAULT 0.00,
      cess_rate DECIMAL(5,2) DEFAULT 0.00,
      cess_amount DECIMAL(15,2) DEFAULT 0.00,
      total_amount DECIMAL(15,2) NOT NULL,
      reverse_charge BOOLEAN DEFAULT 0,
      itc_eligible BOOLEAN DEFAULT 1,
      return_period TEXT,
      filed_in_gstr BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
  `;
  await db.executeSql(gstTransactionsQuery);
  
  // ITC ledger
  const itcLedgerQuery = `
    CREATE TABLE IF NOT EXISTS itc_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gst_transaction_id INTEGER NOT NULL,
      date DATE NOT NULL,
      cgst_itc DECIMAL(15,2) DEFAULT 0.00,
      sgst_itc DECIMAL(15,2) DEFAULT 0.00,
      igst_itc DECIMAL(15,2) DEFAULT 0.00,
      cess_itc DECIMAL(15,2) DEFAULT 0.00,
      utilized BOOLEAN DEFAULT 0,
      utilized_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gst_transaction_id) REFERENCES gst_transactions(id)
    );
  `;
  await db.executeSql(itcLedgerQuery);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_gst_txn_date ON gst_transactions(transaction_date);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_gst_txn_type ON gst_transactions(transaction_type);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_gst_return_period ON gst_transactions(return_period);');
};

/**
 * TDS Tables
 */
const createTDSTables = async (db) => {
  // TDS transactions
  const tdsTransactionsQuery = `
    CREATE TABLE IF NOT EXISTS tds_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      deduction_date DATE NOT NULL,
      section TEXT NOT NULL,
      party_pan TEXT,
      party_name TEXT NOT NULL,
      gross_amount DECIMAL(15,2) NOT NULL,
      tds_rate DECIMAL(5,2) NOT NULL,
      tds_amount DECIMAL(15,2) NOT NULL,
      net_payable DECIMAL(15,2) NOT NULL,
      payment_date DATE,
      challan_no TEXT,
      challan_date DATE,
      quarter TEXT,
      financial_year TEXT,
      filed_in_return BOOLEAN DEFAULT 0,
      certificate_issued BOOLEAN DEFAULT 0,
      certificate_no TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );
  `;
  await db.executeSql(tdsTransactionsQuery);
  
  // TDS rates master
  const tdsRatesQuery = `
    CREATE TABLE IF NOT EXISTS tds_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT UNIQUE NOT NULL,
      description TEXT,
      rate_individual DECIMAL(5,2),
      rate_others DECIMAL(5,2),
      threshold_single DECIMAL(15,2),
      threshold_aggregate DECIMAL(15,2),
      effective_from DATE,
      effective_to DATE,
      is_active BOOLEAN DEFAULT 1
    );
  `;
  await db.executeSql(tdsRatesQuery);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_tds_date ON tds_transactions(deduction_date);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_tds_section ON tds_transactions(section);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_tds_quarter ON tds_transactions(quarter);');
};

/**
 * Bank Tables
 */
const createBankTables = async (db) => {
  // Bank accounts
  const bankAccountsQuery = `
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_name TEXT NOT NULL,
      account_no TEXT UNIQUE NOT NULL,
      ifsc_code TEXT,
      bank_name TEXT NOT NULL,
      branch TEXT,
      account_type TEXT CHECK(account_type IN ('SAVINGS', 'CURRENT', 'OD', 'CC')),
      opening_balance DECIMAL(15,2) DEFAULT 0.00,
      current_balance DECIMAL(15,2) DEFAULT 0.00,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.executeSql(bankAccountsQuery);
  
  // Bank statements
  const bankStatementsQuery = `
    CREATE TABLE IF NOT EXISTS bank_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_account_id INTEGER NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      cheque_no TEXT,
      debit DECIMAL(15,2) DEFAULT 0.00,
      credit DECIMAL(15,2) DEFAULT 0.00,
      balance DECIMAL(15,2),
      reconciled BOOLEAN DEFAULT 0,
      reconciled_date DATE,
      ledger_id INTEGER,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (ledger_id) REFERENCES ledger(id)
    );
  `;
  await db.executeSql(bankStatementsQuery);
  
  // Bank reconciliation
  const reconciliationQuery = `
    CREATE TABLE IF NOT EXISTS bank_reconciliation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_account_id INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      cash_book_balance DECIMAL(15,2) NOT NULL,
      bank_statement_balance DECIMAL(15,2) NOT NULL,
      adjusted_balance DECIMAL(15,2) NOT NULL,
      difference DECIMAL(15,2) NOT NULL,
      reconciled BOOLEAN DEFAULT 0,
      reconciled_by TEXT,
      reconciled_at DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    );
  `;
  await db.executeSql(reconciliationQuery);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_bank_stmt_date ON bank_statements(date);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_bank_stmt_reconciled ON bank_statements(reconciled);');
};

/**
 * Invoice Tables
 */
const createInvoiceTables = async (db) => {
  // Invoices
  const invoicesQuery = `
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      invoice_date DATE NOT NULL,
      invoice_type TEXT CHECK(invoice_type IN ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'CREDIT_NOTE', 'DEBIT_NOTE')),
      party_id INTEGER,
      party_name TEXT NOT NULL,
      party_gstin TEXT,
      party_address TEXT,
      place_of_supply TEXT,
      subtotal DECIMAL(15,2) NOT NULL,
      discount DECIMAL(15,2) DEFAULT 0.00,
      taxable_value DECIMAL(15,2) NOT NULL,
      cgst_amount DECIMAL(15,2) DEFAULT 0.00,
      sgst_amount DECIMAL(15,2) DEFAULT 0.00,
      igst_amount DECIMAL(15,2) DEFAULT 0.00,
      cess_amount DECIMAL(15,2) DEFAULT 0.00,
      round_off DECIMAL(15,2) DEFAULT 0.00,
      total_amount DECIMAL(15,2) NOT NULL,
      payment_status TEXT DEFAULT 'UNPAID' CHECK(payment_status IN ('PAID', 'UNPAID', 'PARTIAL')),
      payment_date DATE,
      due_date DATE,
      notes TEXT,
      terms TEXT,
      qr_code TEXT,
      irn TEXT,
      ack_no TEXT,
      ack_date DATE,
      e_invoice_status TEXT,
      image_path TEXT,
      ocr_processed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.executeSql(invoicesQuery);
  
  // Invoice items
  const invoiceItemsQuery = `
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      item_id INTEGER,
      sl_no INTEGER NOT NULL,
      description TEXT NOT NULL,
      hsn_code TEXT,
      sac_code TEXT,
      qty DECIMAL(10,2) NOT NULL,
      unit TEXT DEFAULT 'NOS',
      rate DECIMAL(15,2) NOT NULL,
      discount DECIMAL(15,2) DEFAULT 0.00,
      taxable_value DECIMAL(15,2) NOT NULL,
      gst_rate DECIMAL(5,2) NOT NULL,
      cgst_amount DECIMAL(15,2) DEFAULT 0.00,
      sgst_amount DECIMAL(15,2) DEFAULT 0.00,
      igst_amount DECIMAL(15,2) DEFAULT 0.00,
      cess_amount DECIMAL(15,2) DEFAULT 0.00,
      total_amount DECIMAL(15,2) NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (item_id) REFERENCES inventory(id)
    );
  `;
  await db.executeSql(invoiceItemsQuery);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_invoices_no ON invoices(invoice_no);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);');
};

/**
 * Version Table for Schema Migrations
 */
const createVersionTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await db.executeSql(query);
  
  // Insert initial version
  await db.executeSql('INSERT OR IGNORE INTO schema_version (version) VALUES (?)', [DB_VERSION]);
};

/**
 * Get database instance
 */
export const getDatabase = async () => {
  return await openDatabase({ name: DB_NAME, location: 'default' });
};

/**
 * Close database connection
 */
export const closeDatabase = async (db) => {
  if (db) {
    await db.close();
    console.log('Database closed');
  }
};

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  DB_NAME,
  DB_VERSION
};
