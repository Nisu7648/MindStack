/**
 * OFFLINE BACKUP & RESTORE SERVICE
 * Complete data backup and restore for offline application
 * 
 * Features:
 * - Full database backup
 * - Incremental backups
 * - Automatic scheduled backups
 * - Restore from backup
 * - Export to file
 * - Import from file
 * - Cloud sync (when online)
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '../database/schema';
import { zip, unzip } from 'react-native-zip-archive';

/**
 * BACKUP TYPES
 */
export const BACKUP_TYPES = {
  FULL: 'FULL',           // Complete database backup
  INCREMENTAL: 'INCREMENTAL', // Only changes since last backup
  SELECTIVE: 'SELECTIVE'  // Selected tables only
};

/**
 * BACKUP STATUS
 */
export const BACKUP_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

/**
 * Backup & Restore Service
 */
class BackupRestoreService {
  constructor() {
    this.backupDir = `${FileSystem.documentDirectory}backups/`;
    this.isBackingUp = false;
    this.isRestoring = false;
  }

  /**
   * Initialize backup directory
   */
  async initBackupDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(this.backupDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.backupDir, { intermediates: true });
    }
  }

  /**
   * Create full backup
   */
  async createFullBackup(options = {}) {
    if (this.isBackingUp) {
      throw new Error('Backup already in progress');
    }

    this.isBackingUp = true;

    try {
      await this.initBackupDirectory();

      const db = await getDatabase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup_${timestamp}`;
      const backupPath = `${this.backupDir}${backupId}`;

      // Create backup metadata
      const metadata = {
        id: backupId,
        type: BACKUP_TYPES.FULL,
        createdAt: new Date().toISOString(),
        version: '1.0',
        tables: [],
        recordCount: 0,
        size: 0
      };

      // Get all tables
      const tables = await this.getAllTables(db);
      
      const backupData = {};
      let totalRecords = 0;

      // Backup each table
      for (const table of tables) {
        const data = await this.backupTable(db, table);
        backupData[table] = data;
        totalRecords += data.length;
        
        metadata.tables.push({
          name: table,
          recordCount: data.length
        });
      }

      // Add metadata
      backupData._metadata = metadata;

      // Save to file
      const backupJson = JSON.stringify(backupData, null, 2);
      const backupFile = `${backupPath}.json`;
      
      await FileSystem.writeAsStringAsync(backupFile, backupJson);

      // Compress backup
      const zipFile = `${backupPath}.zip`;
      await zip(backupFile, zipFile);

      // Delete uncompressed file
      await FileSystem.deleteAsync(backupFile);

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(zipFile);
      metadata.size = fileInfo.size;
      metadata.recordCount = totalRecords;

      // Save backup record
      await this.saveBackupRecord(metadata);

      this.isBackingUp = false;

      return {
        success: true,
        backupId,
        backupPath: zipFile,
        metadata
      };

    } catch (error) {
      this.isBackingUp = false;
      throw error;
    }
  }

  /**
   * Create incremental backup
   */
  async createIncrementalBackup() {
    if (this.isBackingUp) {
      throw new Error('Backup already in progress');
    }

    this.isBackingUp = true;

    try {
      await this.initBackupDirectory();

      const db = await getDatabase();
      
      // Get last backup timestamp
      const lastBackup = await this.getLastBackup();
      const lastBackupTime = lastBackup ? lastBackup.createdAt : null;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup_incremental_${timestamp}`;
      const backupPath = `${this.backupDir}${backupId}`;

      const metadata = {
        id: backupId,
        type: BACKUP_TYPES.INCREMENTAL,
        createdAt: new Date().toISOString(),
        baseBackup: lastBackup?.id,
        version: '1.0',
        tables: [],
        recordCount: 0
      };

      const backupData = {};
      let totalRecords = 0;

      // Get all tables
      const tables = await this.getAllTables(db);

      // Backup only changed records
      for (const table of tables) {
        const data = await this.backupTableIncremental(db, table, lastBackupTime);
        
        if (data.length > 0) {
          backupData[table] = data;
          totalRecords += data.length;
          
          metadata.tables.push({
            name: table,
            recordCount: data.length
          });
        }
      }

      backupData._metadata = metadata;

      // Save to file
      const backupJson = JSON.stringify(backupData, null, 2);
      const backupFile = `${backupPath}.json`;
      
      await FileSystem.writeAsStringAsync(backupFile, backupJson);

      // Compress
      const zipFile = `${backupPath}.zip`;
      await zip(backupFile, zipFile);
      await FileSystem.deleteAsync(backupFile);

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(zipFile);
      metadata.size = fileInfo.size;
      metadata.recordCount = totalRecords;

      // Save backup record
      await this.saveBackupRecord(metadata);

      this.isBackingUp = false;

      return {
        success: true,
        backupId,
        backupPath: zipFile,
        metadata
      };

    } catch (error) {
      this.isBackingUp = false;
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId) {
    if (this.isRestoring) {
      throw new Error('Restore already in progress');
    }

    this.isRestoring = true;

    try {
      const db = await getDatabase();
      
      // Get backup file
      const backupPath = `${this.backupDir}${backupId}.zip`;
      const fileInfo = await FileSystem.getInfoAsync(backupPath);

      if (!fileInfo.exists) {
        throw new Error('Backup file not found');
      }

      // Extract backup
      const extractPath = `${this.backupDir}${backupId}_extract/`;
      await FileSystem.makeDirectoryAsync(extractPath, { intermediates: true });
      await unzip(backupPath, extractPath);

      // Read backup data
      const backupFile = `${extractPath}${backupId}.json`;
      const backupJson = await FileSystem.readAsStringAsync(backupFile);
      const backupData = JSON.parse(backupJson);

      const metadata = backupData._metadata;
      delete backupData._metadata;

      // Start transaction
      await db.transaction(async (tx) => {
        // Clear existing data (optional - can be configurable)
        for (const table of Object.keys(backupData)) {
          await tx.executeSql(`DELETE FROM ${table}`);
        }

        // Restore each table
        for (const [table, records] of Object.entries(backupData)) {
          await this.restoreTable(tx, table, records);
        }
      });

      // Clean up extracted files
      await FileSystem.deleteAsync(extractPath, { idempotent: true });

      this.isRestoring = false;

      return {
        success: true,
        message: 'Backup restored successfully',
        metadata
      };

    } catch (error) {
      this.isRestoring = false;
      throw error;
    }
  }

  /**
   * Export backup to share
   */
  async exportBackup(backupId) {
    const backupPath = `${this.backupDir}${backupId}.zip`;
    const fileInfo = await FileSystem.getInfoAsync(backupPath);

    if (!fileInfo.exists) {
      throw new Error('Backup file not found');
    }

    // Share file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(backupPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Export MindStack Backup'
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

    return { success: true };
  }

  /**
   * Import backup from file
   */
  async importBackup() {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/zip',
        copyToCacheDirectory: true
      });

      if (result.type === 'cancel') {
        return { success: false, message: 'Import cancelled' };
      }

      await this.initBackupDirectory();

      // Copy to backup directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `backup_imported_${timestamp}`;
      const backupPath = `${this.backupDir}${backupId}.zip`;

      await FileSystem.copyAsync({
        from: result.uri,
        to: backupPath
      });

      // Validate backup
      const isValid = await this.validateBackup(backupPath);

      if (!isValid) {
        await FileSystem.deleteAsync(backupPath);
        throw new Error('Invalid backup file');
      }

      return {
        success: true,
        backupId,
        message: 'Backup imported successfully'
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * List all backups
   */
  async listBackups() {
    await this.initBackupDirectory();

    const files = await FileSystem.readDirectoryAsync(this.backupDir);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const filePath = `${this.backupDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        backups.push({
          id: file.replace('.zip', ''),
          path: filePath,
          size: fileInfo.size,
          modificationTime: fileInfo.modificationTime
        });
      }
    }

    // Sort by modification time (newest first)
    backups.sort((a, b) => b.modificationTime - a.modificationTime);

    return backups;
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId) {
    const backupPath = `${this.backupDir}${backupId}.zip`;
    const fileInfo = await FileSystem.getInfoAsync(backupPath);

    if (!fileInfo.exists) {
      throw new Error('Backup file not found');
    }

    await FileSystem.deleteAsync(backupPath);

    // Remove from records
    await this.removeBackupRecord(backupId);

    return { success: true };
  }

  /**
   * Schedule automatic backup
   */
  async scheduleAutoBackup(intervalHours = 24) {
    const lastBackup = await AsyncStorage.getItem('@last_auto_backup');
    const now = Date.now();

    if (lastBackup) {
      const lastBackupTime = parseInt(lastBackup);
      const hoursSinceLastBackup = (now - lastBackupTime) / (1000 * 60 * 60);

      if (hoursSinceLastBackup < intervalHours) {
        console.log(`Next auto backup in ${intervalHours - hoursSinceLastBackup} hours`);
        return;
      }
    }

    // Create backup
    try {
      await this.createFullBackup();
      await AsyncStorage.setItem('@last_auto_backup', now.toString());
      console.log('Auto backup completed');
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  /**
   * Get all tables from database
   */
  async getAllTables(db) {
    const result = await db.executeSql(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    const tables = [];
    for (let i = 0; i < result.rows.length; i++) {
      tables.push(result.rows.item(i).name);
    }

    return tables;
  }

  /**
   * Backup single table
   */
  async backupTable(db, tableName) {
    const result = await db.executeSql(`SELECT * FROM ${tableName}`);
    
    const records = [];
    for (let i = 0; i < result.rows.length; i++) {
      records.push(result.rows.item(i));
    }

    return records;
  }

  /**
   * Backup table incrementally
   */
  async backupTableIncremental(db, tableName, sinceTimestamp) {
    if (!sinceTimestamp) {
      return this.backupTable(db, tableName);
    }

    // Check if table has timestamp column
    const hasTimestamp = await this.tableHasColumn(db, tableName, 'updated_at');

    if (!hasTimestamp) {
      return [];
    }

    const result = await db.executeSql(
      `SELECT * FROM ${tableName} WHERE updated_at > ?`,
      [sinceTimestamp]
    );

    const records = [];
    for (let i = 0; i < result.rows.length; i++) {
      records.push(result.rows.item(i));
    }

    return records;
  }

  /**
   * Restore single table
   */
  async restoreTable(tx, tableName, records) {
    if (records.length === 0) {
      return;
    }

    // Get column names from first record
    const columns = Object.keys(records[0]);
    const placeholders = columns.map(() => '?').join(', ');

    // Insert each record
    for (const record of records) {
      const values = columns.map(col => record[col]);
      
      await tx.executeSql(
        `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  /**
   * Check if table has column
   */
  async tableHasColumn(db, tableName, columnName) {
    const result = await db.executeSql(`PRAGMA table_info(${tableName})`);
    
    for (let i = 0; i < result.rows.length; i++) {
      if (result.rows.item(i).name === columnName) {
        return true;
      }
    }

    return false;
  }

  /**
   * Validate backup file
   */
  async validateBackup(backupPath) {
    try {
      // Extract to temp location
      const tempPath = `${this.backupDir}temp_validate/`;
      await FileSystem.makeDirectoryAsync(tempPath, { intermediates: true });
      await unzip(backupPath, tempPath);

      // Check for JSON file
      const files = await FileSystem.readDirectoryAsync(tempPath);
      const jsonFile = files.find(f => f.endsWith('.json'));

      if (!jsonFile) {
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
        return false;
      }

      // Read and validate JSON
      const jsonPath = `${tempPath}${jsonFile}`;
      const jsonContent = await FileSystem.readAsStringAsync(jsonPath);
      const data = JSON.parse(jsonContent);

      // Check for metadata
      if (!data._metadata) {
        await FileSystem.deleteAsync(tempPath, { idempotent: true });
        return false;
      }

      // Clean up
      await FileSystem.deleteAsync(tempPath, { idempotent: true });

      return true;

    } catch (error) {
      console.error('Backup validation error:', error);
      return false;
    }
  }

  /**
   * Save backup record
   */
  async saveBackupRecord(metadata) {
    const backups = await AsyncStorage.getItem('@backup_records');
    const records = backups ? JSON.parse(backups) : [];
    
    records.push(metadata);
    
    await AsyncStorage.setItem('@backup_records', JSON.stringify(records));
  }

  /**
   * Remove backup record
   */
  async removeBackupRecord(backupId) {
    const backups = await AsyncStorage.getItem('@backup_records');
    if (!backups) return;
    
    const records = JSON.parse(backups);
    const filtered = records.filter(r => r.id !== backupId);
    
    await AsyncStorage.setItem('@backup_records', JSON.stringify(filtered));
  }

  /**
   * Get last backup
   */
  async getLastBackup() {
    const backups = await AsyncStorage.getItem('@backup_records');
    if (!backups) return null;
    
    const records = JSON.parse(backups);
    if (records.length === 0) return null;
    
    // Sort by creation time
    records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return records[0];
  }

  /**
   * Get backup statistics
   */
  async getBackupStats() {
    const backups = await this.listBackups();
    const records = await AsyncStorage.getItem('@backup_records');
    const metadata = records ? JSON.parse(records) : [];

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const lastBackup = backups.length > 0 ? backups[0] : null;

    return {
      totalBackups: backups.length,
      totalSize,
      lastBackup,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1] : null,
      fullBackups: metadata.filter(m => m.type === BACKUP_TYPES.FULL).length,
      incrementalBackups: metadata.filter(m => m.type === BACKUP_TYPES.INCREMENTAL).length
    };
  }
}

// Create singleton instance
const backupRestoreService = new BackupRestoreService();

export default backupRestoreService;
export { BackupRestoreService };
