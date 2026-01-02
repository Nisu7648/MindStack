/**
 * GLOBAL SEARCH SERVICE
 * 
 * Unified search across all entities:
 * - Transactions
 * - Customers
 * - Vendors
 * - Products
 * - Invoices
 * - Expenses
 * - Reports
 */

import { getDatabase } from '../../database/schema';

export class GlobalSearchService {

  /**
   * Search across all entities
   */
  static async searchAll(query, filters = {}) {
    if (!query || query.trim().length < 2) {
      return {
        transactions: [],
        customers: [],
        vendors: [],
        products: [],
        invoices: [],
        expenses: [],
        totalResults: 0
      };
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const results = {};

    // Search in parallel for better performance
    const [
      transactions,
      customers,
      vendors,
      products,
      invoices,
      expenses
    ] = await Promise.all([
      this.searchTransactions(searchTerm, filters),
      this.searchCustomers(searchTerm, filters),
      this.searchVendors(searchTerm, filters),
      this.searchProducts(searchTerm, filters),
      this.searchInvoices(searchTerm, filters),
      this.searchExpenses(searchTerm, filters)
    ]);

    return {
      transactions,
      customers,
      vendors,
      products,
      invoices,
      expenses,
      totalResults: 
        transactions.length + 
        customers.length + 
        vendors.length + 
        products.length + 
        invoices.length + 
        expenses.length
    };
  }

  /**
   * Search Transactions
   */
  static async searchTransactions(searchTerm, filters) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        t.*,
        CASE 
          WHEN t.customer_id IS NOT NULL THEN c.name
          WHEN t.vendor_id IS NOT NULL THEN v.name
          ELSE 'N/A'
        END as party_name
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      LEFT JOIN vendors v ON t.vendor_id = v.id
      WHERE (
        LOWER(t.description) LIKE ? OR
        LOWER(t.reference_number) LIKE ? OR
        LOWER(t.invoice_number) LIKE ? OR
        CAST(t.amount AS TEXT) LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm];

    // Apply filters
    if (filters.type) {
      query += ` AND t.type = ?`;
      params.push(filters.type);
    }

    if (filters.startDate && filters.endDate) {
      query += ` AND t.date BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }

    if (filters.minAmount) {
      query += ` AND t.amount >= ?`;
      params.push(filters.minAmount);
    }

    if (filters.maxAmount) {
      query += ` AND t.amount <= ?`;
      params.push(filters.maxAmount);
    }

    query += ` ORDER BY t.date DESC LIMIT 50`;

    const result = await db.executeSql(query, params);
    
    const transactions = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      transactions.push(result[0].rows.item(i));
    }

    return transactions;
  }

  /**
   * Search Customers
   */
  static async searchCustomers(searchTerm, filters) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        c.*,
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(CASE WHEN t.type = 'SALES' THEN t.amount ELSE 0 END) as total_sales,
        SUM(CASE WHEN t.payment_status = 'PENDING' THEN t.amount ELSE 0 END) as outstanding_balance
      FROM customers c
      LEFT JOIN transactions t ON c.id = t.customer_id
      WHERE (
        LOWER(c.name) LIKE ? OR
        LOWER(c.email) LIKE ? OR
        LOWER(c.phone) LIKE ? OR
        LOWER(c.gstin) LIKE ? OR
        LOWER(c.company) LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

    if (filters.city) {
      query += ` AND LOWER(c.city) = ?`;
      params.push(filters.city.toLowerCase());
    }

    if (filters.state) {
      query += ` AND LOWER(c.state) = ?`;
      params.push(filters.state.toLowerCase());
    }

    query += ` GROUP BY c.id ORDER BY c.name LIMIT 50`;

    const result = await db.executeSql(query, params);
    
    const customers = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      customers.push(result[0].rows.item(i));
    }

    return customers;
  }

  /**
   * Search Vendors
   */
  static async searchVendors(searchTerm, filters) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        v.*,
        COUNT(DISTINCT t.id) as transaction_count,
        SUM(CASE WHEN t.type = 'PURCHASE' THEN t.amount ELSE 0 END) as total_purchases,
        SUM(CASE WHEN t.payment_status = 'PENDING' THEN t.amount ELSE 0 END) as outstanding_balance
      FROM vendors v
      LEFT JOIN transactions t ON v.id = t.vendor_id
      WHERE (
        LOWER(v.name) LIKE ? OR
        LOWER(v.email) LIKE ? OR
        LOWER(v.phone) LIKE ? OR
        LOWER(v.gstin) LIKE ? OR
        LOWER(v.company) LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

    query += ` GROUP BY v.id ORDER BY v.name LIMIT 50`;

    const result = await db.executeSql(query, params);
    
    const vendors = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      vendors.push(result[0].rows.item(i));
    }

    return vendors;
  }

  /**
   * Search Products
   */
  static async searchProducts(searchTerm, filters) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        p.*,
        i.quantity as current_stock,
        i.value as stock_value
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE (
        LOWER(p.name) LIKE ? OR
        LOWER(p.sku) LIKE ? OR
        LOWER(p.barcode) LIKE ? OR
        LOWER(p.category) LIKE ? OR
        LOWER(p.description) LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

    if (filters.category) {
      query += ` AND LOWER(p.category) = ?`;
      params.push(filters.category.toLowerCase());
    }

    if (filters.inStock !== undefined) {
      if (filters.inStock) {
        query += ` AND i.quantity > 0`;
      } else {
        query += ` AND (i.quantity IS NULL OR i.quantity = 0)`;
      }
    }

    query += ` ORDER BY p.name LIMIT 50`;

    const result = await db.executeSql(query, params);
    
    const products = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      products.push(result[0].rows.item(i));
    }

    return products;
  }

  /**
   * Search Invoices
   */
  static async searchInvoices(searchTerm, filters) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.company as customer_company
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE (
        LOWER(i.invoice_number) LIKE ? OR
        LOWER(i.reference_number) LIKE ? OR
        LOWER(c.name) LIKE ? OR
        CAST(i.total_amount AS TEXT) LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm];

    if (filters.status) {
      query += ` AND i.status = ?`;
      params.push(filters.status);
    }

    if (filters.paymentStatus) {
      query += ` AND i.payment_status = ?`;
      params.push(filters.paymentStatus);
    }

    query += ` ORDER BY i.invoice_date DESC LIMIT 50`;

    const result = await db.executeSql(query, params);
    
    const invoices = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      invoices.push(result[0].rows.item(i));
    }

    return invoices;
  }

  /**
   * Search Expenses
   */
  static async searchExpenses(searchTerm, filters) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        e.*,
        v.name as vendor_name
      FROM expenses e
      LEFT JOIN vendors v ON e.vendor_id = v.id
      WHERE (
        LOWER(e.description) LIKE ? OR
        LOWER(e.category) LIKE ? OR
        LOWER(e.reference_number) LIKE ? OR
        CAST(e.amount AS TEXT) LIKE ?
      )
    `;

    const params = [searchTerm, searchTerm, searchTerm, searchTerm];

    if (filters.category) {
      query += ` AND LOWER(e.category) = ?`;
      params.push(filters.category.toLowerCase());
    }

    if (filters.startDate && filters.endDate) {
      query += ` AND e.date BETWEEN ? AND ?`;
      params.push(filters.startDate, filters.endDate);
    }

    query += ` ORDER BY e.date DESC LIMIT 50`;

    const result = await db.executeSql(query, params);
    
    const expenses = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      expenses.push(result[0].rows.item(i));
    }

    return expenses;
  }

