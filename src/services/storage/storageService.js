/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STORAGE SERVICE - COMPLETE DATA MANAGEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Manages all accounting data in phone storage
 * 
 * Storage Structure:
 * /storage/emulated/0/MindStack/
 * ├── Data/
 * │   ├── journal.json
 * │   ├── ledger.json
 * │   ├── subsidiaryBooks.json
 * │   ├── settings.json
 * │   └── backup/
 * ├── PDFs/
 * │   ├── JournalBook_*.pdf
 * │   ├── Ledger_*.pdf
 * │   └── SubsidiaryBooks_*.pdf
 * └── Exports/
 *     ├── journal_export_*.csv
 *     └── ledger_export_*.csv
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform } from 'react-native';

export class StorageService {
  static BASE_DIR = `${RNFS.ExternalStorageDirectoryPath}/MindStack`;
  static DATA_DIR = `${this.BASE_DIR}/Data`;
  static BACKUP_DIR = `${this.DATA_DIR}/backup`;
  static PDF_DIR = `${this.BASE_DIR}/PDFs`;
  static EXPORT_DIR = `${this.BASE_DIR}/Exports`;

  static FILES = {
    JOURNAL: 'journal.json',
    LEDGER: 'ledger.json',
    SUBSIDIARY_BOOKS: 'subsidiaryBooks.json',
    SETTINGS: 'settings.json',
    ACCOUNTS: 'accounts.json',
    VOUCHER_COUNTER: 'voucherCounter.json'
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * REQUEST STORAGE PERMISSION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async requestStoragePermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);
        
