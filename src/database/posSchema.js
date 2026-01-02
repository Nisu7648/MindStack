/**
 * ═══════════════════════════════════════════════════════════════════════════
 * POS DATABASE SCHEMA - COMPLETE POS + INVENTORY SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MINDSTACK POS RULES:
 * - Double-entry accounting mandatory
 * - No negative stock allowed
 * - No editable history without owner PIN
 * - Every transaction affects: Ledger + Inventory + Cash/Bank
 * - Offline-first with auto-sync
 * - Crash recovery safe
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

export class POSSchema {
  static async createPOSTables(db) {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. PRODUCTS MASTER (STRICT STRUCTURE)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL UNIQUE,
        sku TEXT UNIQUE,
        barcode TEXT UNIQUE,
        unit TEXT NOT NULL CHECK(unit IN ('pcs', 'kg', 'litre', 'gram', 'meter', 'box', 'dozen')),
        unit_locked BOOLEAN DEFAULT 0,
        purchase_price REAL NOT NULL,
        selling_price REAL NOT NULL,
        mrp REAL,
        gst_percentage REAL DEFAULT 0,
        hsn_code TEXT,
        minimum_stock_level REAL DEFAULT 0,
        current_stock REAL DEFAULT 0,
        category TEXT,
        brand TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        CHECK (current_stock >= 0),
        CHECK (selling_price >= 0),
        CHECK (purchase_price >= 0)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. STOCK MOVEMENTS (AUDIT TRAIL)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL CHECK(movement_type IN ('SALE', 'PURCHASE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT', 'OPENING')),
        quantity REAL NOT NULL,
        previous_stock REAL NOT NULL,
        new_stock REAL NOT NULL,
        reference_type TEXT,
        reference_id TEXT,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. INVOICES (POS BILLS)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL UNIQUE,
        invoice_date DATE NOT NULL,
        invoice_time TIME NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        customer_gstin TEXT,
        subtotal REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        discount_percentage REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        total_tax REAL DEFAULT 0,
        round_off REAL DEFAULT 0,
        grand_total REAL NOT NULL,
        payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'SPLIT')),
        cash_amount REAL DEFAULT 0,
        upi_amount REAL DEFAULT 0,
        card_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'COMPLETED' CHECK(status IN ('DRAFT', 'COMPLETED', 'CANCELLED', 'RETURNED')),
        cancelled_at DATETIME,
        cancelled_by TEXT,
        cancel_reason TEXT,
        journal_id TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (grand_total >= 0)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. INVOICE ITEMS
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL NOT NULL,
        gst_percentage REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        CHECK (quantity > 0),
        CHECK (price >= 0)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 5. RETURNS
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT NOT NULL UNIQUE,
        original_invoice_id INTEGER NOT NULL,
        original_invoice_number TEXT NOT NULL,
        return_date DATE NOT NULL,
        return_time TIME NOT NULL,
        return_type TEXT NOT NULL CHECK(return_type IN ('FULL', 'PARTIAL')),
        total_return_amount REAL NOT NULL,
        refund_mode TEXT NOT NULL CHECK(refund_mode IN ('CASH', 'UPI', 'CARD', 'CREDIT_NOTE')),
        refund_amount REAL NOT NULL,
        reason TEXT,
        journal_id TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (original_invoice_id) REFERENCES invoices(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 6. RETURN ITEMS
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL,
        invoice_item_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        price REAL NOT NULL,
        return_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES returns(id),
        FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. PURCHASES (STOCK IN)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_number TEXT NOT NULL UNIQUE,
        purchase_date DATE NOT NULL,
        supplier_name TEXT NOT NULL,
        supplier_phone TEXT,
        supplier_gstin TEXT,
        invoice_number TEXT,
        subtotal REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        total_tax REAL DEFAULT 0,
        grand_total REAL NOT NULL,
        payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'CREDIT')),
        payment_status TEXT DEFAULT 'PAID' CHECK(payment_status IN ('PAID', 'PENDING', 'PARTIAL')),
        paid_amount REAL DEFAULT 0,
        journal_id TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 8. PURCHASE ITEMS
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchase_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL NOT NULL,
        gst_percentage REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 9. DAY CLOSING
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS day_closing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        closing_date DATE NOT NULL UNIQUE,
        opening_cash REAL DEFAULT 0,
        total_sales REAL DEFAULT 0,
        total_cash_sales REAL DEFAULT 0,
        total_upi_sales REAL DEFAULT 0,
        total_card_sales REAL DEFAULT 0,
        total_returns REAL DEFAULT 0,
        total_expenses REAL DEFAULT 0,
        expected_cash REAL NOT NULL,
        actual_cash REAL NOT NULL,
        cash_difference REAL NOT NULL,
        difference_reason TEXT,
        total_invoices INTEGER DEFAULT 0,
        total_returns_count INTEGER DEFAULT 0,
        closed_by TEXT NOT NULL,
        closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (actual_cash >= 0)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 10. EXPENSES
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_date DATE NOT NULL,
        expense_category TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL CHECK(payment_mode IN ('CASH', 'UPI', 'CARD', 'BANK')),
        description TEXT,
        receipt_number TEXT,
        journal_id TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (amount > 0)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 11. USERS (ROLES & ACCESS)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        pin TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('OWNER', 'CASHIER', 'MANAGER')),
        full_name TEXT NOT NULL,
        phone TEXT,
        is_active BOOLEAN DEFAULT 1,
        can_override_price BOOLEAN DEFAULT 0,
        can_cancel_bill BOOLEAN DEFAULT 0,
        can_edit_products BOOLEAN DEFAULT 0,
        can_view_reports BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 12. AUDIT LOG (COMPLETE TRAIL)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        user_id TEXT NOT NULL,
        user_role TEXT NOT NULL,
        ip_address TEXT,
        device_info TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 13. OFFLINE QUEUE (SYNC MANAGEMENT)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SYNCED', 'FAILED')),
        retry_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 14. BARCODE CACHE (QUICK LOOKUP)
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS barcode_cache (
        barcode TEXT PRIMARY KEY,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        selling_price REAL NOT NULL,
        gst_percentage REAL DEFAULT 0,
        last_scanned DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // 15. INVENTORY ALERTS
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS inventory_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('LOW_STOCK', 'OUT_OF_STOCK', 'DEAD_STOCK', 'EXPIRY_SOON')),
        current_stock REAL NOT NULL,
        minimum_stock REAL NOT NULL,
        alert_date DATE NOT NULL,
        is_resolved BOOLEAN DEFAULT 0,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // CREATE INDEXES FOR PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(return_date)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_day_closing_date ON day_closing(closing_date)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at)');
    await db.executeSql('CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status)');

    console.log('✅ All POS database tables created successfully');
  }
}

export default POSSchema;
