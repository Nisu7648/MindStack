/**
 * DATABASE MODELS
 * ORM-style models for database tables
 * 
 * Features:
 * - User model
 * - Business model
 * - Account model
 * - Transaction model
 * - Invoice model
 * - Inventory model
 * - Relationships
 * - Validation
 */

import { table } from './queryBuilder';

/**
 * Base Model
 */
class Model {
  constructor(tableName) {
    this.tableName = tableName;
  }

  query() {
    return table(this.tableName);
  }

  async all() {
    return await this.query().get();
  }

  async find(id) {
    return await this.query().find(id);
  }

  async create(data) {
    return await this.query().insert(data);
  }

  async update(id, data) {
    return await this.query().where('id', id).update(data);
  }

  async delete(id) {
    return await this.query().where('id', id).delete();
  }

  async count() {
    return await this.query().count();
  }
}

/**
 * User Model
 */
class User extends Model {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    return await this.query()
      .where('email', email.toLowerCase())
      .first();
  }

  async findByAuthProvider(email, provider) {
    return await this.query()
      .where('email', email.toLowerCase())
      .where('auth_provider', provider)
      .first();
  }

  async createUser(data) {
    const userData = {
      id: data.id,
      email: data.email.toLowerCase(),
      password_hash: data.passwordHash || null,
      full_name: data.fullName || '',
      phone: data.phone || '',
      profile_picture: data.profilePicture || null,
      auth_provider: data.authProvider || 'email',
      email_verified: data.emailVerified ? 1 : 0,
      verification_token: data.verificationToken || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.create(userData);
  }

  async updateProfile(userId, data) {
    const updates = {
      updated_at: new Date().toISOString()
    };

    if (data.fullName) updates.full_name = data.fullName;
    if (data.phone) updates.phone = data.phone;
    if (data.profilePicture) updates.profile_picture = data.profilePicture;

    return await this.update(userId, updates);
  }

  async verifyEmail(userId) {
    return await this.update(userId, {
      email_verified: 1,
      verification_token: null,
      updated_at: new Date().toISOString()
    });
  }

  async incrementFailedAttempts(userId) {
    const user = await this.find(userId);
    if (!user.success) return user;

    const attempts = (user.data.failed_login_attempts || 0) + 1;
    const updates = {
      failed_login_attempts: attempts,
      last_failed_login: new Date().toISOString()
    };

    if (attempts >= 5) {
      updates.account_locked = 1;
    }

    return await this.update(userId, updates);
  }

  async resetFailedAttempts(userId) {
    return await this.update(userId, {
      failed_login_attempts: 0
    });
  }

  async softDelete(userId) {
    return await this.update(userId, {
      deleted: 1,
      deleted_at: new Date().toISOString(),
      email: `deleted_${userId}@deleted.com`
    });
  }
}

/**
 * Business Model
 */
class Business extends Model {
  constructor() {
    super('business');
  }

  async findByUser(userId) {
    return await this.query()
      .where('user_id', userId)
      .where('is_active', 1)
      .first();
  }

  async createBusiness(data) {
    const businessData = {
      user_id: data.userId,
      business_name: data.businessName,
      legal_name: data.legalName || null,
      gstin: data.gstin || null,
      pan: data.pan || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      logo: data.logo || null,
      financial_year_start: data.financialYearStart || '04-01',
      books_beginning_from: data.booksBeginningFrom,
      industry: data.industry || null,
      business_type: data.businessType || null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.create(businessData);
  }

  async updateBusiness(businessId, data) {
    const updates = {
      updated_at: new Date().toISOString()
    };

    const fields = [
      'businessName', 'legalName', 'gstin', 'pan', 'address',
      'city', 'state', 'pincode', 'phone', 'email', 'website', 'logo'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates[dbField] = data[field];
      }
    }

    return await this.update(businessId, updates);
  }
}

/**
 * Account Model
 */
class Account extends Model {
  constructor() {
    super('accounts');
  }

  async findByCode(code) {
    return await this.query()
      .where('code', code)
      .first();
  }

  async findByType(type) {
    return await this.query()
      .where('type', type)
      .where('is_active', 1)
      .get();
  }

  async getChartOfAccounts() {
    return await this.query()
      .where('is_active', 1)
      .orderBy('code', 'ASC')
      .get();
  }

