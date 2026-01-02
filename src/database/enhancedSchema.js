/**
 * ENHANCED DATABASE SCHEMA - ADVANCED FEATURES
 * 
 * New Tables Added:
 * - Bank connections & feeds
 * - Reconciliation data
 * - Employees & payroll
 * - Multi-currency transactions
 * - Expense management
 * - Approval workflows
 * - Exchange rates
 * - Forecasting data
 */

import SQLite from 'react-native-sqlite-storage';

export class EnhancedDatabaseSchema {
  /**
   * Create all enhanced tables
   */
  static async createEnhancedTables(db) {
    // ═══════════════════════════════════════════════════════════════════════
    // BANK FEEDS & RECONCILIATION
    // ═══════════════════════════════════════════════════════════════════════
    
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS bank_connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_id TEXT NOT NULL,
        account_number TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        encrypted_credentials TEXT NOT NULL,
        sync_interval TEXT DEFAULT 'HOURLY',
        is_active BOOLEAN DEFAULT 1,
        last_sync DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS bank_feed_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id INTEGER NOT NULL,
        transaction_id TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('DEBIT', 'CREDIT')),
        balance DECIMAL(15,2),
        category TEXT DEFAULT 'UNCATEGORIZED',
        reference TEXT,
        is_reconciled BOOLEAN DEFAULT 0,
        reconciled_with_entry_id INTEGER,
        reconciled_at DATETIME,
        reconciliation_notes TEXT,
        ai_confidence DECIMAL(3,2),
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (connection_id) REFERENCES bank_connections(id),
        UNIQUE(connection_id, transaction_id)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS reconciliation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        condition_value TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_value TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // EMPLOYEES & PAYROLL
    // ═══════════════════════════════════════════════════════════════════════

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_code TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        date_of_birth DATE,
        date_of_joining DATE NOT NULL,
        department TEXT,
        designation TEXT,
        employment_type TEXT NOT NULL,
        manager_id INTEGER,
        pan_number TEXT,
        aadhaar_number TEXT,
        bank_account_number TEXT,
        bank_name TEXT,
        bank_ifsc TEXT,
        uan_number TEXT,
        pf_number TEXT,
        esi_number TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES employees(id)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS salary_structures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        salary_type TEXT NOT NULL CHECK(salary_type IN ('FIXED', 'HOURLY', 'CONTRACT', 'COMMISSION')),
        payment_frequency TEXT NOT NULL CHECK(payment_frequency IN ('MONTHLY', 'BIWEEKLY', 'WEEKLY')),
        effective_from DATE NOT NULL,
        basic_salary DECIMAL(15,2) NOT NULL,
        hra DECIMAL(15,2) DEFAULT 0,
        special_allowance DECIMAL(15,2) DEFAULT 0,
        transport_allowance DECIMAL(15,2) DEFAULT 0,
        medical_allowance DECIMAL(15,2) DEFAULT 0,
        other_allowances DECIMAL(15,2) DEFAULT 0,
        pf_contribution DECIMAL(15,2) DEFAULT 0,
        esi_contribution DECIMAL(15,2) DEFAULT 0,
        professional_tax DECIMAL(15,2) DEFAULT 0,
        tds_deduction DECIMAL(15,2) DEFAULT 0,
        other_deductions DECIMAL(15,2) DEFAULT 0,
        gross_salary DECIMAL(15,2) NOT NULL,
        net_salary DECIMAL(15,2) NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        working_days INTEGER NOT NULL,
        attended_days INTEGER NOT NULL,
        basic_salary DECIMAL(15,2) NOT NULL,
        hra DECIMAL(15,2) DEFAULT 0,
        special_allowance DECIMAL(15,2) DEFAULT 0,
        transport_allowance DECIMAL(15,2) DEFAULT 0,
        medical_allowance DECIMAL(15,2) DEFAULT 0,
        other_allowances DECIMAL(15,2) DEFAULT 0,
        gross_earnings DECIMAL(15,2) NOT NULL,
        pf_deduction DECIMAL(15,2) DEFAULT 0,
        esi_deduction DECIMAL(15,2) DEFAULT 0,
        professional_tax DECIMAL(15,2) DEFAULT 0,
        tds_deduction DECIMAL(15,2) DEFAULT 0,
        other_deductions DECIMAL(15,2) DEFAULT 0,
        total_deductions DECIMAL(15,2) NOT NULL,
        net_salary DECIMAL(15,2) NOT NULL,
        status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'PROCESSED', 'PAID')),
        processed_at DATETIME,
        payment_method TEXT,
        payment_reference TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        UNIQUE(employee_id, month, year)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        attendance_date DATE NOT NULL,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY')),
        check_in_time TIME,
        check_out_time TIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        UNIQUE(employee_id, attendance_date)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // MULTI-CURRENCY
    // ═══════════════════════════════════════════════════════════════════════

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency_code TEXT NOT NULL,
        rate DECIMAL(15,6) NOT NULL,
        base_currency TEXT NOT NULL,
        rate_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(currency_code, base_currency, rate_date)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS multi_currency_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT NOT NULL,
        base_currency_amount DECIMAL(15,2) NOT NULL,
        exchange_rate DECIMAL(15,6) NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('DEBIT', 'CREDIT')),
        account_id INTEGER,
        reference_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // EXPENSE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        extracted_data TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES employees(id)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        expense_date DATE NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency TEXT DEFAULT 'INR',
        receipt_id INTEGER,
        merchant_name TEXT,
        payment_method TEXT,
        project_id INTEGER,
        billable BOOLEAN DEFAULT 0,
        status TEXT DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED')),
        submitted_at DATETIME,
        approved_at DATETIME,
        reimbursed_at DATETIME,
        rejection_reason TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (receipt_id) REFERENCES receipts(id)
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS expense_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        policy_name TEXT NOT NULL,
        category TEXT NOT NULL,
        max_amount DECIMAL(15,2),
        receipt_required BOOLEAN DEFAULT 1,
        approval_required BOOLEAN DEFAULT 1,
        approval_threshold DECIMAL(15,2),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS expense_approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_id INTEGER NOT NULL,
        approver_id INTEGER NOT NULL,
        approval_level INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
        approved_at DATETIME,
        rejected_at DATETIME,
        comments TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (expense_id) REFERENCES expenses(id),
        FOREIGN KEY (approver_id) REFERENCES employees(id)
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // FORECASTING & ANALYTICS
    // ═══════════════════════════════════════════════════════════════════════

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forecast_month DATE NOT NULL,
        predicted_inflow DECIMAL(15,2) NOT NULL,
        predicted_outflow DECIMAL(15,2) NOT NULL,
        net_flow DECIMAL(15,2) NOT NULL,
        projected_balance DECIMAL(15,2) NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS revenue_forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forecast_month DATE NOT NULL,
        predicted_revenue DECIMAL(15,2) NOT NULL,
        growth_rate DECIMAL(5,2),
        seasonal_factor DECIMAL(5,2),
        confidence DECIMAL(3,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_name TEXT NOT NULL,
        scenario_type TEXT NOT NULL,
        revenue_change DECIMAL(5,2),
        expense_change DECIMAL(5,2),
        additional_costs DECIMAL(15,2),
        projected_revenue DECIMAL(15,2),
        projected_expenses DECIMAL(15,2),
        projected_profit DECIMAL(15,2),
        profit_margin DECIMAL(5,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // INDEXES FOR PERFORMANCE
    // ═══════════════════════════════════════════════════════════════════════

    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_bank_feed_txn_date ON bank_feed_transactions(transaction_date)`);
    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_bank_feed_reconciled ON bank_feed_transactions(is_reconciled)`);
    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_employee_active ON employees(is_active)`);
    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON payroll_records(month, year)`);
    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_expense_status ON expenses(status)`);
    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_expense_date ON expenses(expense_date)`);
    await db.executeSql(`CREATE INDEX IF NOT EXISTS idx_exchange_rate_date ON exchange_rates(rate_date)`);

    console.log('✅ Enhanced database tables created successfully');
  }

  /**
   * Initialize enhanced database
   */
  static async initializeEnhancedDatabase() {
    try {
      const db = await SQLite.openDatabase({
        name: 'MindStackAccounting.db',
        location: 'default',
      });

      await this.createEnhancedTables(db);

      // Insert default data
      await this.insertDefaultData(db);

      return { success: true, db };
    } catch (error) {
      console.error('Enhanced database initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Insert default data
   */
  static async insertDefaultData(db) {
    // Default expense policies
    const defaultPolicies = [
      { name: 'Travel Policy', category: 'TRAVEL', maxAmount: 50000, receiptRequired: 1, approvalRequired: 1, approvalThreshold: 10000 },
      { name: 'Meals Policy', category: 'MEALS', maxAmount: 2000, receiptRequired: 1, approvalRequired: 0, approvalThreshold: 1000 },
      { name: 'Fuel Policy', category: 'FUEL', maxAmount: 5000, receiptRequired: 1, approvalRequired: 0, approvalThreshold: 3000 }
    ];

    for (const policy of defaultPolicies) {
      try {
        await db.executeSql(
          `INSERT OR IGNORE INTO expense_policies (
            policy_name, category, max_amount, receipt_required, 
            approval_required, approval_threshold, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [
            policy.name,
            policy.category,
            policy.maxAmount,
            policy.receiptRequired,
            policy.approvalRequired,
            policy.approvalThreshold
          ]
        );
      } catch (error) {
        console.log('Policy already exists:', policy.name);
      }
    }

    // Default reconciliation rules
    const defaultRules = [
      { name: 'Auto-categorize Salary', conditionType: 'DESCRIPTION_CONTAINS', conditionValue: 'salary', actionType: 'AUTO_CATEGORIZE', actionValue: 'PAYROLL' },
      { name: 'Auto-categorize Rent', conditionType: 'DESCRIPTION_CONTAINS', conditionValue: 'rent', actionType: 'AUTO_CATEGORIZE', actionValue: 'RENT' }
    ];

    for (const rule of defaultRules) {
      try {
        await db.executeSql(
          `INSERT OR IGNORE INTO reconciliation_rules (
            rule_name, condition_type, condition_value, action_type, action_value, is_active
          ) VALUES (?, ?, ?, ?, ?, 1)`,
          [rule.name, rule.conditionType, rule.conditionValue, rule.actionType, rule.actionValue]
        );
      } catch (error) {
        console.log('Rule already exists:', rule.name);
      }
    }

    console.log('✅ Default data inserted successfully');
  }

  /**
   * Migrate existing database
   */
  static async migrateDatabase() {
    try {
      const db = await SQLite.openDatabase({
        name: 'MindStackAccounting.db',
        location: 'default',
      });

      // Check if migration is needed
      const [result] = await db.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='bank_connections'"
      );

      if (result.rows.length === 0) {
        console.log('🔄 Starting database migration...');
        await this.createEnhancedTables(db);
        await this.insertDefaultData(db);
        console.log('✅ Database migration completed');
      } else {
        console.log('✅ Database already migrated');
      }

      return { success: true };
    } catch (error) {
      console.error('Database migration error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default EnhancedDatabaseSchema;
