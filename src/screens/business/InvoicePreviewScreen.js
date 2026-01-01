/**
 * INVOICE PREVIEW SCREEN
 * Professional invoice display with print options
 * 
 * Features:
 * - Clean invoice layout
 * - Print via Bluetooth
 * - Share as PDF
 * - WhatsApp share
 * - Email invoice
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import bluetoothPrintService from '../../services/print/bluetoothPrintService';

const InvoicePreviewScreen = ({ navigation, route }) => {
  const { invoice, showPrintOptions = false } = route.params;
  const [businessInfo, setBusinessInfo] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    // Load from settings
    const info = {
      businessName: 'My Business',
      address: '123 Main Street, City - 400001',
      phone: '+91 98765 43210',
      email: 'business@example.com',
      gstin: '29AAAAA0000A1Z5',
      state: 'Karnataka',
      stateCode: '29'
    };
    setBusinessInfo(info);
  };

  const printInvoice = async () => {
    setIsPrinting(true);
    
    try {
      const connected = await bluetoothPrintService.connectToLastPrinter();
      
      if (!connected) {
        // Show printer selection
        navigation.navigate('PrinterSettings', {
          onConnect: async () => {
            await bluetoothPrintService.printInvoice(invoice, businessInfo);
            Alert.alert('Success', 'Invoice printed successfully');
          }
        });
      } else {
        await bluetoothPrintService.printInvoice(invoice, businessInfo);
        Alert.alert('Success', 'Invoice printed successfully');
      }
    } catch (error) {
      Alert.alert('Print Error', error.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const generatePDF = async () => {
    try {
      const html = generateInvoiceHTML();
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const shareWhatsApp = async () => {
    const message = `Invoice ${invoice.invoice_number}\nAmount: ₹${invoice.grand_total}\n\nThank you for your business!`;
    
    try {
      await Share.share({
        message: message
      });
    } catch (error) {
      console.error(error);
    }
  };

  const generateInvoiceHTML = () => {
    const itemsHTML = invoice.items.map(item => `
      <tr>
        <td>${item.itemName}</td>
        <td style="text-align: center">${item.quantity} ${item.unit}</td>
        <td style="text-align: right">₹${item.rate}</td>
        <td style="text-align: right">₹${item.taxableValue}</td>
        <td style="text-align: center">${item.gstRate}%</td>
        <td style="text-align: right">₹${item.totalGST}</td>
        <td style="text-align: right">₹${item.itemTotal}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; }
          .invoice-title { font-size: 20px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${businessInfo?.businessName || 'Business Name'}</div>
          <div>${businessInfo?.address || ''}</div>
          <div>Phone: ${businessInfo?.phone || ''}</div>
          <div>GSTIN: ${businessInfo?.gstin || ''}</div>
        </div>
        
        <div class="invoice-title">TAX INVOICE</div>
        
        <table>
          <tr>
            <td><strong>Invoice No:</strong> ${invoice.invoice_number}</td>
            <td><strong>Date:</strong> ${invoice.invoice_date}</td>
          </tr>
          ${invoice.customer_name ? `
          <tr>
            <td colspan="2"><strong>Customer:</strong> ${invoice.customer_name}</td>
          </tr>
          ` : ''}
        </table>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Taxable</th>
              <th>GST%</th>
              <th>GST Amt</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <table>
          <tr>
            <td style="text-align: right"><strong>Subtotal:</strong></td>
            <td style="text-align: right">₹${invoice.subtotal}</td>
          </tr>
          ${invoice.gst_breakup.cgst > 0 ? `
          <tr>
            <td style="text-align: right">CGST:</td>
            <td style="text-align: right">₹${invoice.gst_breakup.cgst}</td>
          </tr>
          <tr>
            <td style="text-align: right">SGST:</td>
            <td style="text-align: right">₹${invoice.gst_breakup.sgst}</td>
          </tr>
          ` : `
          <tr>
            <td style="text-align: right">IGST:</td>
            <td style="text-align: right">₹${invoice.gst_breakup.igst}</td>
          </tr>
          `}
          <tr class="total-row">
            <td style="text-align: right"><strong>GRAND TOTAL:</strong></td>
            <td style="text-align: right"><strong>₹${invoice.grand_total}</strong></td>
          </tr>
        </table>
        
        <div style="margin-top: 40px; text-align: center;">
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice</Text>
        <TouchableOpacity onPress={printInvoice} disabled={isPrinting}>
          <Ionicons name="print" size={24} color="#212121" />
        </TouchableOpacity>
      </View>

      {/* Invoice Content */}
      <ScrollView style={styles.content}>
        {/* Business Info */}
        <View style={styles.businessSection}>
          <Text style={styles.businessName}>{businessInfo?.businessName}</Text>
          <Text style={styles.businessText}>{businessInfo?.address}</Text>
          <Text style={styles.businessText}>Phone: {businessInfo?.phone}</Text>
          <Text style={styles.businessText}>GSTIN: {businessInfo?.gstin}</Text>
        </View>

        {/* Invoice Title */}
        <View style={styles.invoiceTitle}>
          <Text style={styles.invoiceTitleText}>TAX INVOICE</Text>
        </View>

        {/* Invoice Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Invoice No:</Text>
            <Text style={styles.detailValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{invoice.invoice_date}</Text>
          </View>
          {invoice.customer_name && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Customer:</Text>
              <Text style={styles.detailValue}>{invoice.customer_name}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>{invoice.payment_mode}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>
          {invoice.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemTotal}>₹{item.itemTotal}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetailText}>
                  {item.quantity} {item.unit} × ₹{item.rate}
                </Text>
                <Text style={styles.itemDetailText}>
                  GST {item.gstRate}%: ₹{item.totalGST}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{invoice.subtotal}</Text>
          </View>
          
          {invoice.gst_breakup.cgst > 0 ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>CGST</Text>
                <Text style={styles.summaryValue}>₹{invoice.gst_breakup.cgst}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SGST</Text>
                <Text style={styles.summaryValue}>₹{invoice.gst_breakup.sgst}</Text>
              </View>
            </>
          ) : (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IGST</Text>
              <Text style={styles.summaryValue}>₹{invoice.gst_breakup.igst}</Text>
            </View>
          )}
          
          {invoice.round_off !== 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Round Off</Text>
              <Text style={styles.summaryValue}>₹{invoice.round_off}</Text>
            </View>
          )}
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>GRAND TOTAL</Text>
            <Text style={styles.totalValue}>₹{invoice.grand_total}</Text>
          </View>
        </View>

        {/* Thank You */}
        <View style={styles.thankYou}>
          <Text style={styles.thankYouText}>Thank you for your business!</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {showPrintOptions && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={printInvoice}
            disabled={isPrinting}
          >
            <Ionicons name="print" size={24} color="#2196F3" />
            <Text style={styles.actionButtonText}>Print</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={generatePDF}
          >
            <Ionicons name="document" size={24} color="#2196F3" />
            <Text style={styles.actionButtonText}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={shareWhatsApp}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.doneButton]}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.doneButtonText]}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121'
  },
  content: {
    flex: 1
  },
  businessSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  businessName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8
  },
  businessText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2
  },
  invoiceTitle: {
    backgroundColor: '#2196F3',
    padding: 12,
    alignItems: 'center'
  },
  invoiceTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#666'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121'
  },
  itemsSection: {
    marginHorizontal: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    flex: 1
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121'
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  itemDetailText: {
    fontSize: 13,
    color: '#666'
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121'
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121'
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50'
  },
  thankYou: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 100
  },
  thankYouText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  actionButtonText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 4,
    fontWeight: '500'
  },
  doneButton: {
    backgroundColor: '#4CAF50'
  },
  doneButtonText: {
    color: '#FFFFFF'
  }
});

export default InvoicePreviewScreen;