  async createAccount(data) {
    const accountData = {
      code: data.code,
      name: data.name,
      type: data.type,
      sub_type: data.subType || null,
      parent_id: data.parentId || null,
      balance: data.balance || 0,
      opening_balance: data.openingBalance || 0,
      is_system: data.isSystem ? 1 : 0,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.create(accountData);
  }

  async updateBalance(accountId, amount, isDebit) {
    const account = await this.find(accountId);
    if (!account.success) return account;

    const currentBalance = account.data.balance || 0;
    const newBalance = isDebit
      ? currentBalance + amount
      : currentBalance - amount;

    return await this.update(accountId, {
      balance: newBalance,
      updated_at: new Date().toISOString()
    });
  }
}

/**
 * Transaction Model
 */
class Transaction extends Model {
  constructor() {
    super('transactions');
  }

  async createTransaction(data) {
    const txnData = {
      txn_date: data.date,
      txn_type: data.type,
      reference: data.reference || null,
      description: data.description,
      total_amount: data.totalAmount,
      status: data.status || 'posted',
      created_by: data.createdBy || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.create(txnData);
  }

  async getByDateRange(startDate, endDate) {
    return await this.query()
      .whereBetween('txn_date', startDate, endDate)
      .orderBy('txn_date', 'DESC')
      .get();
  }

  async getByType(type) {
    return await this.query()
      .where('txn_type', type)
      .orderBy('txn_date', 'DESC')
      .get();
  }

  async voidTransaction(txnId) {
    return await this.update(txnId, {
      status: 'void',
      updated_at: new Date().toISOString()
    });
  }
}

/**
 * Ledger Model
 */
class Ledger extends Model {
  constructor() {
    super('ledger');
  }

  async createEntry(data) {
    const entryData = {
      transaction_id: data.transactionId,
      date: data.date,
      account_id: data.accountId,
      description: data.description || null,
      debit: data.debit || 0,
      credit: data.credit || 0,
      balance: data.balance || 0,
      reference_type: data.referenceType || null,
      reference_id: data.referenceId || null,
      voucher_no: data.voucherNo || null,
      created_at: new Date().toISOString()
    };

    return await this.create(entryData);
  }

  async getByAccount(accountId, startDate = null, endDate = null) {
    let query = this.query()
      .where('account_id', accountId)
      .orderBy('date', 'ASC');

    if (startDate && endDate) {
      query = query.whereBetween('date', startDate, endDate);
    }

    return await query.get();
  }

  async getByTransaction(transactionId) {
    return await this.query()
      .where('transaction_id', transactionId)
      .get();
  }

  async getAccountBalance(accountId) {
    const entries = await this.getByAccount(accountId);
    if (!entries.success) return 0;

    let balance = 0;
    for (const entry of entries.data) {
      balance += (entry.debit || 0) - (entry.credit || 0);
    }

    return balance;
  }
}

/**
 * Invoice Model
 */
class Invoice extends Model {
  constructor() {
    super('invoices');
  }

  async createInvoice(data) {
    const invoiceData = {
      invoice_no: data.invoiceNo,
      invoice_date: data.invoiceDate,
      invoice_type: data.invoiceType,
      party_name: data.partyName,
      party_gstin: data.partyGstin || null,
      party_address: data.partyAddress || null,
      party_phone: data.partyPhone || null,
      party_email: data.partyEmail || null,
      place_of_supply: data.placeOfSupply,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      taxable_amount: data.taxableAmount,
      cgst_amount: data.cgstAmount || 0,
      sgst_amount: data.sgstAmount || 0,
      igst_amount: data.igstAmount || 0,
      cess_amount: data.cessAmount || 0,
      total_amount: data.totalAmount,
      payment_mode: data.paymentMode || null,
      payment_status: data.paymentStatus || 'unpaid',
      notes: data.notes || null,
      terms: data.terms || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.create(invoiceData);
  }

  async getByDateRange(startDate, endDate) {
    return await this.query()
      .whereBetween('invoice_date', startDate, endDate)
      .orderBy('invoice_date', 'DESC')
      .get();
  }

  async getByType(type) {
    return await this.query()
      .where('invoice_type', type)
      .where('status', 'active')
      .orderBy('invoice_date', 'DESC')
      .get();
  }

  async updatePaymentStatus(invoiceId, status) {
    return await this.update(invoiceId, {
      payment_status: status,
      updated_at: new Date().toISOString()
    });
  }

  async getTotalSales(startDate, endDate) {
    return await this.query()
      .where('invoice_type', 'SALE')
      .whereBetween('invoice_date', startDate, endDate)
      .sum('total_amount');
  }

  async getTotalPurchases(startDate, endDate) {
    return await this.query()
      .where('invoice_type', 'PURCHASE')
      .whereBetween('invoice_date', startDate, endDate)
      .sum('total_amount');
  }
}

/**
 * Inventory Model
 */
class Inventory extends Model {
  constructor() {
    super('inventory');
  }

