/**
 * OWNER CONTROL & STAFF RESTRICTION
 * Owner dashboard + Staff permissions
 * 
 * Owner sees only:
 * - Today sales
 * - Cash in hand
 * - Low stock items
 * - Dead stock items
 * 
 * Staff restrictions:
 * - Can bill
 * - Can't edit products
 * - Can't edit prices
 * - Can't delete bills
 */

import { table } from '../database/queryBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User Roles
 */
export const USER_ROLES = {
  OWNER: 'OWNER',
  CASHIER: 'CASHIER'
};

/**
 * Permissions
 */
export const PERMISSIONS = {
  // Billing
  CREATE_BILL: 'CREATE_BILL',
  CANCEL_BILL: 'CANCEL_BILL',
  EDIT_PRICE: 'EDIT_PRICE',
  APPLY_DISCOUNT: 'APPLY_DISCOUNT',
  
  // Products
  ADD_PRODUCT: 'ADD_PRODUCT',
  EDIT_PRODUCT: 'EDIT_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Stock
  ADJUST_STOCK: 'ADJUST_STOCK',
  ADD_PURCHASE: 'ADD_PURCHASE',
  
  // Reports
  VIEW_REPORTS: 'VIEW_REPORTS',
  VIEW_PROFIT: 'VIEW_PROFIT',
  
  // Settings
  CHANGE_SETTINGS: 'CHANGE_SETTINGS',
  MANAGE_USERS: 'MANAGE_USERS',
  
  // Day Close
  CLOSE_DAY: 'CLOSE_DAY'
};

/**
 * Role Permissions Map
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.OWNER]: [
    // All permissions
    ...Object.values(PERMISSIONS)
  ],
  [USER_ROLES.CASHIER]: [
    // Limited permissions
    PERMISSIONS.CREATE_BILL,
    PERMISSIONS.VIEW_REPORTS
  ]
};

/**
 * Access Control Manager
 */
class AccessControlManager {
  constructor() {
    this.currentUser = null;
    this.currentRole = null;
  }

  /**
   * INITIALIZE
   */
  async initialize() {
    try {
      // Load current user
      const userData = await AsyncStorage.getItem('current_user');
      if (userData) {
        const user = JSON.parse(userData);
        this.currentUser = user;
        this.currentRole = user.role;
      }

      return { success: true };
    } catch (error) {
      console.error('Access control initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * CHECK PERMISSION
   */
  hasPermission(permission) {
    if (!this.currentRole) {
      return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[this.currentRole] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * REQUIRE PERMISSION
   */
  requirePermission(permission) {
    if (!this.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  /**
   * IS OWNER
   */
  isOwner() {
    return this.currentRole === USER_ROLES.OWNER;
  }

  /**
   * IS CASHIER
   */
  isCashier() {
    return this.currentRole === USER_ROLES.CASHIER;
  }

  /**
   * GET OWNER DASHBOARD DATA
   */
  async getOwnerDashboard() {
    try {
      // Require owner permission
      this.requirePermission(PERMISSIONS.VIEW_PROFIT);

      const today = new Date().toISOString().split('T')[0];

      // 1. Today Sales
      const salesResult = await table('invoices')
        .where('invoice_date', '>=', `${today}T00:00:00`)
        .where('invoice_date', '<', `${today}T23:59:59`)
        .where('status', 'active')
        .get();

      let todaySales = 0;
      let todayProfit = 0;

      if (salesResult.success) {
        todaySales = salesResult.data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        // Calculate profit
        for (const invoice of salesResult.data) {
          const items = await table('invoice_items')
            .where('invoice_id', invoice.id)
            .get();

          if (items.success) {
            for (const item of items.data) {
              // Get product cost
              const product = await table('inventory')
                .where('id', item.product_id)
                .first();

              if (product.success && product.data) {
                const cost = product.data.purchase_price * item.quantity;
                const revenue = item.amount;
                todayProfit += (revenue - cost);
              }
            }
          }
        }
      }

      // 2. Cash in Hand
      const cashResult = await table('invoices')
        .where('invoice_date', '>=', `${today}T00:00:00`)
        .where('invoice_date', '<', `${today}T23:59:59`)
        .where('payment_mode', 'CASH')
        .where('status', 'active')
        .get();

      let cashInHand = 0;
      if (cashResult.success) {
        cashInHand = cashResult.data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      }

      // 3. Low Stock Items
      const lowStockResult = await table('inventory')
        .where('is_active', 1)
        .where('current_stock', '<=', 'min_stock_level')
        .orderBy('current_stock', 'ASC')
        .limit(10)
        .get();

      const lowStockItems = lowStockResult.success ? lowStockResult.data : [];

      // 4. Dead Stock Items (no sale in 45 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 45);

      const allProducts = await table('inventory')
        .where('is_active', 1)
        .where('current_stock', '>', 0)
        .get();

      const deadStockItems = [];

      if (allProducts.success) {
        for (const product of allProducts.data) {
          const lastSale = await table('stock_movements')
            .where('product_id', product.id)
            .where('movement_type', 'SALE')
            .where('date', '>=', cutoffDate.toISOString())
            .first();

          if (!lastSale.success || !lastSale.data) {
            deadStockItems.push(product);
          }
        }
      }

      return {
        success: true,
        dashboard: {
          todaySales,
          todayProfit,
          cashInHand,
          lowStockItems: lowStockItems.slice(0, 5),
          deadStockItems: deadStockItems.slice(0, 5)
        }
      };
    } catch (error) {
      console.error('Get owner dashboard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * GET CASHIER DASHBOARD DATA
   */
  async getCashierDashboard() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Only today sales (no profit)
      const salesResult = await table('invoices')
        .where('invoice_date', '>=', `${today}T00:00:00`)
        .where('invoice_date', '<', `${today}T23:59:59`)
        .where('status', 'active')
        .get();

      let todaySales = 0;
      let billCount = 0;

      if (salesResult.success) {
        todaySales = salesResult.data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
        billCount = salesResult.data.length;
      }

      return {
        success: true,
        dashboard: {
          todaySales,
          billCount
        }
      };
    } catch (error) {
      console.error('Get cashier dashboard error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SET CURRENT USER
   */
  async setCurrentUser(user) {
    try {
      this.currentUser = user;
      this.currentRole = user.role;

      await AsyncStorage.setItem('current_user', JSON.stringify(user));

      return { success: true };
    } catch (error) {
      console.error('Set current user error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LOGOUT
   */
  async logout() {
    try {
      this.currentUser = null;
      this.currentRole = null;

      await AsyncStorage.removeItem('current_user');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const accessControl = new AccessControlManager();

export default accessControl;
export { AccessControlManager, USER_ROLES, PERMISSIONS };
