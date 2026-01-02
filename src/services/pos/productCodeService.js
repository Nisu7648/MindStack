/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCT CODE SERVICE - NUMERIC CODES FOR ITEMS WITHOUT BARCODES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * FEATURES:
 * - Auto-generate unique numeric codes (4-6 digits)
 * - Manual code assignment
 * - Code validation
 * - Quick lookup by code
 * - Code printing on labels
 * - Bulk code generation
 * 
 * EXAMPLES:
 * - Cheese: 1001
 * - Milk: 1002
 * - Bread: 1003
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import DatabaseService from '../database/databaseService';

export class ProductCodeService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE UNIQUE NUMERIC CODE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generateUniqueCode(category = null) {
    try {
      const db = await DatabaseService.getDatabase();

      // Get category prefix (optional)
      let prefix = '1'; // Default prefix
      
      if (category) {
        // Category-based prefixes
        const categoryPrefixes = {
          'DAIRY': '10',
          'BAKERY': '20',
          'GROCERY': '30',
          'VEGETABLES': '40',
          'FRUITS': '50',
          'BEVERAGES': '60',
          'SNACKS': '70',
          'PERSONAL_CARE': '80',
          'HOUSEHOLD': '90'
        };
        
        prefix = categoryPrefixes[category.toUpperCase()] || '1';
      }

      // Find next available code
      let code = null;
      let attempts = 0;
      const maxAttempts = 1000;

      while (!code && attempts < maxAttempts) {
        // Generate random 2-4 digit suffix
        const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const testCode = prefix + suffix;

        // Check if code exists
        const [result] = await db.executeSql(
          'SELECT id FROM products WHERE sku = ? OR barcode = ?',
          [testCode, testCode]
        );

        if (result.rows.length === 0) {
          code = testCode;
        }

        attempts++;
      }

      if (!code) {
        return { 
          success: false, 
          error: 'Could not generate unique code. Please try again.' 
        };
      }

      return { success: true, code };
    } catch (error) {
      console.error('Generate unique code error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ASSIGN CODE TO PRODUCT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async assignCodeToProduct(productId, code, codeType = 'sku') {
    try {
      const db = await DatabaseService.getDatabase();

      // Validate code (numeric only, 4-6 digits)
      if (!/^\d{4,6}$/.test(code)) {
        return { 
          success: false, 
          error: 'Code must be 4-6 digits numeric only' 
        };
      }

      // Check if code already exists
      const [existing] = await db.executeSql(
        'SELECT id, product_name FROM products WHERE (sku = ? OR barcode = ?) AND id != ?',
        [code, code, productId]
      );

      if (existing.rows.length > 0) {
        const existingProduct = existing.rows.item(0);
        return { 
          success: false, 
          error: `Code already assigned to: ${existingProduct.product_name}` 
        };
      }

      // Assign code
      const field = codeType === 'barcode' ? 'barcode' : 'sku';
      
      await db.executeSql(
        `UPDATE products SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [code, productId]
      );

      // Update barcode cache
      const [product] = await db.executeSql(
        'SELECT * FROM products WHERE id = ?',
        [productId]
      );

      if (product.rows.length > 0) {
        const prod = product.rows.item(0);
        
        await db.executeSql(
          `INSERT OR REPLACE INTO barcode_cache 
           (barcode, product_id, product_name, selling_price, gst_percentage) 
           VALUES (?, ?, ?, ?, ?)`,
          [code, productId, prod.product_name, prod.selling_price, prod.gst_percentage]
        );
      }

      return { 
        success: true, 
        message: `Code ${code} assigned successfully` 
      };
    } catch (error) {
      console.error('Assign code error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOOKUP PRODUCT BY CODE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async lookupByCode(code) {
    try {
      const db = await DatabaseService.getDatabase();

      // Try barcode cache first (fastest)
      const [cacheResult] = await db.executeSql(
        'SELECT * FROM barcode_cache WHERE barcode = ?',
        [code]
      );

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows.item(0);
        
        // Update last scanned
        await db.executeSql(
          'UPDATE barcode_cache SET last_scanned = CURRENT_TIMESTAMP WHERE barcode = ?',
          [code]
        );

        // Get full product details
        const [productResult] = await db.executeSql(
          'SELECT * FROM products WHERE id = ?',
          [cached.product_id]
        );

        if (productResult.rows.length > 0) {
          return { 
            success: true, 
            product: productResult.rows.item(0),
            fromCache: true
          };
        }
      }

      // Search in products table
      const [result] = await db.executeSql(
        'SELECT * FROM products WHERE (sku = ? OR barcode = ?) AND is_active = 1',
        [code, code]
      );

      if (result.rows.length === 0) {
        return { 
          success: false, 
          error: 'Product not found with this code' 
        };
      }

      const product = result.rows.item(0);

      // Add to cache for future lookups
      await db.executeSql(
        `INSERT OR REPLACE INTO barcode_cache 
         (barcode, product_id, product_name, selling_price, gst_percentage) 
         VALUES (?, ?, ?, ?, ?)`,
        [code, product.id, product.product_name, product.selling_price, product.gst_percentage]
      );

      return { 
        success: true, 
        product,
        fromCache: false
      };
    } catch (error) {
      console.error('Lookup by code error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * BULK GENERATE CODES FOR PRODUCTS WITHOUT CODES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async bulkGenerateCodes() {
    try {
      const db = await DatabaseService.getDatabase();

      // Get products without SKU or barcode
      const [result] = await db.executeSql(
        'SELECT * FROM products WHERE (sku IS NULL OR sku = "") AND (barcode IS NULL OR barcode = "") AND is_active = 1'
      );

      if (result.rows.length === 0) {
        return { 
          success: true, 
          message: 'All products already have codes',
          count: 0
        };
      }

      let successCount = 0;
      const errors = [];

      for (let i = 0; i < result.rows.length; i++) {
        const product = result.rows.item(i);
        
        // Generate code
        const codeResult = await this.generateUniqueCode(product.category);
        
        if (codeResult.success) {
          // Assign code
          const assignResult = await this.assignCodeToProduct(
            product.id, 
            codeResult.code, 
            'sku'
          );
          
          if (assignResult.success) {
            successCount++;
          } else {
            errors.push({
              product: product.product_name,
              error: assignResult.error
            });
          }
        } else {
          errors.push({
            product: product.product_name,
            error: codeResult.error
          });
        }
      }

      return {
        success: true,
        message: `Generated codes for ${successCount} products`,
        count: successCount,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      console.error('Bulk generate codes error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET PRODUCTS WITHOUT CODES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getProductsWithoutCodes() {
    try {
      const db = await DatabaseService.getDatabase();

      const [result] = await db.executeSql(
        `SELECT id, product_name, category, selling_price 
         FROM products 
         WHERE (sku IS NULL OR sku = "") 
         AND (barcode IS NULL OR barcode = "") 
         AND is_active = 1 
         ORDER BY product_name`
      );

      const products = [];
      for (let i = 0; i < result.rows.length; i++) {
        products.push(result.rows.item(i));
      }

      return { 
        success: true, 
        products,
        count: products.length
      };
    } catch (error) {
      console.error('Get products without codes error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * VALIDATE CODE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static validateCode(code) {
    // Must be 4-6 digits numeric
    if (!/^\d{4,6}$/.test(code)) {
      return {
        valid: false,
        error: 'Code must be 4-6 digits numeric only'
      };
    }

    return { valid: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PRINT CODE LABEL (FOR THERMAL PRINTER)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static generateCodeLabel(product, code) {
    // Generate label text for thermal printer
    return {
      productName: product.product_name,
      code: code,
      price: `₹${product.selling_price}`,
      barcode: code // Can be used to print barcode
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET NEXT AVAILABLE CODE IN CATEGORY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getNextCodeInCategory(category) {
    try {
      const db = await DatabaseService.getDatabase();

      // Category prefixes
      const categoryPrefixes = {
        'DAIRY': '10',
        'BAKERY': '20',
        'GROCERY': '30',
        'VEGETABLES': '40',
        'FRUITS': '50',
        'BEVERAGES': '60',
        'SNACKS': '70',
        'PERSONAL_CARE': '80',
        'HOUSEHOLD': '90'
      };

      const prefix = categoryPrefixes[category?.toUpperCase()] || '1';

      // Get highest code with this prefix
      const [result] = await db.executeSql(
        `SELECT MAX(CAST(sku AS INTEGER)) as max_code 
         FROM products 
         WHERE sku LIKE '${prefix}%'`
      );

      let nextCode = prefix + '0001';

      if (result.rows.length > 0 && result.rows.item(0).max_code) {
        const maxCode = result.rows.item(0).max_code;
        const nextNum = parseInt(maxCode) + 1;
        nextCode = nextNum.toString();
      }

      return { success: true, code: nextCode };
    } catch (error) {
      console.error('Get next code error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SEARCH PRODUCTS BY CODE PREFIX
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async searchByCodePrefix(prefix) {
    try {
      const db = await DatabaseService.getDatabase();

      const [result] = await db.executeSql(
        `SELECT * FROM products 
         WHERE (sku LIKE ? OR barcode LIKE ?) 
         AND is_active = 1 
         ORDER BY sku, barcode 
         LIMIT 20`,
        [`${prefix}%`, `${prefix}%`]
      );

      const products = [];
      for (let i = 0; i < result.rows.length; i++) {
        products.push(result.rows.item(i));
      }

      return { success: true, products };
    } catch (error) {
      console.error('Search by code prefix error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ProductCodeService;
