/**
 * INVENTORY SCREEN - WEB VERSION
 * Product and stock management
 */

import React, { useState, useEffect } from 'react';
import './InventoryScreenWeb.css';
import inventoryEngine from '../../services/pos/inventoryEngine';
import integrationService from '../../services/integration/integrationService';

const InventoryScreenWeb = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // New product form
  const [newProduct, setNewProduct] = useState({
    item_name: '',
    barcode: '',
    unit: 'KG',
    purchase_price: '',
    selling_price: '',
    gst_rate: 0,
    current_stock: 0,
    min_stock_level: 10
  });

  // Stock adjustment
  const [adjustment, setAdjustment] = useState({
    quantity: 0,
    reason: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterStatus, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await inventoryEngine.getAllProducts();
      if (result.success) {
        setProducts(result.products);
      }
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.includes(searchQuery)
      );
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(p => {
        const stockStatus = getStockStatus(p);
        return stockStatus === filterStatus;
      });
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product) => {
    if (product.current_stock <= 0) return 'OUT_OF_STOCK';
    if (product.current_stock <= product.min_stock_level) return 'LOW_STOCK';
    if (product.current_stock <= product.min_stock_level * 2) return 'MEDIUM_STOCK';
    return 'GOOD_STOCK';
  };

  const getStockColor = (status) => {
    switch (status) {
      case 'OUT_OF_STOCK': return '#F44336';
      case 'LOW_STOCK': return '#FF9800';
      case 'MEDIUM_STOCK': return '#FFC107';
      case 'GOOD_STOCK': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const handleAddProduct = async () => {
    try {
      const result = await inventoryEngine.addProduct(newProduct);
      
      if (result.success) {
        alert('Product added successfully!');
        setShowAddModal(false);
        setNewProduct({
          item_name: '',
          barcode: '',
          unit: 'KG',
          purchase_price: '',
          selling_price: '',
          gst_rate: 0,
          current_stock: 0,
          min_stock_level: 10
        });
        loadProducts();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Add product error:', error);
      alert('Failed to add product');
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustment.reason) {
      alert('Please provide a reason for adjustment');
      return;
    }

    try {
      const result = await integrationService.adjustStock(
        selectedProduct.id,
        parseFloat(adjustment.quantity),
        adjustment.reason
      );

      if (result.success) {
        alert('Stock adjusted successfully!');
        setShowAdjustModal(false);
        setAdjustment({ quantity: 0, reason: '' });
        setSelectedProduct(null);
        loadProducts();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Adjust stock error:', error);
      alert('Failed to adjust stock');
    }
  };

  if (loading) {
    return (
      <div className="inventory-loading">
        <div className="spinner"></div>
        <p>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      {/* Header */}
      <div className="inventory-header">
        <div className="header-left">
          <h1>Inventory Management</h1>
          <p className="subtitle">{products.length} products in stock</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <i className="fas fa-plus"></i> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="inventory-filters">
        <input
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        <div className="filter-buttons">
          {['ALL', 'GOOD_STOCK', 'MEDIUM_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'].map(status => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Barcode</th>
              <th>Unit</th>
              <th>Purchase Price</th>
              <th>Selling Price</th>
              <th>GST %</th>
              <th>Current Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const status = getStockStatus(product);
              return (
                <tr key={product.id}>
                  <td className="product-name">{product.item_name}</td>
                  <td>{product.barcode || '-'}</td>
                  <td>{product.unit}</td>
                  <td>₹{product.purchase_price}</td>
                  <td>₹{product.selling_price}</td>
                  <td>{product.gst_rate}%</td>
                  <td className="stock-cell">
                    <span className="stock-value">
                      {product.current_stock} {product.unit}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStockColor(status) }}
                    >
                      {status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-action"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowAdjustModal(true);
                      }}
                    >
                      Adjust Stock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-box-open"></i>
            <p>No products found</p>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Product</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={newProduct.item_name}
                    onChange={(e) => setNewProduct({...newProduct, item_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Unit *</label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                  >
                    <option value="KG">KG</option>
                    <option value="GRAM">GRAM</option>
                    <option value="LITER">LITER</option>
                    <option value="PIECE">PIECE</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Purchase Price *</label>
                  <input
                    type="number"
                    value={newProduct.purchase_price}
                    onChange={(e) => setNewProduct({...newProduct, purchase_price: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Selling Price *</label>
                  <input
                    type="number"
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({...newProduct, selling_price: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>GST Rate (%)</label>
                  <select
                    value={newProduct.gst_rate}
                    onChange={(e) => setNewProduct({...newProduct, gst_rate: parseFloat(e.target.value)})}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.current_stock}
                    onChange={(e) => setNewProduct({...newProduct, current_stock: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Min Stock Level</label>
                  <input
                    type="number"
                    value={newProduct.min_stock_level}
                    onChange={(e) => setNewProduct({...newProduct, min_stock_level: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddProduct}>
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adjust Stock - {selectedProduct.item_name}</h2>
              <button className="btn-close" onClick={() => setShowAdjustModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="current-stock-info">
                <p>Current Stock: <strong>{selectedProduct.current_stock} {selectedProduct.unit}</strong></p>
              </div>
              <div className="form-group">
                <label>Adjustment Quantity (+ to add, - to reduce)</label>
                <input
                  type="number"
                  value={adjustment.quantity}
                  onChange={(e) => setAdjustment({...adjustment, quantity: e.target.value})}
                  placeholder="e.g., +10 or -5"
                />
              </div>
              <div className="form-group">
                <label>Reason *</label>
                <textarea
                  value={adjustment.reason}
                  onChange={(e) => setAdjustment({...adjustment, reason: e.target.value})}
                  placeholder="Enter reason for adjustment..."
                  rows="3"
                />
              </div>
              <div className="new-stock-preview">
                <p>New Stock: <strong>
                  {selectedProduct.current_stock + parseFloat(adjustment.quantity || 0)} {selectedProduct.unit}
                </strong></p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAdjustModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAdjustStock}>
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryScreenWeb;
