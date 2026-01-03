/**
 * INVOICE DETAIL SCREEN
 * 
 * Shows complete invoice with:
 * - Invoice details
 * - Payment history
 * - Accounting entries (auto-created)
 * - Actions (record payment, send, print)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Share
} from 'react-native';
import { supabase } from '../../services/supabase';
import InvoiceEngine, { PAYMENT_METHODS } from '../../services/invoice/InvoiceEngine';
import POSDeviceManager from '../../services/pos/POSDeviceManager';

const InvoiceDetailScreen = ({ route, navigation }) => {
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS.CASH);
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    loadInvoice();
  }, []);

  /**
   * LOAD INVOICE
   */
  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await InvoiceEngine.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * RECORD PAYMENT
   */
  const recordPayment = async () => {
    try {
      const amount = parseFloat(paymentAmount);

      if (!amount || amount <= 0) {
        Alert.alert('Error', 'Please enter valid amount');
        return;
      }

      if (amount > invoice.balance_due) {
        Alert.alert('Error', `Amount cannot exceed balance due (₹${invoice.balance_due})`);
        return;
      }

      await InvoiceEngine.recordPartialPayment(invoiceId, {
        amount,
        paymentMethod,
        reference: paymentReference,
        paymentDate: new Date().toISOString()
      });

      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentReference('');

      Alert.alert('✅ Success', 'Payment recorded and accounting updated automatically');

      loadInvoice();

    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  /**
   * PRINT INVOICE
   */
  const printInvoice = async () => {
    try {
      const connectedDevices = POSDeviceManager.getConnectedDevices();
      const printer = connectedDevices.find(d => d.type === 'thermal_printer');

      if (!printer) {
        Alert.alert('No Printer', 'Please connect a printer first');
        return;
      }

      const receiptData = {
        businessName: invoice.business.name,
        businessAddress: invoice.business.address,
        businessPhone: invoice.business.phone,
        gstNumber: invoice.business.gstin,
        invoiceNumber: invoice.invoice_number,
        date: new Date(invoice.invoice_date).toLocaleString('en-IN'),
        customerName: invoice.customer.name,
        items: invoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.quantity * item.rate
        })),
        subtotal: invoice.subtotal,
        tax: invoice.tax_amount,
        discount: invoice.discount,
        total: invoice.total
      };

      await POSDeviceManager.printReceipt(printer.id, receiptData);

      Alert.alert('✅ Success', 'Invoice printed successfully');

    } catch (error) {
      Alert.alert('Print Error', error.message);
    }
  };

  /**
   * SHARE INVOICE
   */
  const shareInvoice = async () => {
    try {
      const message = `
Invoice: ${invoice.invoice_number}
Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
Customer: ${invoice.customer.name}

Total: ₹${invoice.total.toFixed(2)}
Paid: ₹${invoice.paid_amount.toFixed(2)}
Balance: ₹${invoice.balance_due.toFixed(2)}

Status: ${invoice.payment_status.toUpperCase()}

Thank you for your business!
${invoice.business.name}
      `.trim();

      await Share.share({
        message,
        title: `Invoice ${invoice.invoice_number}`
      });

    } catch (error) {
      console.error('Share error:', error);
    }
  };

  /**
   * GET STATUS COLOR
   */
  const getStatusColor = (status) => {
    const colors = {
      draft: '#9E9E9E',
      sent: '#2196F3',
      partially_paid: '#FF9800',
      paid: '#4CAF50',
      overdue: '#F44336',
      cancelled: '#757575'
    };
    return colors[status] || '#9E9E9E';
  };

  /**
   * GET STATUS EMOJI
   */
  const getStatusEmoji = (status) => {
    const emojis = {
      draft: '📝',
      sent: '📤',
      partially_paid: '💰',
      paid: '✅',
      overdue: '⚠️',
      cancelled: '❌'
    };
    return emojis[status] || '📄';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading invoice...</Text>
        </View>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Invoice not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <TouchableOpacity onPress={shareInvoice}>
          <Text style={styles.shareButton}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.payment_status) }]}>
          <Text style={styles.statusEmoji}>{getStatusEmoji(invoice.payment_status)}</Text>
          <Text style={styles.statusText}>{invoice.payment_status.toUpperCase().replace('_', ' ')}</Text>
        </View>

        {/* Invoice Header */}
        <View style={styles.card}>
          <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          <Text style={styles.invoiceType}>{invoice.invoice_type.replace('_', ' ').toUpperCase()}</Text>
          
          <View style={styles.dateRow}>
            <View>
              <Text style={styles.dateLabel}>Invoice Date</Text>
              <Text style={styles.dateValue}>
                {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
              </Text>
            </View>
            <View>
              <Text style={styles.dateLabel}>Due Date</Text>
              <Text style={styles.dateValue}>
                {new Date(invoice.due_date).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.customerName}>{invoice.customer.name}</Text>
          {invoice.customer.phone && (
            <Text style={styles.customerDetail}>📱 {invoice.customer.phone}</Text>
          )}
          {invoice.customer.email && (
            <Text style={styles.customerDetail}>✉️ {invoice.customer.email}</Text>
          )}
          {invoice.customer.address && (
            <Text style={styles.customerDetail}>📍 {invoice.customer.address}</Text>
          )}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items</Text>
          
          {invoice.items && invoice.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} × ₹{item.rate} @ {item.gstRate}% GST
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                ₹{(item.quantity * item.rate * (1 + item.gstRate / 100)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{invoice.subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>₹{invoice.tax_amount.toFixed(2)}</Text>
          </View>

          {invoice.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#F44336' }]}>
                -₹{invoice.discount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>₹{invoice.total.toFixed(2)}</Text>
          </View>

          {invoice.paid_amount > 0 && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Paid:</Text>
                <Text style={[styles.totalValue, { color: '#4CAF50' }]}>
                  ₹{invoice.paid_amount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Balance Due:</Text>
                <Text style={[styles.totalValue, { color: '#F44336', fontWeight: 'bold' }]}>
                  ₹{invoice.balance_due.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment History</Text>
            
            {invoice.payments.map((payment, index) => (
              <View key={index} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
                  <Text style={styles.paymentMethod}>{payment.payment_method.toUpperCase()}</Text>
                </View>
                <Text style={styles.paymentDate}>
                  {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {invoice.balance_due > 0 && invoice.payment_status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.paymentButton]}
              onPress={() => setShowPaymentModal(true)}
            >
              <Text style={styles.actionButtonText}>💰 Record Payment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.printButton]}
            onPress={printInvoice}
          >
            <Text style={styles.actionButtonText}>🖨️ Print</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment</Text>

            <Text style={styles.balanceText}>
              Balance Due: ₹{invoice.balance_due.toFixed(2)}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {Object.values(PAYMENT_METHODS).map(method => (
                <TouchableOpacity
                  key={method}
                  style={[styles.paymentMethodButton, paymentMethod === method && styles.paymentMethodActive]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text style={styles.paymentMethodText}>{method.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Reference (optional)"
              value={paymentReference}
              onChangeText={setPaymentReference}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={recordPayment}
              >
                <Text style={{ color: '#FFF' }}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666'
  },
  errorText: {
    fontSize: 16,
    color: '#F44336'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    paddingTop: 40
  },
  backButton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF'
  },
  shareButton: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  content: {
    flex: 1,
    padding: 15
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15
  },
  statusEmoji: {
    fontSize: 24,
    marginRight: 10
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF'
  },
  card: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15
  },
  invoiceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  invoiceType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  customerDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  itemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  itemDetails: {
    fontSize: 13,
    color: '#666'
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  totalLabel: {
    fontSize: 14,
    color: '#666'
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  grandTotal: {
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    marginTop: 10
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4
  },
  paymentMethod: {
    fontSize: 12,
    color: '#666'
  },
  paymentDate: {
    fontSize: 14,
    color: '#666'
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5
  },
  paymentButton: {
    backgroundColor: '#4CAF50'
  },
  printButton: {
    backgroundColor: '#2196F3'
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFF',
    width: '90%',
    borderRadius: 12,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  balanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15
  },
  paymentMethodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  paymentMethodActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5
  },
  cancelButton: {
    backgroundColor: '#F5F5F5'
  },
  confirmButton: {
    backgroundColor: '#4CAF50'
  }
});

export default InvoiceDetailScreen;