        return (
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * INITIALIZE STORAGE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async initialize() {
    try {
      // Request permission
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Storage permission denied'
        };
      }

      // Create directories
      const dirs = [this.BASE_DIR, this.DATA_DIR, this.BACKUP_DIR, this.PDF_DIR, this.EXPORT_DIR];
      
      for (const dir of dirs) {
        const exists = await RNFS.exists(dir);
        if (!exists) {
          await RNFS.mkdir(dir);
        }
      }

      // Initialize data files if they don't exist
      for (const [key, fileName] of Object.entries(this.FILES)) {
        const filePath = `${this.DATA_DIR}/${fileName}`;
        const exists = await RNFS.exists(filePath);
        
        if (!exists) {
          let initialData = {};
          
          if (key === 'JOURNAL') {
            initialData = { entries: [], lastUpdated: new Date().toISOString() };
          } else if (key === 'LEDGER') {
            initialData = { accounts: {}, lastUpdated: new Date().toISOString() };
          } else if (key === 'SUBSIDIARY_BOOKS') {
            initialData = {
              purchaseBook: [],
              salesBook: [],
              purchaseReturnBook: [],
              salesReturnBook: [],
              cashBook: [],
              bankBook: [],
              pettyCashBook: [],
              billsReceivableBook: [],
              billsPayableBook: [],
              lastUpdated: new Date().toISOString()
            };
          } else if (key === 'VOUCHER_COUNTER') {
            initialData = {
              SALES: 0,
              PURCHASE: 0,
              PAYMENT: 0,
              RECEIPT: 0,
              CONTRA: 0,
              JOURNAL: 0,
              DEBIT_NOTE: 0,
              CREDIT_NOTE: 0
            };
          }
          
          await RNFS.writeFile(filePath, JSON.stringify(initialData, null, 2), 'utf8');
        }
      }

      return {
        success: true,
        message: 'Storage initialized successfully',
        paths: {
          base: this.BASE_DIR,
          data: this.DATA_DIR,
          backup: this.BACKUP_DIR,
          pdf: this.PDF_DIR,
          export: this.EXPORT_DIR
        }
      };
    } catch (error) {
      console.error('Initialize storage error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * READ DATA FILE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async readDataFile(fileName) {
    try {
      const filePath = `${this.DATA_DIR}/${fileName}`;
      const exists = await RNFS.exists(filePath);
      
      if (!exists) {
        return {
          success: false,
          error: 'File not found',
          data: null
        };
      }

      const content = await RNFS.readFile(filePath, 'utf8');
      const data = JSON.parse(content);

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Read data file error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * WRITE DATA FILE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async writeDataFile(fileName, data) {
    try {
      const filePath = `${this.DATA_DIR}/${fileName}`;
      
      // Add lastUpdated timestamp
      data.lastUpdated = new Date().toISOString();
      
      await RNFS.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

      return {
        success: true,
        message: 'Data saved successfully',
        filePath: filePath
      };
    } catch (error) {
      console.error('Write data file error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SAVE JOURNAL ENTRY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async saveJournalEntry(entry) {
    try {
      const result = await this.readDataFile(this.FILES.JOURNAL);
      const data = result.data || { entries: [] };
      
      data.entries.push(entry);
      
      return await this.writeDataFile(this.FILES.JOURNAL, data);
    } catch (error) {
      console.error('Save journal entry error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET JOURNAL ENTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getJournalEntries(filters = {}) {
    try {
      const result = await this.readDataFile(this.FILES.JOURNAL);
      if (!result.success) return result;

      let entries = result.data.entries || [];

      // Apply filters
      if (filters.fromDate) {
        entries = entries.filter(e => new Date(e.date) >= new Date(filters.fromDate));
      }
      if (filters.toDate) {
        entries = entries.filter(e => new Date(e.date) <= new Date(filters.toDate));
      }
      if (filters.voucherType) {
        entries = entries.filter(e => e.voucherType === filters.voucherType);
      }

      return {
        success: true,
        data: entries,
        count: entries.length
      };
    } catch (error) {
      console.error('Get journal entries error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE LEDGER
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateLedger(accountCode, entry) {
    try {
      const result = await this.readDataFile(this.FILES.LEDGER);
      const data = result.data || { accounts: {} };
      
      if (!data.accounts[accountCode]) {
        data.accounts[accountCode] = {
          accountCode: accountCode,
          accountName: entry.accountName,
          entries: [],
          balance: 0,
          balanceType: 'Dr'
        };
      }

      data.accounts[accountCode].entries.push(entry);
      
      // Calculate balance
      const account = data.accounts[accountCode];
      let balance = 0;
      account.entries.forEach(e => {
        balance += parseFloat(e.debit || 0) - parseFloat(e.credit || 0);
      });
      
      account.balance = Math.abs(balance);
      account.balanceType = balance >= 0 ? 'Dr' : 'Cr';

      return await this.writeDataFile(this.FILES.LEDGER, data);
    } catch (error) {
      console.error('Update ledger error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET LEDGER ACCOUNT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getLedgerAccount(accountCode) {
    try {
      const result = await this.readDataFile(this.FILES.LEDGER);
      if (!result.success) return result;

      const account = result.data.accounts[accountCode];
      
      if (!account) {
        return {
          success: false,
          error: 'Account not found',
          data: null
        };
      }

      return {
        success: true,
        data: account
      };
    } catch (error) {
      console.error('Get ledger account error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL LEDGER ACCOUNTS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAllLedgerAccounts() {
    try {
      const result = await this.readDataFile(this.FILES.LEDGER);
      if (!result.success) return result;

      const accounts = Object.values(result.data.accounts || {});

      return {
        success: true,
        data: accounts,
        count: accounts.length
      };
    } catch (error) {
      console.error('Get all ledger accounts error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SAVE TO SUBSIDIARY BOOK
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async saveToSubsidiaryBook(bookName, entry) {
    try {
      const result = await this.readDataFile(this.FILES.SUBSIDIARY_BOOKS);
      const data = result.data || {};
      
      if (!data[bookName]) {
        data[bookName] = [];
      }

      data[bookName].push(entry);

      return await this.writeDataFile(this.FILES.SUBSIDIARY_BOOKS, data);
    } catch (error) {
      console.error('Save to subsidiary book error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET SUBSIDIARY BOOK
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getSubsidiaryBook(bookName, filters = {}) {
    try {
      const result = await this.readDataFile(this.FILES.SUBSIDIARY_BOOKS);
      if (!result.success) return result;

      let entries = result.data[bookName] || [];

      // Apply filters
      if (filters.fromDate) {
        entries = entries.filter(e => new Date(e.date) >= new Date(filters.fromDate));
      }
      if (filters.toDate) {
        entries = entries.filter(e => new Date(e.date) <= new Date(filters.toDate));
      }

      return {
        success: true,
        data: entries,
        count: entries.length
      };
    } catch (error) {
      console.error('Get subsidiary book error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE BACKUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = `${this.BACKUP_DIR}/backup_${timestamp}`;
      
      await RNFS.mkdir(backupDir);

      // Copy all data files
      for (const fileName of Object.values(this.FILES)) {
        const sourcePath = `${this.DATA_DIR}/${fileName}`;
        const destPath = `${backupDir}/${fileName}`;
        
        const exists = await RNFS.exists(sourcePath);
        if (exists) {
          await RNFS.copyFile(sourcePath, destPath);
        }
      }

      return {
        success: true,
        message: 'Backup created successfully',
        backupPath: backupDir
      };
    } catch (error) {
      console.error('Create backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LIST BACKUPS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async listBackups() {
    try {
      const files = await RNFS.readDir(this.BACKUP_DIR);
      const backups = files
        .filter(file => file.isDirectory() && file.name.startsWith('backup_'))
        .map(file => ({
          name: file.name,
          path: file.path,
          date: file.mtime
        }))
        .sort((a, b) => b.date - a.date);

      return {
        success: true,
        data: backups,
        count: backups.length
      };
    } catch (error) {
      console.error('List backups error:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * RESTORE BACKUP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async restoreBackup(backupPath) {
    try {
      // Copy all files from backup to data directory
      for (const fileName of Object.values(this.FILES)) {
        const sourcePath = `${backupPath}/${fileName}`;
        const destPath = `${this.DATA_DIR}/${fileName}`;
        
        const exists = await RNFS.exists(sourcePath);
        if (exists) {
          await RNFS.copyFile(sourcePath, destPath);
        }
      }

      return {
        success: true,
        message: 'Backup restored successfully'
      };
    } catch (error) {
      console.error('Restore backup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET STORAGE INFO
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getStorageInfo() {
    try {
      const info = {
        basePath: this.BASE_DIR,
        dataPath: this.DATA_DIR,
        pdfPath: this.PDF_DIR,
        exportPath: this.EXPORT_DIR,
        backupPath: this.BACKUP_DIR,
        files: {}
      };

      // Get file sizes
      for (const [key, fileName] of Object.entries(this.FILES)) {
        const filePath = `${this.DATA_DIR}/${fileName}`;
        const exists = await RNFS.exists(filePath);
        
        if (exists) {
          const stat = await RNFS.stat(filePath);
          info.files[key] = {
            name: fileName,
            size: stat.size,
            modified: stat.mtime
          };
        }
      }

      // Count PDFs
      const pdfFiles = await RNFS.readDir(this.PDF_DIR);
      info.pdfCount = pdfFiles.filter(f => f.name.endsWith('.pdf')).length;

      // Count backups
      const backupFiles = await RNFS.readDir(this.BACKUP_DIR);
      info.backupCount = backupFiles.filter(f => f.isDirectory()).length;

      return {
        success: true,
        data: info
      };
    } catch (error) {
      console.error('Get storage info error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CLEAR ALL DATA (DANGEROUS!)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async clearAllData() {
    try {
      // Create backup before clearing
      await this.createBackup();

      // Clear all data files
      for (const fileName of Object.values(this.FILES)) {
        const filePath = `${this.DATA_DIR}/${fileName}`;
        const exists = await RNFS.exists(filePath);
        
        if (exists) {
          await RNFS.unlink(filePath);
        }
      }

      // Reinitialize
      await this.initialize();

      return {
        success: true,
        message: 'All data cleared successfully (backup created)'
      };
    } catch (error) {
      console.error('Clear all data error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default StorageService;