  async findByCode(itemCode) {
    return await this.query()
      .where('item_code', itemCode)
      .first();
  }

  async findByBarcode(barcode) {
    return await this.query()
      .where('barcode', barcode)
      .first();
  }

  async createItem(data) {
    const itemData = {
      item_code: data.itemCode,
      item_name: data.itemName,
      barcode: data.barcode || null,
      hsn_code: data.hsnCode || null,
      description: data.description || null,
      category: data.category || null,
      unit: data.unit || 'PCS',
      purchase_price: data.purchasePrice || 0,
      selling_price: data.sellingPrice || 0,
      gst_rate: data.gstRate || 0,
      current_stock: data.openingStock || 0,
      min_stock_level: data.minStockLevel || 0,
      max_stock_level: data.maxStockLevel || 0,
      reorder_level: data.reorderLevel || 0,
      avg_cost: data.purchasePrice || 0,
      total_value: (data.openingStock || 0) * (data.purchasePrice || 0),
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.create(itemData);
  }

  async updateStock(itemId, quantity, unitCost = null) {
    const item = await this.find(itemId);
    if (!item.success) return item;

    const currentStock = item.data.current_stock || 0;
    const newStock = currentStock + quantity;

    const updates = {
      current_stock: newStock,
      updated_at: new Date().toISOString()
    };

    if (unitCost !== null) {
      const currentValue = item.data.total_value || 0;
      const addedValue = quantity * unitCost;
      const newValue = currentValue + addedValue;
      
      updates.total_value = newValue;
      updates.avg_cost = newStock > 0 ? newValue / newStock : 0;
    }

    return await this.update(itemId, updates);
  }

  async getLowStockItems() {
    return await this.query()
      .where('is_active', 1)
      .where('current_stock', '<=', 'min_stock_level')
      .get();
  }

  async getOutOfStockItems() {
    return await this.query()
      .where('is_active', 1)
      .where('current_stock', 0)
      .get();
  }

  async getTotalStockValue() {
    return await this.query()
      .where('is_active', 1)
      .sum('total_value');
  }
}

/**
 * Settings Model
 */
class Settings extends Model {
  constructor() {
    super('settings');
  }

  async get(key) {
    const result = await this.query()
      .where('key', key)
      .first();

    if (!result.success || !result.data) {
      return null;
    }

    const setting = result.data;
    
    // Parse value based on type
    if (setting.type === 'boolean') {
      return setting.value === 'true';
    } else if (setting.type === 'number') {
      return parseFloat(setting.value);
    } else if (setting.type === 'json') {
      return JSON.parse(setting.value);
    }
    
    return setting.value;
  }

  async set(key, value, type = 'string', category = 'general') {
    // Convert value to string
    let stringValue = value;
    if (type === 'boolean') {
      stringValue = value ? 'true' : 'false';
    } else if (type === 'json') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    // Check if exists
    const existing = await this.query()
      .where('key', key)
      .first();

    if (existing.success && existing.data) {
      // Update
      return await this.query()
        .where('key', key)
        .update({
          value: stringValue,
          type,
          updated_at: new Date().toISOString()
        });
    } else {
      // Insert
      return await this.create({
        key,
        value: stringValue,
        type,
        category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  async getByCategory(category) {
    return await this.query()
      .where('category', category)
      .get();
  }
}

// Create model instances
const UserModel = new User();
const BusinessModel = new Business();
const AccountModel = new Account();
const TransactionModel = new Transaction();
const LedgerModel = new Ledger();
const InvoiceModel = new Invoice();
const InventoryModel = new Inventory();
const SettingsModel = new Settings();

export {
  Model,
  UserModel,
  BusinessModel,
  AccountModel,
  TransactionModel,
  LedgerModel,
  InvoiceModel,
  InventoryModel,
  SettingsModel
};
