/**
 * FILE UPLOAD SERVICE
 * Handle photo, PDF, and document uploads
 * 
 * Features:
 * - Image upload (JPG, PNG, HEIC)
 * - PDF upload
 * - Document upload (Excel, Word)
 * - OCR for invoice extraction
 * - File compression
 * - Cloud storage integration
 * - Offline queue
 */

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { getDatabase } from '../database/schema';
import offlineSyncService from '../offline/syncService';

/**
 * FILE TYPES
 */
export const FILE_TYPES = {
  IMAGE: 'IMAGE',
  PDF: 'PDF',
  EXCEL: 'EXCEL',
  WORD: 'WORD',
  OTHER: 'OTHER'
};

/**
 * UPLOAD PURPOSES
 */
export const UPLOAD_PURPOSES = {
  INVOICE: 'INVOICE',
  RECEIPT: 'RECEIPT',
  BILL: 'BILL',
  BANK_STATEMENT: 'BANK_STATEMENT',
  GST_DOCUMENT: 'GST_DOCUMENT',
  TDS_CERTIFICATE: 'TDS_CERTIFICATE',
  IDENTITY_PROOF: 'IDENTITY_PROOF',
  ADDRESS_PROOF: 'ADDRESS_PROOF',
  OTHER: 'OTHER'
};

/**
 * File Upload Service
 */
class FileUploadService {
  constructor() {
    this.uploadDir = `${FileSystem.documentDirectory}uploads/`;
    this.maxFileSize = 10 * 1024 * 1024; // 10 MB
    this.maxImageSize = 5 * 1024 * 1024; // 5 MB
  }

