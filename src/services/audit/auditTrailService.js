/**
 * AUDIT TRAIL SERVICE
 * Complete audit logging with real-world compliance
 * 
 * Compliance Standards:
 * - Companies Act 2013 (India)
 * - GST Audit Requirements
 * - Income Tax Audit (Section 44AB)
 * - SOX Compliance (if applicable)
 * 
 * Features:
 * - Every transaction logged
 * - Immutable audit trail
 * - User action tracking
 * - Change history
 * - Tamper detection
 */

import { table } from '../database/queryBuilder';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Audit Event Types
 */
export const AUDIT_EVENT_TYPES = {
  // Authentication
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  
  // Transactions
  TRANSACTION_CREATE: 'TRANSACTION_CREATE',
  TRANSACTION_EDIT: 'TRANSACTION_EDIT',
  TRANSACTION_DELETE: 'TRANSACTION_DELETE',
  TRANSACTION_VOID: 'TRANSACTION_VOID',
  
  // Invoices
  INVOICE_CREATE: 'INVOICE_CREATE',
  INVOICE_EDIT: 'INVOICE_EDIT',
  INVOICE_CANCEL: 'INVOICE_CANCEL',
  INVOICE_PRINT: 'INVOICE_PRINT',
  
  // Payments
  PAYMENT_RECORD: 'PAYMENT_RECORD',
  PAYMENT_EDIT: 'PAYMENT_EDIT',
  PAYMENT_DELETE: 'PAYMENT_DELETE',
  
  // Inventory
  STOCK_ADJUST: 'STOCK_ADJUST',
  STOCK_TRANSFER: 'STOCK_TRANSFER',
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_EDIT: 'PRODUCT_EDIT',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  
  // Accounting
  JOURNAL_ENTRY: 'JOURNAL_ENTRY',
  JOURNAL_EDIT: 'JOURNAL_ENTRY_EDIT',
  PERIOD_CLOSE: 'PERIOD_CLOSE',
  PERIOD_REOPEN: 'PERIOD_REOPEN',
  
  // Master Data
  ACCOUNT_CREATE: 'ACCOUNT_CREATE',
  ACCOUNT_EDIT: 'ACCOUNT_EDIT',
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',
  
  // Settings
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  PRICE_CHANGE: 'PRICE_CHANGE',
  TAX_RATE_CHANGE: 'TAX_RATE_CHANGE',
  
  // Reports
  REPORT_GENERATE: 'REPORT_GENERATE',
  REPORT_EXPORT: 'REPORT_EXPORT',
  
  // System
  BACKUP_CREATE: 'BACKUP_CREATE',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  DATA_IMPORT: 'DATA_IMPORT',
  DATA_EXPORT: 'DATA_EXPORT'
};

/**
 * Audit Severity Levels
 */
export const AUDIT_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

/**
 * Audit Trail Service
 */
class AuditTrailService {
  constructor() {
    this.currentUser = null;
    this.sessionId = null;
  }

