/**
 * POS SCREEN - WEB VERSION
 * Point of Sale for quick billing
 */

import React, { useState, useEffect } from 'react';
import './POSScreenWeb.css';
import integrationService from '../../services/integration/integrationService';
import inventoryEngine from '../../services/pos/inventoryEngine';

const POSScreenWeb = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const result = await inventoryEngine.getAllProducts();
      if (result.success) {
        setProducts(result.products);
      }
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  };

  const calculateGST = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.selling_price * item.quantity;
      const gstAmount = (itemTotal * (item.gst_rate || 0)) / 100;
      return sum + gstAmount;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      setLoading(true);

      const invoiceData = {
        invoice_no: `INV-${Date.now()}`,
        invoice_date: new Date().toISOString(),
        customer_name: customerName || 'Walk-in Customer',
        payment_mode: paymentMode,
        items: cart.map(item => ({
          product_id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          rate: item.selling_price,
          gst_rate: item.gst_rate || 0,
          amount: item.selling_price * item.quantity
        })),
        subtotal: calculateSubtotal(),
        gst_amount: calculateGST(),
        total_amount: calculateTotal()
      };

      const result = await integrationService.createInvoice(invoiceData);

      if (result.success) {
        alert('Invoice created successfully!');
        setCart([]);
        setCustomerName('');
        setPaymentMode('CASH');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.includes(searchQuery)
  );

  return (
    <div className="pos-container">
      {/* Left Panel - Products */}
      <div className="pos-left">
        <div className="pos-header">
          <h2>Products</h2>
          <input
            type="text"
            className="search-input"
            placeholder="Search products or scan barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="products-grid">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => addToCart(product)}
            >
              <div className="product-name">{product.item_name}</div>
              <div className="product-price">₹{product.selling_price}</div>
              <div className="product-stock">
                Stock: {product.current_stock} {product.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="pos-right">
        <div className="cart-header">
          <h2>Current Bill</h2>
          <button className="btn-clear" onClick={() => setCart([])}>
            Clear All
          </button>
        </div>

        {/* Customer Info */}
        <div className="customer-section">
          <input
            type="text"
            className="customer-input"
            placeholder="Customer Name (Optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <i className="fas fa-shopping-cart"></i>
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-details">
                  <div className="item-name">{item.item_name}</div>
                  <div className="item-price">₹{item.selling_price}</div>
                </div>
                <div className="item-controls">
                  <button
                    className="btn-qty"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    className="qty-input"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                  />
                  <button
                    className="btn-qty"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    className="btn-remove"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
                <div className="item-total">
                  ₹{(item.selling_price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="cart-totals">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>₹{calculateSubtotal().toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>GST:</span>
            <span>₹{calculateGST().toFixed(2)}</span>
          </div>
          <div className="total-row grand-total">
            <span>Total:</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Mode */}
        <div className="payment-section">
          <label>Payment Mode:</label>
          <div className="payment-buttons">
            {['CASH', 'UPI', 'CARD', 'CREDIT'].map(mode => (
              <button
                key={mode}
                className={`payment-btn ${paymentMode === mode ? 'active' : ''}`}
                onClick={() => setPaymentMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Checkout Button */}
        <button
          className="btn-checkout"
          onClick={handleCheckout}
          disabled={loading || cart.length === 0}
        >
          {loading ? 'Processing...' : `Checkout - ₹${calculateTotal().toFixed(2)}`}
        </button>
      </div>
    </div>
  );
};

export default POSScreenWeb;