  /**
   * Get search suggestions (autocomplete)
   */
  static async getSearchSuggestions(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const db = await getDatabase();
    const searchTerm = `%${query.toLowerCase()}%`;
    const suggestions = [];

    // Get customer names
    const customers = await db.executeSql(
      `SELECT DISTINCT name as suggestion, 'customer' as type 
       FROM customers 
       WHERE LOWER(name) LIKE ? 
       LIMIT 5`,
      [searchTerm]
    );

    for (let i = 0; i < customers[0].rows.length; i++) {
      suggestions.push(customers[0].rows.item(i));
    }

    // Get product names
    const products = await db.executeSql(
      `SELECT DISTINCT name as suggestion, 'product' as type 
       FROM products 
       WHERE LOWER(name) LIKE ? 
       LIMIT 5`,
      [searchTerm]
    );

    for (let i = 0; i < products[0].rows.length; i++) {
      suggestions.push(products[0].rows.item(i));
    }

    // Get invoice numbers
    const invoices = await db.executeSql(
      `SELECT DISTINCT invoice_number as suggestion, 'invoice' as type 
       FROM invoices 
       WHERE LOWER(invoice_number) LIKE ? 
       LIMIT 5`,
      [searchTerm]
    );

    for (let i = 0; i < invoices[0].rows.length; i++) {
      suggestions.push(invoices[0].rows.item(i));
    }

    return suggestions;
  }

  /**
   * Get recent searches
   */
  static async getRecentSearches() {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT DISTINCT search_query, search_date 
       FROM search_history 
       ORDER BY search_date DESC 
       LIMIT 10`
    );

    const searches = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      searches.push(result[0].rows.item(i));
    }

    return searches;
  }

  /**
   * Save search to history
   */
  static async saveSearchHistory(query, resultCount) {
    const db = await getDatabase();
    
    await db.executeSql(
      `INSERT INTO search_history (search_query, result_count, search_date) 
       VALUES (?, ?, datetime('now'))`,
      [query, resultCount]
    );
  }

  /**
   * Clear search history
   */
  static async clearSearchHistory() {
    const db = await getDatabase();
    await db.executeSql('DELETE FROM search_history');
  }

  /**
   * Get popular searches
   */
  static async getPopularSearches() {
    const db = await getDatabase();
    
    const result = await db.executeSql(
      `SELECT search_query, COUNT(*) as search_count 
       FROM search_history 
       GROUP BY search_query 
       ORDER BY search_count DESC 
       LIMIT 10`
    );

    const searches = [];
    for (let i = 0; i < result[0].rows.length; i++) {
      searches.push(result[0].rows.item(i));
    }

    return searches;
  }

  /**
   * Advanced search with filters
   */
  static async advancedSearch(params) {
    const {
      query,
      entityType, // 'all', 'transactions', 'customers', etc.
      dateRange,
      amountRange,
      status,
      category,
      sortBy,
      sortOrder
    } = params;

    const searchTerm = `%${query.toLowerCase()}%`;
    const filters = {
      startDate: dateRange?.start,
      endDate: dateRange?.end,
      minAmount: amountRange?.min,
      maxAmount: amountRange?.max,
      status,
      category
    };

    let results;

    switch (entityType) {
      case 'transactions':
        results = { transactions: await this.searchTransactions(searchTerm, filters) };
        break;
      case 'customers':
        results = { customers: await this.searchCustomers(searchTerm, filters) };
        break;
      case 'vendors':
        results = { vendors: await this.searchVendors(searchTerm, filters) };
        break;
      case 'products':
        results = { products: await this.searchProducts(searchTerm, filters) };
        break;
      case 'invoices':
        results = { invoices: await this.searchInvoices(searchTerm, filters) };
        break;
      case 'expenses':
        results = { expenses: await this.searchExpenses(searchTerm, filters) };
        break;
      default:
        results = await this.searchAll(query, filters);
    }

    return results;
  }
}

export default GlobalSearchService;