  /**
   * Initialize upload directory
   */
  async initUploadDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(this.uploadDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.uploadDir, { intermediates: true });
    }
  }

  /**
   * Pick image from camera or gallery
   */
  async pickImage(source = 'gallery') {
    // Request permissions
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera permission denied');
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Gallery permission denied');
      }
    }

    // Pick image
    const result = source === 'camera' 
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          exif: true
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          exif: true
        });

    if (result.canceled) {
      return null;
    }

    return result.assets[0];
  }

  /**
   * Pick document (PDF, Excel, Word)
   */
  async pickDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.ms-excel', 
             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
             'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true
    });

    if (result.type === 'cancel') {
      return null;
    }

    return result;
  }

  /**
   * Upload file
   */
  async uploadFile(params) {
    const {
      fileUri,
      fileName,
      fileType,
      purpose,
      metadata = {},
      userId
    } = params;

    await this.initUploadDirectory();

    try {
      // Validate file
      const validation = await this.validateFile(fileUri, fileType);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Compress if image
      let processedUri = fileUri;
      if (fileType === FILE_TYPES.IMAGE) {
        processedUri = await this.compressImage(fileUri);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = this.getFileExtension(fileName);
      const uniqueFileName = `${timestamp}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
      const destinationUri = `${this.uploadDir}${uniqueFileName}`;

      // Copy file to upload directory
      await FileSystem.copyAsync({
        from: processedUri,
        to: destinationUri
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(destinationUri);

      // Save to database
      const fileId = await this.saveFileRecord({
        fileName: uniqueFileName,
        originalName: fileName,
        fileUri: destinationUri,
        fileType,
        fileSize: fileInfo.size,
        purpose,
        metadata,
        userId
      });

      // Add to sync queue for cloud upload
      await offlineSyncService.addToQueue({
        operationType: 'CREATE',
        entityType: 'file_upload',
        entityId: fileId,
        data: {
          fileId,
          fileName: uniqueFileName,
          fileUri: destinationUri,
          purpose
        }
      });

      // Extract data if invoice/receipt
      let extractedData = null;
      if (purpose === UPLOAD_PURPOSES.INVOICE || purpose === UPLOAD_PURPOSES.RECEIPT) {
        extractedData = await this.extractInvoiceData(destinationUri, fileType);
      }

      return {
        success: true,
        fileId,
        fileName: uniqueFileName,
        fileUri: destinationUri,
        fileSize: fileInfo.size,
        extractedData
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Compress image
   */
  async compressImage(uri) {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }], // Max width 1920px
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    return manipResult.uri;
  }

  /**
   * Validate file
   */
  async validateFile(uri, fileType) {
    const fileInfo = await FileSystem.getInfoAsync(uri);

    if (!fileInfo.exists) {
      return { valid: false, error: 'File does not exist' };
    }

    // Check file size
    const maxSize = fileType === FILE_TYPES.IMAGE ? this.maxImageSize : this.maxFileSize;
    if (fileInfo.size > maxSize) {
      return { 
        valid: false, 
        error: `File size exceeds ${maxSize / (1024 * 1024)} MB limit` 
      };
    }

    return { valid: true };
  }

  /**
   * Get file extension
   */
  getFileExtension(fileName) {
    return fileName.split('.').pop().toLowerCase();
  }

  /**
   * Determine file type from extension
   */
  determineFileType(fileName) {
    const extension = this.getFileExtension(fileName);
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'heic', 'webp'];
    const pdfExtensions = ['pdf'];
    const excelExtensions = ['xls', 'xlsx', 'csv'];
    const wordExtensions = ['doc', 'docx'];

    if (imageExtensions.includes(extension)) return FILE_TYPES.IMAGE;
    if (pdfExtensions.includes(extension)) return FILE_TYPES.PDF;
    if (excelExtensions.includes(extension)) return FILE_TYPES.EXCEL;
    if (wordExtensions.includes(extension)) return FILE_TYPES.WORD;
    
    return FILE_TYPES.OTHER;
  }

  /**
   * Save file record to database
   */
  async saveFileRecord(fileData) {
    const db = await getDatabase();
    
    const fileId = `FILE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.executeSql(
      `INSERT INTO uploaded_files (
        id, file_name, original_name, file_uri, file_type, 
        file_size, purpose, metadata, user_id, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fileId,
        fileData.fileName,
        fileData.originalName,
        fileData.fileUri,
        fileData.fileType,
        fileData.fileSize,
        fileData.purpose,
        JSON.stringify(fileData.metadata),
        fileData.userId,
        new Date().toISOString()
      ]
    );

    return fileId;
  }

  /**
   * Get uploaded files
   */
  async getUploadedFiles(filters = {}) {
    const db = await getDatabase();
    
    let query = 'SELECT * FROM uploaded_files WHERE 1=1';
    const params = [];

    if (filters.purpose) {
      query += ' AND purpose = ?';
      params.push(filters.purpose);
    }

    if (filters.fileType) {
      query += ' AND file_type = ?';
      params.push(filters.fileType);
    }

    if (filters.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }

    if (filters.fromDate) {
      query += ' AND uploaded_at >= ?';
      params.push(filters.fromDate);
    }

    if (filters.toDate) {
      query += ' AND uploaded_at <= ?';
      params.push(filters.toDate);
    }

    query += ' ORDER BY uploaded_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const result = await db.executeSql(query, params);
    
    const files = [];
    for (let i = 0; i < result.rows.length; i++) {
      const file = result.rows.item(i);
      file.metadata = JSON.parse(file.metadata || '{}');
      files.push(file);
    }

    return files;
  }

  /**
   * Delete file
   */
  async deleteFile(fileId) {
    const db = await getDatabase();
    
    // Get file info
    const result = await db.executeSql(
      'SELECT file_uri FROM uploaded_files WHERE id = ?',
      [fileId]
    );

    if (result.rows.length === 0) {
      throw new Error('File not found');
    }

    const fileUri = result.rows.item(0).file_uri;

    // Delete physical file
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri);
    }

    // Delete database record
    await db.executeSql(
      'DELETE FROM uploaded_files WHERE id = ?',
      [fileId]
    );

    return { success: true };
  }

  /**
   * Extract invoice data using OCR (placeholder)
   * In production, integrate with Google Vision API, AWS Textract, or similar
   */
  async extractInvoiceData(fileUri, fileType) {
    // This is a placeholder for OCR integration
    // In production, you would:
    // 1. Send image/PDF to OCR service
    // 2. Parse extracted text
    // 3. Identify invoice fields (number, date, amount, GST, etc.)
    // 4. Return structured data

    return {
      invoiceNumber: null,
      invoiceDate: null,
      vendorName: null,
      vendorGSTIN: null,
      totalAmount: null,
      taxableAmount: null,
      gstAmount: null,
      cgst: null,
      sgst: null,
      igst: null,
      items: [],
      confidence: 0,
      needsReview: true
    };
  }

  /**
   * Batch upload multiple files
   */
  async batchUpload(files) {
    const results = [];

    for (const file of files) {
      const result = await this.uploadFile(file);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: files.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get file statistics
   */
  async getFileStatistics(userId = null) {
    const db = await getDatabase();
    
    let query = `
      SELECT 
        file_type,
        purpose,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM uploaded_files
    `;

    const params = [];
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' GROUP BY file_type, purpose';

    const result = await db.executeSql(query, params);
    
    const stats = [];
    for (let i = 0; i < result.rows.length; i++) {
      stats.push(result.rows.item(i));
    }

    return stats;
  }

  /**
   * Clean up old files
   */
  async cleanupOldFiles(daysOld = 90) {
    const db = await getDatabase();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Get old files
    const result = await db.executeSql(
      'SELECT id, file_uri FROM uploaded_files WHERE uploaded_at < ?',
      [cutoffDate.toISOString()]
    );

    let deletedCount = 0;

    for (let i = 0; i < result.rows.length; i++) {
      const file = result.rows.item(i);
      
      try {
        await this.deleteFile(file.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete file ${file.id}:`, error);
      }
    }

    return {
      deletedCount,
      message: `Deleted ${deletedCount} old files`
    };
  }
}

/**
 * Create uploaded_files table
 */
export const createUploadedFilesTable = async (db) => {
  const query = `
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      purpose TEXT NOT NULL,
      metadata TEXT,
      user_id TEXT,
      uploaded_at DATETIME NOT NULL,
      synced_at DATETIME,
      cloud_url TEXT
    );
  `;
  await db.executeSql(query);
  
  // Create indexes
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_files_purpose ON uploaded_files(purpose);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_files_type ON uploaded_files(file_type);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_files_user ON uploaded_files(user_id);');
  await db.executeSql('CREATE INDEX IF NOT EXISTS idx_files_date ON uploaded_files(uploaded_at);');
};

// Create singleton instance
const fileUploadService = new FileUploadService();

export default fileUploadService;
export { FileUploadService };