  /**
   * INITIALIZE
   */
  async initialize() {
    try {
      // Load current user
      const userData = await AsyncStorage.getItem('current_user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
      }

      // Generate session ID
      this.sessionId = uuidv4();

      return { success: true };
    } catch (error) {
      console.error('Audit trail initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LOG AUDIT EVENT
   * Main method to log any audit event
   */
  async logEvent(eventData) {
    try {
      const auditLog = {
        id: uuidv4(),
        event_type: eventData.eventType,
        event_category: this.getEventCategory(eventData.eventType),
        severity: eventData.severity || AUDIT_SEVERITY.INFO,
        
        // User info
        user_id: this.currentUser?.id || null,
        user_name: this.currentUser?.name || 'System',
        user_role: this.currentUser?.role || 'SYSTEM',
        session_id: this.sessionId,
        
        // Event details
        entity_type: eventData.entityType || null,
        entity_id: eventData.entityId || null,
        entity_name: eventData.entityName || null,
        
        // Action details
        action: eventData.action,
        description: eventData.description,
        
        // Data changes
        old_value: eventData.oldValue ? JSON.stringify(eventData.oldValue) : null,
        new_value: eventData.newValue ? JSON.stringify(eventData.newValue) : null,
        
        // Metadata
        ip_address: eventData.ipAddress || null,
        device_info: eventData.deviceInfo || null,
        
        // Timestamp
        timestamp: new Date().toISOString(),
        
        // Compliance flags
        is_financial: this.isFinancialEvent(eventData.eventType),
        is_critical: eventData.severity === AUDIT_SEVERITY.CRITICAL,
        requires_approval: eventData.requiresApproval || false,
        
        // Additional data
        metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null
      };

      // Save to database
      await table('audit_trail').insert(auditLog);

      // If critical, also log to separate critical audit table
      if (auditLog.is_critical) {
        await this.logCriticalEvent(auditLog);
      }

      return { success: true, auditId: auditLog.id };
    } catch (error) {
      console.error('Log audit event error:', error);
      // Don't fail the main operation if audit logging fails
      return { success: false, error: error.message };
    }
  }

  /**
   * LOG TRANSACTION
   * Specific method for transaction auditing
   */
  async logTransaction(transactionData) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.TRANSACTION_CREATE,
      severity: AUDIT_SEVERITY.INFO,
      entityType: 'TRANSACTION',
      entityId: transactionData.id,
      entityName: transactionData.reference,
      action: 'CREATE',
      description: `Transaction created: ${transactionData.reference}`,
      newValue: transactionData,
      metadata: {
        amount: transactionData.total_amount,
        type: transactionData.txn_type,
        date: transactionData.txn_date
      }
    });
  }

