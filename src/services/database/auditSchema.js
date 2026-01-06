/**
 * AUDIT DATABASE SCHEMA
 * Tables for audit trail and compliance
 */

export const AUDIT_TABLES = `
-- Audit Trail Table
CREATE TABLE IF NOT EXISTS audit_trail (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  
  -- User info
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  session_id TEXT,
  
  -- Event details
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  
  -- Action details
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Data changes
  old_value TEXT,
  new_value TEXT,
  
  -- Metadata
  ip_address TEXT,
  device_info TEXT,
  
  -- Timestamp
  timestamp TEXT NOT NULL,
  
  -- Compliance flags
  is_financial INTEGER DEFAULT 0,
  is_critical INTEGER DEFAULT 0,
  requires_approval INTEGER DEFAULT 0,
  
  -- Additional data
  metadata TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Critical Audit Trail (Separate table for critical events)
CREATE TABLE IF NOT EXISTS critical_audit_trail (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  session_id TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  device_info TEXT,
  timestamp TEXT NOT NULL,
  is_financial INTEGER DEFAULT 0,
  is_critical INTEGER DEFAULT 1,
  requires_approval INTEGER DEFAULT 0,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Day Close Table
CREATE TABLE IF NOT EXISTS day_close (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  opening_cash REAL NOT NULL,
  cash_sales REAL NOT NULL,
  expected_cash REAL NOT NULL,
  physical_cash REAL NOT NULL,
  difference REAL NOT NULL,
  closed_at TEXT NOT NULL,
  closed_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Accounting Periods Table
CREATE TABLE IF NOT EXISTS accounting_periods (
  id TEXT PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_closed INTEGER DEFAULT 0,
  closed_date TEXT,
  closed_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Refunds Table
CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_mode TEXT NOT NULL,
  refund_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  amount REAL NOT NULL,
  return_date TEXT NOT NULL,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  FOREIGN KEY (product_id) REFERENCES inventory(id)
);

-- Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  purchase_no TEXT NOT NULL UNIQUE,
  purchase_date TEXT NOT NULL,
  supplier_name TEXT,
  total_amount REAL NOT NULL,
  payment_mode TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  rate REAL NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id),
  FOREIGN KEY (product_id) REFERENCES inventory(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_severity ON audit_trail(severity);
CREATE INDEX IF NOT EXISTS idx_audit_trail_financial ON audit_trail(is_financial);

CREATE INDEX IF NOT EXISTS idx_critical_audit_timestamp ON critical_audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_day_close_date ON day_close(date);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_dates ON accounting_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_refunds_invoice ON refunds(invoice_id);
CREATE INDEX IF NOT EXISTS idx_returns_invoice ON returns(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
`;

/**
 * Initialize audit tables
 */
export const initializeAuditTables = async (db) => {
  try {
    await db.executeSql(AUDIT_TABLES);
    console.log('Audit tables initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Initialize audit tables error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  AUDIT_TABLES,
  initializeAuditTables
};
