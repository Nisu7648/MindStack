/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACCOUNTING SETTINGS SERVICE - BOOK CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Allows users to configure which accounting books to maintain:
 * - Journal Book (Always ON - mandatory)
 * - Ledger (Always ON - mandatory)
 * - Purchase Book
 * - Sales Book
 * - Purchase Return Book
 * - Sales Return Book
 * - Cash Book
 * - Bank Book
 * - Petty Cash Book
 * - Bills Receivable Book
 * - Bills Payable Book
 * 
 * Default: All books enabled
 * User can enable/disable books as per their business needs
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNTING_BOOKS = {
  JOURNAL: 'JOURNAL',
  LEDGER: 'LEDGER',
  PURCHASE_BOOK: 'PURCHASE_BOOK',
  SALES_BOOK: 'SALES_BOOK',
  PURCHASE_RETURN: 'PURCHASE_RETURN',
  SALES_RETURN: 'SALES_RETURN',
  CASH_BOOK: 'CASH_BOOK',
  BANK_BOOK: 'BANK_BOOK',
  PETTY_CASH_BOOK: 'PETTY_CASH_BOOK',
  BILLS_RECEIVABLE: 'BILLS_RECEIVABLE',
  BILLS_PAYABLE: 'BILLS_PAYABLE'
};

export const BOOK_NAMES = {
  [ACCOUNTING_BOOKS.JOURNAL]: 'Journal Book',
  [ACCOUNTING_BOOKS.LEDGER]: 'Ledger',
  [ACCOUNTING_BOOKS.PURCHASE_BOOK]: 'Purchase Book',
  [ACCOUNTING_BOOKS.SALES_BOOK]: 'Sales Book',
  [ACCOUNTING_BOOKS.PURCHASE_RETURN]: 'Purchase Return Book',
  [ACCOUNTING_BOOKS.SALES_RETURN]: 'Sales Return Book',
  [ACCOUNTING_BOOKS.CASH_BOOK]: 'Cash Book',
  [ACCOUNTING_BOOKS.BANK_BOOK]: 'Bank Book',
  [ACCOUNTING_BOOKS.PETTY_CASH_BOOK]: 'Petty Cash Book',
  [ACCOUNTING_BOOKS.BILLS_RECEIVABLE]: 'Bills Receivable Book',
  [ACCOUNTING_BOOKS.BILLS_PAYABLE]: 'Bills Payable Book'
};

export const BOOK_DESCRIPTIONS = {
  [ACCOUNTING_BOOKS.JOURNAL]: 'Records all transactions in chronological order (Mandatory)',
  [ACCOUNTING_BOOKS.LEDGER]: 'Account-wise record of all transactions (Mandatory)',
  [ACCOUNTING_BOOKS.PURCHASE_BOOK]: 'Records credit purchases only',
  [ACCOUNTING_BOOKS.SALES_BOOK]: 'Records credit sales only',
  [ACCOUNTING_BOOKS.PURCHASE_RETURN]: 'Records goods returned to suppliers (Debit Notes)',
  [ACCOUNTING_BOOKS.SALES_RETURN]: 'Records goods returned by customers (Credit Notes)',
  [ACCOUNTING_BOOKS.CASH_BOOK]: 'Records all cash transactions',
  [ACCOUNTING_BOOKS.BANK_BOOK]: 'Records all bank transactions',
  [ACCOUNTING_BOOKS.PETTY_CASH_BOOK]: 'Records small expenses (Imprest System)',
  [ACCOUNTING_BOOKS.BILLS_RECEIVABLE]: 'Records bills received from debtors',
  [ACCOUNTING_BOOKS.BILLS_PAYABLE]: 'Records bills given to creditors'
};