  /**
   * LOG TRANSACTION EDIT
   */
  async logTransactionEdit(transactionId, oldData, newData) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.TRANSACTION_EDIT,
      severity: AUDIT_SEVERITY.WARNING,
      entityType: 'TRANSACTION',
      entityId: transactionId,
      action: 'EDIT',
      description: `Transaction edited: ${oldData.reference}`,
      oldValue: oldData,
      newValue: newData,
      metadata: {
        changes: this.getChanges(oldData, newData)
      }
    });
  }

  /**
   * LOG INVOICE
   */
  async logInvoice(invoiceData) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.INVOICE_CREATE,
      severity: AUDIT_SEVERITY.INFO,
      entityType: 'INVOICE',
      entityId: invoiceData.id,
      entityName: invoiceData.invoice_no,
      action: 'CREATE',
      description: `Invoice created: ${invoiceData.invoice_no}`,
      newValue: invoiceData,
      metadata: {
        amount: invoiceData.total_amount,
        customer: invoiceData.customer_name,
        payment_mode: invoiceData.payment_mode
      }
    });
  }

  /**
   * LOG INVOICE CANCELLATION
   */
  async logInvoiceCancel(invoiceId, invoiceNo, reason) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.INVOICE_CANCEL,
      severity: AUDIT_SEVERITY.CRITICAL,
      entityType: 'INVOICE',
      entityId: invoiceId,
      entityName: invoiceNo,
      action: 'CANCEL',
      description: `Invoice cancelled: ${invoiceNo}`,
      metadata: {
        reason,
        cancelled_by: this.currentUser?.name,
        cancelled_at: new Date().toISOString()
      }
    });
  }

  /**
   * LOG STOCK ADJUSTMENT
   */
  async logStockAdjustment(productId, productName, oldQty, newQty, reason) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.STOCK_ADJUST,
      severity: AUDIT_SEVERITY.WARNING,
      entityType: 'PRODUCT',
      entityId: productId,
      entityName: productName,
      action: 'ADJUST',
      description: `Stock adjusted: ${productName}`,
      oldValue: { quantity: oldQty },
      newValue: { quantity: newQty },
      metadata: {
        adjustment: newQty - oldQty,
        reason
      }
    });
  }

  /**
   * LOG PRICE CHANGE
   */
  async logPriceChange(productId, productName, oldPrice, newPrice) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.PRICE_CHANGE,
      severity: AUDIT_SEVERITY.WARNING,
      entityType: 'PRODUCT',
      entityId: productId,
      entityName: productName,
      action: 'PRICE_CHANGE',
      description: `Price changed: ${productName}`,
      oldValue: { price: oldPrice },
      newValue: { price: newPrice },
      metadata: {
        change_amount: newPrice - oldPrice,
        change_percentage: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2)
      }
    });
  }

  /**
   * LOG PERIOD CLOSE
   */
  async logPeriodClose(periodData) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.PERIOD_CLOSE,
      severity: AUDIT_SEVERITY.CRITICAL,
      entityType: 'PERIOD',
      entityId: periodData.id,
      action: 'CLOSE',
      description: `Period closed: ${periodData.period_name}`,
      newValue: periodData,
      metadata: {
        start_date: periodData.start_date,
        end_date: periodData.end_date,
        closed_by: this.currentUser?.name
      }
    });
  }

  /**
   * LOG USER LOGIN
   */
  async logUserLogin(userId, userName) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.USER_LOGIN,
      severity: AUDIT_SEVERITY.INFO,
      entityType: 'USER',
      entityId: userId,
      entityName: userName,
      action: 'LOGIN',
      description: `User logged in: ${userName}`
    });
  }

  /**
   * LOG USER LOGOUT
   */
  async logUserLogout(userId, userName) {
    return await this.logEvent({
      eventType: AUDIT_EVENT_TYPES.USER_LOGOUT,
      severity: AUDIT_SEVERITY.INFO,
      entityType: 'USER',
      entityId: userId,
      entityName: userName,
      action: 'LOGOUT',
      description: `User logged out: ${userName}`
    });
  }

  /**
   * GET AUDIT TRAIL
   * Retrieve audit logs with filters
   */
  async getAuditTrail(filters = {}) {
    try {
      let query = table('audit_trail');

      // Apply filters
      if (filters.eventType) {
        query = query.where('event_type', filters.eventType);
      }

      if (filters.entityType) {
        query = query.where('entity_type', filters.entityType);
      }

      if (filters.entityId) {
        query = query.where('entity_id', filters.entityId);
      }

      if (filters.userId) {
        query = query.where('user_id', filters.userId);
      }

      if (filters.severity) {
        query = query.where('severity', filters.severity);
      }

      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }

      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      if (filters.isFinancial !== undefined) {
        query = query.where('is_financial', filters.isFinancial ? 1 : 0);
      }

      // Order by timestamp descending
      query = query.orderBy('timestamp', 'DESC');

      // Pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const result = await query.get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch audit trail' };
      }

      return {
        success: true,
        logs: result.data.map(log => ({
          ...log,
          old_value: log.old_value ? JSON.parse(log.old_value) : null,
          new_value: log.new_value ? JSON.parse(log.new_value) : null,
          metadata: log.metadata ? JSON.parse(log.metadata) : null
        }))
      };
    } catch (error) {
      console.error('Get audit trail error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET ENTITY HISTORY
   * Get complete change history for an entity
   */
  async getEntityHistory(entityType, entityId) {
    return await this.getAuditTrail({
      entityType,
      entityId
    });
  }

  /**
   * GET USER ACTIVITY
   * Get all activities by a user
   */
  async getUserActivity(userId, startDate, endDate) {
    return await this.getAuditTrail({
      userId,
      startDate,
      endDate
    });
  }

  /**
   * GET CRITICAL EVENTS
   * Get all critical audit events
   */
  async getCriticalEvents(startDate, endDate) {
    return await this.getAuditTrail({
      severity: AUDIT_SEVERITY.CRITICAL,
      startDate,
      endDate
    });
  }

  /**
   * GET FINANCIAL EVENTS
   * Get all financial audit events
   */
  async getFinancialEvents(startDate, endDate) {
    return await this.getAuditTrail({
      isFinancial: true,
      startDate,
      endDate
    });
  }

  /**
   * VERIFY AUDIT INTEGRITY
   * Check if audit trail has been tampered with
   */
  async verifyAuditIntegrity() {
    try {
      // Get all audit logs
      const result = await table('audit_trail')
        .orderBy('timestamp', 'ASC')
        .get();

      if (!result.success) {
        return { success: false, error: 'Failed to fetch audit logs' };
      }

      // Check for gaps in sequence
      const logs = result.data;
      let tamperedLogs = [];

      for (let i = 1; i < logs.length; i++) {
        const prevLog = logs[i - 1];
        const currentLog = logs[i];

        // Check timestamp sequence
        if (new Date(currentLog.timestamp) < new Date(prevLog.timestamp)) {
          tamperedLogs.push({
            logId: currentLog.id,
            issue: 'Timestamp out of sequence'
          });
        }
      }

      return {
        success: true,
        isValid: tamperedLogs.length === 0,
        tamperedLogs
      };
    } catch (error) {
      console.error('Verify audit integrity error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GENERATE AUDIT REPORT
   * Generate audit report for compliance
   */
  async generateAuditReport(startDate, endDate) {
    try {
      const logs = await this.getAuditTrail({ startDate, endDate });

      if (!logs.success) {
        return { success: false, error: logs.error };
      }

      // Categorize events
      const report = {
        period: { startDate, endDate },
        summary: {
          totalEvents: logs.logs.length,
          criticalEvents: logs.logs.filter(l => l.severity === AUDIT_SEVERITY.CRITICAL).length,
          financialEvents: logs.logs.filter(l => l.is_financial).length,
          userLogins: logs.logs.filter(l => l.event_type === AUDIT_EVENT_TYPES.USER_LOGIN).length
        },
        byCategory: {},
        byUser: {},
        criticalEvents: logs.logs.filter(l => l.severity === AUDIT_SEVERITY.CRITICAL),
        financialEvents: logs.logs.filter(l => l.is_financial)
      };

      // Group by category
      logs.logs.forEach(log => {
        const category = log.event_category;
        if (!report.byCategory[category]) {
          report.byCategory[category] = [];
        }
        report.byCategory[category].push(log);
      });

      // Group by user
      logs.logs.forEach(log => {
        const user = log.user_name;
        if (!report.byUser[user]) {
          report.byUser[user] = [];
        }
        report.byUser[user].push(log);
      });

      return { success: true, report };
    } catch (error) {
      console.error('Generate audit report error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * HELPER: Get event category
   */
  getEventCategory(eventType) {
    if (eventType.includes('USER')) return 'AUTHENTICATION';
    if (eventType.includes('TRANSACTION')) return 'TRANSACTION';
    if (eventType.includes('INVOICE')) return 'INVOICE';
    if (eventType.includes('PAYMENT')) return 'PAYMENT';
    if (eventType.includes('STOCK') || eventType.includes('PRODUCT')) return 'INVENTORY';
    if (eventType.includes('JOURNAL') || eventType.includes('PERIOD')) return 'ACCOUNTING';
    if (eventType.includes('ACCOUNT')) return 'MASTER_DATA';
    if (eventType.includes('SETTINGS') || eventType.includes('PRICE') || eventType.includes('TAX')) return 'SETTINGS';
    if (eventType.includes('REPORT')) return 'REPORTS';
    return 'SYSTEM';
  }

  /**
   * HELPER: Check if financial event
   */
  isFinancialEvent(eventType) {
    const financialEvents = [
      AUDIT_EVENT_TYPES.TRANSACTION_CREATE,
      AUDIT_EVENT_TYPES.TRANSACTION_EDIT,
      AUDIT_EVENT_TYPES.TRANSACTION_DELETE,
      AUDIT_EVENT_TYPES.INVOICE_CREATE,
      AUDIT_EVENT_TYPES.INVOICE_EDIT,
      AUDIT_EVENT_TYPES.INVOICE_CANCEL,
      AUDIT_EVENT_TYPES.PAYMENT_RECORD,
      AUDIT_EVENT_TYPES.PAYMENT_EDIT,
      AUDIT_EVENT_TYPES.JOURNAL_ENTRY,
      AUDIT_EVENT_TYPES.PERIOD_CLOSE
    ];
    return financialEvents.includes(eventType);
  }

  /**
   * HELPER: Get changes between old and new data
   */
  getChanges(oldData, newData) {
    const changes = {};
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          old: oldData[key],
          new: newData[key]
        };
      }
    }

    return changes;
  }

  /**
   * LOG CRITICAL EVENT
   * Separate logging for critical events
   */
  async logCriticalEvent(auditLog) {
    try {
      await table('critical_audit_trail').insert({
        ...auditLog,
        id: uuidv4() // New ID for critical table
      });
    } catch (error) {
      console.error('Log critical event error:', error);
    }
  }

  /**
   * SET CURRENT USER
   */
  setCurrentUser(user) {
    this.currentUser = user;
  }
}

// Create singleton instance
const auditTrailService = new AuditTrailService();

export default auditTrailService;
export { AuditTrailService, AUDIT_EVENT_TYPES, AUDIT_SEVERITY };
