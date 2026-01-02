/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PRODUCT MANAGEMENT SERVICE - STRICT RULES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PRODUCT RULES (NON-NEGOTIABLE):
 * 1. Unique product name (no duplicates)
 * 2. SKU/Barcode unique if provided
 * 3. Unit LOCKED after first sale
 * 4. No negative stock allowed
 * 5. Price changes logged in audit
 * 6. Stock movements tracked
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import DatabaseService from '../database/databaseService';
import moment from 'moment';

export class ProductService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * ADD NEW PRODUCT (STRICT VALIDATION)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async addProduct(productData, userId) {
    try {
      const db = await DatabaseService.getDatabase();

      // Validate required fields
      if (!productData.product_name || !productData.unit || 
          productData.selling_price === undefined || productData.purchase_price === undefined) {
        return { 
          success: false, 
          error: 'Product name, unit, and prices are required' 
        };
      }

      // Check duplicate product name
      const [nameCheck] = await db.executeSql(
        'SELECT id FROM products WHERE LOWER(product_name) = LOWER(?)',
        [productData.product_name]
      );

      if (nameCheck.rows.length > 0) {
        return { 
          success: false, 
          error: 'Product with this name already exists' 
        };
      }

      // Check duplicate SKU if provided
      if (productData.sku) {
        const [skuCheck] = await db.executeSql(
          'SELECT id FROM products WHERE sku = ?',
          [productData.sku]
        );

        if (skuCheck.rows.length > 0) {
          return { 
            success: false, 
            error: 'Product with this SKU already exists' 
          };
        }
      }

      // Check duplicate barcode if provided
      if (productData.barcode) {
        const [barcodeCheck] = await db.executeSql(
          'SELECT id FROM products WHERE barcode = ?',
          [productData.barcode]
        );

        if (barcodeCheck.rows.length > 0) {
          return { 
            success: false, 
            error: 'Product with this barcode already exists' 
          };
        }
      }

      // Insert product
      const [result] = await db.executeSql(
        `INSERT INTO products 
        (product_name, sku, barcode, unit, purchase_price, selling_price, mrp, 
         gst_percentage, hsn_code, minimum_stock_level, current_stock, 
         category, brand, description, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productData.product_name,
          productData.sku || null,
          productData.barcode || null,
          productData.unit,
          productData.purchase_price,
          productData.selling_price,
          productData.mrp || productData.selling_price,
          productData.gst_percentage || 0,
          productData.hsn_code || null,
          productData.minimum_stock_level || 0,
          productData.current_stock || 0,
          productData.category || null,
          productData.brand || null,
          productData.description || null,
          userId
        ]
      );

      const productId = result.insertId;

      // If opening stock provided, create stock movement
      if (productData.current_stock && productData.current_stock > 0) {
        await db.executeSql(
          `INSERT INTO stock_movements 
          (product_id, movement_type, quantity, previous_stock, new_stock, 
           reference_type, remarks, created_by) 
          VALUES (?, 'OPENING', ?, 0, ?, 'OPENING_STOCK', 'Opening stock', ?)`,
          [productId, productData.current_stock, productData.current_stock, userId]
        );
      }

      // Add to barcode cache if barcode exists
      if (productData.barcode) {
        await db.executeSql(
          `INSERT INTO barcode_cache (barcode, product_id, product_name, selling_price, gst_percentage) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            productData.barcode,
            productId,
            productData.product_name,
            productData.selling_price,
            productData.gst_percentage || 0
          ]
        );
      }

      // Audit log
      await this.logAudit('CREATE', 'products', productId, null, JSON.stringify(productData), userId);

      return { 
        success: true, 
        productId,
        message: 'Product added successfully' 
      };
    } catch (error) {
      console.error('Add product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE PRODUCT (WITH RESTRICTIONS)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateProduct(productId, updates, userId, userRole) {
    try {
      const db = await DatabaseService.getDatabase();

      // Get current product
      const [result] = await db.executeSql(
        'SELECT * FROM products WHERE id = ?',
        [productId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Product not found' };
      }

      const currentProduct = result.rows.item(0);

      // Check if unit is locked
      if (updates.unit && currentProduct.unit_locked) {
        return { 
          success: false, 
          error: 'Unit cannot be changed after first sale' 
        };
      }

      // Check price override permission
      if ((updates.selling_price || updates.purchase_price) && userRole !== 'OWNER') {
        return { 
          success: false, 
          error: 'Only owner can change prices' 
        };
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];

      const allowedFields = [
        'product_name', 'sku', 'barcode', 'unit', 'purchase_price', 
        'selling_price', 'mrp', 'gst_percentage', 'hsn_code', 
        'minimum_stock_level', 'category', 'brand', 'description'
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updates[field]);
        }
      }

      if (updateFields.length === 0) {
        return { success: false, error: 'No fields to update' };
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(productId);

      await db.executeSql(
        `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Update barcode cache if barcode changed
      if (updates.barcode) {
        await db.executeSql(
          `INSERT OR REPLACE INTO barcode_cache 
           (barcode, product_id, product_name, selling_price, gst_percentage) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            updates.barcode,
            productId,
            updates.product_name || currentProduct.product_name,
            updates.selling_price || currentProduct.selling_price,
            updates.gst_percentage || currentProduct.gst_percentage
          ]
        );
      }

      // Audit log
      await this.logAudit(
        'UPDATE', 
        'products', 
        productId, 
        JSON.stringify(currentProduct), 
        JSON.stringify(updates), 
        userId
      );

      return { 
        success: true, 
        message: 'Product updated successfully' 
      };
    } catch (error) {
      console.error('Update product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET PRODUCT BY ID/BARCODE/SKU
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getProduct(identifier, identifierType = 'id') {
    try {
      const db = await DatabaseService.getDatabase();

      let query = 'SELECT * FROM products WHERE ';
      let param;

      switch (identifierType) {
        case 'barcode':
          // Check cache first for speed
          const [cacheResult] = await db.executeSql(
            'SELECT * FROM barcode_cache WHERE barcode = ?',
            [identifier]
          );

          if (cacheResult.rows.length > 0) {
            const cached = cacheResult.rows.item(0);
            // Update last scanned
            await db.executeSql(
              'UPDATE barcode_cache SET last_scanned = CURRENT_TIMESTAMP WHERE barcode = ?',
              [identifier]
            );
            return { success: true, product: cached, fromCache: true };
          }

          query += 'barcode = ?';
          param = identifier;
          break;
        case 'sku':
          query += 'sku = ?';
          param = identifier;
          break;
        default:
          query += 'id = ?';
          param = identifier;
      }

      const [result] = await db.executeSql(query, [param]);

      if (result.rows.length === 0) {
        return { success: false, error: 'Product not found' };
      }

      return { 
        success: true, 
        product: result.rows.item(0),
        fromCache: false
      };
    } catch (error) {
      console.error('Get product error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SEARCH PRODUCTS (FAST LOOKUP)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async searchProducts(searchTerm, limit = 20) {
    try {
      const db = await DatabaseService.getDatabase();

      const [result] = await db.executeSql(
        `SELECT id, product_name, sku, barcode, unit, selling_price, 
                current_stock, gst_percentage, minimum_stock_level
         FROM products 
         WHERE is_active = 1 
         AND (LOWER(product_name) LIKE LOWER(?) 
              OR LOWER(sku) LIKE LOWER(?) 
              OR barcode LIKE ?)
         ORDER BY product_name
         LIMIT ?`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
      );

      const products = [];
      for (let i = 0; i < result.rows.length; i++) {
        products.push(result.rows.item(i));
      }

      return { success: true, products };
    } catch (error) {
      console.error('Search products error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL PRODUCTS WITH FILTERS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getAllProducts(filters = {}) {
    try {
      const db = await DatabaseService.getDatabase();

      let query = 'SELECT * FROM products WHERE 1=1';
      const params = [];

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters.brand) {
        query += ' AND brand = ?';
        params.push(filters.brand);
      }

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active ? 1 : 0);
      }

      if (filters.low_stock) {
        query += ' AND current_stock <= minimum_stock_level';
      }

      if (filters.out_of_stock) {
        query += ' AND current_stock = 0';
      }

      query += ' ORDER BY product_name';

      const [result] = await db.executeSql(query, params);

      const products = [];
      for (let i = 0; i < result.rows.length; i++) {
        const product = result.rows.item(i);
        
        // Add stock status
        product.stock_status = this.getStockStatus(
          product.current_stock, 
          product.minimum_stock_level
        );
        
        products.push(product);
      }

      return { success: true, products, count: products.length };
    } catch (error) {
      console.error('Get all products error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UPDATE STOCK (WITH VALIDATION)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async updateStock(productId, quantity, movementType, referenceType, referenceId, userId) {
    try {
      const db = await DatabaseService.getDatabase();

      // Get current product
      const productResult = await this.getProduct(productId);
      if (!productResult.success) {
        return productResult;
      }

      const product = productResult.product;
      const previousStock = product.current_stock;
      let newStock = previousStock;

      // Calculate new stock based on movement type
      switch (movementType) {
        case 'SALE':
        case 'RETURN_OUT':
          newStock = previousStock - quantity;
          break;
        case 'PURCHASE':
        case 'RETURN_IN':
        case 'ADJUSTMENT':
          newStock = previousStock + quantity;
          break;
      }

      // Validate no negative stock
      if (newStock < 0) {
        return { 
          success: false, 
          error: 'Insufficient stock. Cannot go negative.' 
        };
      }

      // Update product stock
      await db.executeSql(
        'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStock, productId]
      );

      // Record stock movement
      await db.executeSql(
        `INSERT INTO stock_movements 
        (product_id, movement_type, quantity, previous_stock, new_stock, 
         reference_type, reference_id, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, movementType, quantity, previousStock, newStock, referenceType, referenceId, userId]
      );

      // Check for low stock alert
      if (newStock <= product.minimum_stock_level) {
        await this.createInventoryAlert(productId, 'LOW_STOCK', newStock, product.minimum_stock_level);
      }

      return { 
        success: true, 
        previousStock, 
        newStock,
        message: 'Stock updated successfully' 
      };
    } catch (error) {
      console.error('Update stock error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET STOCK STATUS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getStockStatus(currentStock, minimumStock) {
    if (currentStock === 0) {
      return { status: 'OUT_OF_STOCK', color: '#F44336', label: 'Out of Stock' };
    } else if (currentStock <= minimumStock) {
      return { status: 'LOW_STOCK', color: '#FF9800', label: 'Low Stock' };
    } else {
      return { status: 'HEALTHY', color: '#4CAF50', label: 'Healthy' };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CREATE INVENTORY ALERT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async createInventoryAlert(productId, alertType, currentStock, minimumStock) {
    try {
      const db = await DatabaseService.getDatabase();

      // Check if alert already exists and not resolved
      const [existing] = await db.executeSql(
        `SELECT id FROM inventory_alerts 
         WHERE product_id = ? AND alert_type = ? AND is_resolved = 0`,
        [productId, alertType]
      );

      if (existing.rows.length === 0) {
        await db.executeSql(
          `INSERT INTO inventory_alerts 
          (product_id, alert_type, current_stock, minimum_stock, alert_date) 
          VALUES (?, ?, ?, ?, DATE('now'))`,
          [productId, alertType, currentStock, minimumStock]
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Create inventory alert error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LOCK UNIT AFTER FIRST SALE
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async lockProductUnit(productId) {
    try {
      const db = await DatabaseService.getDatabase();

      await db.executeSql(
        'UPDATE products SET unit_locked = 1 WHERE id = ?',
        [productId]
      );

      return { success: true };
    } catch (error) {
      console.error('Lock product unit error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * AUDIT LOG
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async logAudit(actionType, tableName, recordId, oldValue, newValue, userId) {
    try {
      const db = await DatabaseService.getDatabase();

      await db.executeSql(
        `INSERT INTO audit_log 
        (action_type, table_name, record_id, old_value, new_value, user_id, user_role) 
        VALUES (?, ?, ?, ?, ?, ?, 'SYSTEM')`,
        [actionType, tableName, recordId.toString(), oldValue, newValue, userId]
      );

      return { success: true };
    } catch (error) {
      console.error('Audit log error:', error);
      return { success: false };
    }
  }
}

export default ProductService;