export class AccountingSettingsService {
  static SETTINGS_KEY = '@mindstack_accounting_settings';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET DEFAULT SETTINGS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getDefaultSettings() {
    return {
      enabledBooks: {
        [ACCOUNTING_BOOKS.JOURNAL]: true,        // Always ON (mandatory)
        [ACCOUNTING_BOOKS.LEDGER]: true,         // Always ON (mandatory)
        [ACCOUNTING_BOOKS.PURCHASE_BOOK]: true,
        [ACCOUNTING_BOOKS.SALES_BOOK]: true,
        [ACCOUNTING_BOOKS.PURCHASE_RETURN]: true,
        [ACCOUNTING_BOOKS.SALES_RETURN]: true,
        [ACCOUNTING_BOOKS.CASH_BOOK]: true,
        [ACCOUNTING_BOOKS.BANK_BOOK]: true,
        [ACCOUNTING_BOOKS.PETTY_CASH_BOOK]: true,
        [ACCOUNTING_BOOKS.BILLS_RECEIVABLE]: true,
        [ACCOUNTING_BOOKS.BILLS_PAYABLE]: true
      },
      companyName: '',
      financialYearStart: 'April',
      gstNumber: '',
      panNumber: '',
      address: '',
      phone: '',
      email: ''
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET SETTINGS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getSettings() {
    try {
      const data = await AsyncStorage.getItem(this.SETTINGS_KEY);
      
      if (data) {
        const settings = JSON.parse(data);
        // Ensure Journal and Ledger are always enabled
        settings.enabledBooks[ACCOUNTING_BOOKS.JOURNAL] = true;
        settings.enabledBooks[ACCOUNTING_BOOKS.LEDGER] = true;
        return {
          success: true,
          data: settings
        };
      }

      // Return default settings
      return {
        success: true,
        data: this.getDefaultSettings()
      };
    } catch (error) {
      console.error('Get settings error:', error);
      return {
        success: false,
        error: error.message,
        data: this.getDefaultSettings()
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE SETTINGS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateSettings(settings) {
    try {
      // Ensure Journal and Ledger are always enabled
      settings.enabledBooks[ACCOUNTING_BOOKS.JOURNAL] = true;
      settings.enabledBooks[ACCOUNTING_BOOKS.LEDGER] = true;

      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));

      return {
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      };
    } catch (error) {
      console.error('Update settings error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ENABLE/DISABLE BOOK
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async toggleBook(bookType, enabled) {
    try {
      // Cannot disable Journal or Ledger
      if (bookType === ACCOUNTING_BOOKS.JOURNAL || bookType === ACCOUNTING_BOOKS.LEDGER) {
        return {
          success: false,
          error: `${BOOK_NAMES[bookType]} is mandatory and cannot be disabled`
        };
      }

      const result = await this.getSettings();
      const settings = result.data;

      settings.enabledBooks[bookType] = enabled;

      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));

      return {
        success: true,
        data: settings,
        message: `${BOOK_NAMES[bookType]} ${enabled ? 'enabled' : 'disabled'} successfully`
      };
    } catch (error) {
      console.error('Toggle book error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CHECK IF BOOK IS ENABLED
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async isBookEnabled(bookType) {
    try {
      const result = await this.getSettings();
      const settings = result.data;

      return settings.enabledBooks[bookType] === true;
    } catch (error) {
      console.error('Check book enabled error:', error);
      return true; // Default to enabled
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ENABLED BOOKS LIST
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getEnabledBooks() {
    try {
      const result = await this.getSettings();
      const settings = result.data;

      const enabledBooks = Object.keys(settings.enabledBooks)
        .filter(bookType => settings.enabledBooks[bookType] === true)
        .map(bookType => ({
          type: bookType,
          name: BOOK_NAMES[bookType],
          description: BOOK_DESCRIPTIONS[bookType],
          mandatory: bookType === ACCOUNTING_BOOKS.JOURNAL || bookType === ACCOUNTING_BOOKS.LEDGER
        }));

      return {
        success: true,
        data: enabledBooks
      };
    } catch (error) {
      console.error('Get enabled books error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL BOOKS WITH STATUS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAllBooksWithStatus() {
    try {
      const result = await this.getSettings();
      const settings = result.data;

      const books = Object.keys(ACCOUNTING_BOOKS).map(key => {
        const bookType = ACCOUNTING_BOOKS[key];
        return {
          type: bookType,
          name: BOOK_NAMES[bookType],
          description: BOOK_DESCRIPTIONS[bookType],
          enabled: settings.enabledBooks[bookType] === true,
          mandatory: bookType === ACCOUNTING_BOOKS.JOURNAL || bookType === ACCOUNTING_BOOKS.LEDGER
        };
      });

      return {
        success: true,
        data: books
      };
    } catch (error) {
      console.error('Get all books with status error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RESET TO DEFAULT SETTINGS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async resetToDefault() {
    try {
      const defaultSettings = this.getDefaultSettings();
      
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));

      return {
        success: true,
        data: defaultSettings,
        message: 'Settings reset to default (all books enabled)'
      };
    } catch (error) {
      console.error('Reset to default error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE COMPANY DETAILS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateCompanyDetails(companyDetails) {
    try {
      const result = await this.getSettings();
      const settings = result.data;

      settings.companyName = companyDetails.companyName || settings.companyName;
      settings.financialYearStart = companyDetails.financialYearStart || settings.financialYearStart;
      settings.gstNumber = companyDetails.gstNumber || settings.gstNumber;
      settings.panNumber = companyDetails.panNumber || settings.panNumber;
      settings.address = companyDetails.address || settings.address;
      settings.phone = companyDetails.phone || settings.phone;
      settings.email = companyDetails.email || settings.email;

      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));

      return {
        success: true,
        data: settings,
        message: 'Company details updated successfully'
      };
    } catch (error) {
      console.error('Update company details error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET BOOK CONFIGURATION FOR TRANSACTION TYPE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getBooksForTransactionType(transactionType) {
    try {
      const result = await this.getSettings();
      const settings = result.data;

      const books = [ACCOUNTING_BOOKS.JOURNAL, ACCOUNTING_BOOKS.LEDGER]; // Always included

      switch (transactionType.toUpperCase()) {
        case 'CASH_PURCHASE':
        case 'PURCHASE':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_BOOK]) {
            books.push(ACCOUNTING_BOOKS.PURCHASE_BOOK);
          }
          if (settings.enabledBooks[ACCOUNTING_BOOKS.CASH_BOOK]) {
            books.push(ACCOUNTING_BOOKS.CASH_BOOK);
          }
          break;

        case 'CREDIT_PURCHASE':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_BOOK]) {
            books.push(ACCOUNTING_BOOKS.PURCHASE_BOOK);
          }
          break;

        case 'CASH_SALE':
        case 'SALE':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.SALES_BOOK]) {
            books.push(ACCOUNTING_BOOKS.SALES_BOOK);
          }
          if (settings.enabledBooks[ACCOUNTING_BOOKS.CASH_BOOK]) {
            books.push(ACCOUNTING_BOOKS.CASH_BOOK);
          }
          break;

        case 'CREDIT_SALE':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.SALES_BOOK]) {
            books.push(ACCOUNTING_BOOKS.SALES_BOOK);
          }
          break;

        case 'PURCHASE_RETURN':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.PURCHASE_RETURN]) {
            books.push(ACCOUNTING_BOOKS.PURCHASE_RETURN);
          }
          break;

        case 'SALES_RETURN':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.SALES_RETURN]) {
            books.push(ACCOUNTING_BOOKS.SALES_RETURN);
          }
          break;

        case 'CASH_RECEIPT':
        case 'CASH_PAYMENT':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.CASH_BOOK]) {
            books.push(ACCOUNTING_BOOKS.CASH_BOOK);
          }
          break;

        case 'BANK_RECEIPT':
        case 'BANK_PAYMENT':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.BANK_BOOK]) {
            books.push(ACCOUNTING_BOOKS.BANK_BOOK);
          }
          break;

        case 'PETTY_CASH':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.PETTY_CASH_BOOK]) {
            books.push(ACCOUNTING_BOOKS.PETTY_CASH_BOOK);
          }
          break;

        case 'BILL_RECEIVABLE':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.BILLS_RECEIVABLE]) {
            books.push(ACCOUNTING_BOOKS.BILLS_RECEIVABLE);
          }
          break;

        case 'BILL_PAYABLE':
          if (settings.enabledBooks[ACCOUNTING_BOOKS.BILLS_PAYABLE]) {
            books.push(ACCOUNTING_BOOKS.BILLS_PAYABLE);
          }
          break;
      }

      return {
        success: true,
        data: books.map(bookType => ({
          type: bookType,
          name: BOOK_NAMES[bookType]
        }))
      };
    } catch (error) {
      console.error('Get books for transaction type error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
}

export default AccountingSettingsService;
