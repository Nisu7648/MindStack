/**
 * INVOICE DELIVERY SERVICE
 * 
 * Handles:
 * - PDF generation
 * - WhatsApp sharing
 * - Email sending
 * - Printing
 * - Delivery tracking (sent, viewed, paid)
 */

import { Share, Platform, Alert } from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { supabase } from '../supabase';
import POSDeviceManager from '../pos/POSDeviceManager';

class InvoiceDeliveryService {
  /**
   * ========================================
   * GENERATE PDF
   * ========================================
   */
  static async generatePDF(invoice, business) {
    try {
      console.log('📄 Generating PDF...');

      const html = this.generateInvoiceHTML(invoice, business);

      const options = {
        html,
        fileName: `Invoice_${invoice.invoice_number}`,
        directory: Platform.OS === 'ios' ? 'Documents' : 'Downloads',
        base64: true
      };

      const file = await RNHTMLtoPDF.convert(options);

      console.log('✅ PDF generated:', file.filePath);

      // Track delivery
      await this.trackDelivery(invoice.id, 'pdf_generated', {
        filePath: file.filePath
      });

      return file;

    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * GENERATE INVOICE HTML
   * ========================================
   */
  static generateInvoiceHTML(invoice, business) {
    const isGSTInvoice = invoice.invoice_type === 'tax_invoice';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .invoice-container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2196F3; padding-bottom: 20px; }
          .company-name { font-size: 28px; font-weight: bold; color: #2196F3; margin-bottom: 10px; }
          .company-details { font-size: 14px; color: #666; line-height: 1.6; }
          .invoice-title { font-size: 24px; font-weight: bold; margin: 20px 0; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-section { flex: 1; }
          .info-label { font-weight: bold; color: #333; margin-bottom: 5px; }
          .info-value { color: #666; margin-bottom: 10px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #2196F3; color: white; padding: 12px; text-align: left; }
          .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .items-table tr:hover { background: #f5f5f5; }
          .totals-section { margin-top: 20px; text-align: right; }
          .total-row { display: flex; justify-content: flex-end; margin: 8px 0; }
          .total-label { width: 150px; text-align: right; padding-right: 20px; font-weight: bold; }
          .total-value { width: 150px; text-align: right; }
          .grand-total { font-size: 20px; color: #4CAF50; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd; }
          .gst-breakup { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .gst-title { font-weight: bold; margin-bottom: 10px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #666; }
          .status-badge { display: inline-block; padding: 5px 15px; border-radius: 15px; font-size: 12px; font-weight: bold; }
          .status-paid { background: #4CAF50; color: white; }
          .status-unpaid { background: #F44336; color: white; }
          .status-partial { background: #FF9800; color: white; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="header">
            <div class="company-name">${business.name}</div>
            <div class="company-details">
              ${business.address || ''}<br>
              ${business.phone ? `Phone: ${business.phone}` : ''}<br>
              ${business.email ? `Email: ${business.email}` : ''}<br>
              ${business.gstin ? `GSTIN: ${business.gstin}` : ''}
            </div>
          </div>

          <!-- Invoice Title & Status -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="invoice-title">${invoice.invoice_type.replace('_', ' ').toUpperCase()}</div>
            <span class="status-badge status-${invoice.payment_status === 'paid' ? 'paid' : invoice.payment_status === 'partially_paid' ? 'partial' : 'unpaid'}">
              ${invoice.payment_status.toUpperCase().replace('_', ' ')}
            </span>
          </div>

          <!-- Invoice Info -->
          <div class="invoice-info">
            <div class="info-section">
              <div class="info-label">Invoice Number:</div>
              <div class="info-value">${invoice.invoice_number}</div>
              
              <div class="info-label">Invoice Date:</div>
              <div class="info-value">${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</div>
              
              <div class="info-label">Due Date:</div>
              <div class="info-value">${new Date(invoice.due_date).toLocaleDateString('en-IN')}</div>
            </div>

            <div class="info-section">
              <div class="info-label">Bill To:</div>
              <div class="info-value">
                <strong>${invoice.customer.name}</strong><br>
                ${invoice.customer.address || ''}<br>
                ${invoice.customer.phone || ''}<br>
                ${invoice.customer.gstin ? `GSTIN: ${invoice.customer.gstin}` : ''}
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Rate</th>
                ${isGSTInvoice ? '<th>GST %</th>' : ''}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.hsnCode || '-'}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.rate.toFixed(2)}</td>
                  ${isGSTInvoice ? `<td>${item.gstRate}%</td>` : ''}
                  <td>₹${(item.quantity * item.rate).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- GST Breakup (if applicable) -->
          ${isGSTInvoice && invoice.taxSummary ? `
            <div class="gst-breakup">
              <div class="gst-title">GST Breakup:</div>
              ${Object.entries(invoice.taxSummary).map(([component, details]) => `
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>${component} @ ${details.rate}%:</span>
                  <span>₹${details.amount.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Totals -->
          <div class="totals-section">
            <div class="total-row">
              <div class="total-label">Subtotal:</div>
              <div class="total-value">₹${invoice.subtotal.toFixed(2)}</div>
            </div>

            ${isGSTInvoice ? `
              <div class="total-row">
                <div class="total-label">Tax:</div>
                <div class="total-value">₹${invoice.tax_amount.toFixed(2)}</div>
              </div>
            ` : ''}

            ${invoice.discount > 0 ? `
              <div class="total-row">
                <div class="total-label">Discount:</div>
                <div class="total-value" style="color: #F44336;">-₹${invoice.discount.toFixed(2)}</div>
              </div>
            ` : ''}

            <div class="total-row grand-total">
              <div class="total-label">TOTAL:</div>
              <div class="total-value">₹${invoice.total.toFixed(2)}</div>
            </div>

            ${invoice.paid_amount > 0 ? `
              <div class="total-row">
                <div class="total-label">Paid:</div>
                <div class="total-value" style="color: #4CAF50;">₹${invoice.paid_amount.toFixed(2)}</div>
              </div>
              <div class="total-row">
                <div class="total-label">Balance Due:</div>
                <div class="total-value" style="color: #F44336; font-weight: bold;">₹${invoice.balance_due.toFixed(2)}</div>
              </div>
            ` : ''}
          </div>

          <!-- Notes -->
          ${invoice.notes ? `
            <div style="margin-top: 30px;">
              <div style="font-weight: bold; margin-bottom: 10px;">Notes:</div>
              <div style="color: #666;">${invoice.notes}</div>
            </div>
          ` : ''}

          <!-- Terms -->
          ${invoice.terms ? `
            <div style="margin-top: 20px;">
              <div style="font-weight: bold; margin-bottom: 10px;">Terms & Conditions:</div>
              <div style="color: #666; font-size: 12px;">${invoice.terms}</div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="font-size: 12px; margin-top: 10px;">
              This is a computer-generated invoice and does not require a signature.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * ========================================
   * SHARE VIA WHATSAPP
   * ========================================
   */
  static async shareViaWhatsApp(invoice, business) {
    try {
      console.log('📱 Sharing via WhatsApp...');

      // Generate PDF first
      const pdf = await this.generatePDF(invoice, business);

      // Prepare message
      const message = `
*Invoice: ${invoice.invoice_number}*

Dear ${invoice.customer.name},

Please find attached invoice for ₹${invoice.total.toLocaleString('en-IN')}

${invoice.balance_due > 0 ? `Balance Due: ₹${invoice.balance_due.toLocaleString('en-IN')}` : 'Paid in full'}

Thank you for your business!

${business.name}
      `.trim();

      // Share
      await Share.share({
        title: `Invoice ${invoice.invoice_number}`,
        message,
        url: Platform.OS === 'ios' ? pdf.filePath : `file://${pdf.filePath}`
      });

      // Track delivery
      await this.trackDelivery(invoice.id, 'shared_whatsapp', {
        customerPhone: invoice.customer.phone
      });

      console.log('✅ Shared via WhatsApp');

      return true;

    } catch (error) {
      console.error('WhatsApp share error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * SEND VIA EMAIL
   * ========================================
   */
  static async sendViaEmail(invoice, business, recipientEmail) {
    try {
      console.log('📧 Sending via email...');

      // Generate PDF
      const pdf = await this.generatePDF(invoice, business);

      // Read PDF as base64
      const pdfBase64 = await RNFS.readFile(pdf.filePath, 'base64');

      // Send email via Supabase Edge Function or external service
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          to: recipientEmail,
          subject: `Invoice ${invoice.invoice_number} from ${business.name}`,
          invoiceNumber: invoice.invoice_number,
          customerName: invoice.customer.name,
          amount: invoice.total,
          balanceDue: invoice.balance_due,
          businessName: business.name,
          pdfBase64
        }
      });

      if (error) throw error;

      // Track delivery
      await this.trackDelivery(invoice.id, 'sent_email', {
        recipientEmail
      });

      console.log('✅ Email sent');

      return true;

    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * PRINT INVOICE
   * ========================================
   */
  static async printInvoice(invoice, business) {
    try {
      console.log('🖨️ Printing invoice...');

      const connectedDevices = POSDeviceManager.getConnectedDevices();
      const printer = connectedDevices.find(d => d.type === 'thermal_printer');

      if (!printer) {
        throw new Error('No printer connected');
      }

      const receiptData = {
        businessName: business.name,
        businessAddress: business.address,
        businessPhone: business.phone,
        gstNumber: business.gstin,
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

      // Track delivery
      await this.trackDelivery(invoice.id, 'printed', {
        printerId: printer.id
      });

      console.log('✅ Invoice printed');

      return true;

    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * DOWNLOAD PDF
   * ========================================
   */
  static async downloadPDF(invoice, business) {
    try {
      console.log('⬇️ Downloading PDF...');

      const pdf = await this.generatePDF(invoice, business);

      Alert.alert(
        'PDF Downloaded',
        `Invoice saved to: ${pdf.filePath}`,
        [{ text: 'OK' }]
      );

      // Track delivery
      await this.trackDelivery(invoice.id, 'downloaded', {
        filePath: pdf.filePath
      });

      return pdf;

    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * ========================================
   * TRACK DELIVERY
   * ========================================
   * 
   * Tracks: sent, viewed, paid
   */
  static async trackDelivery(invoiceId, action, metadata = {}) {
    try {
      await supabase
        .from('invoice_delivery_tracking')
        .insert({
          invoice_id: invoiceId,
          action,
          metadata,
          timestamp: new Date().toISOString()
        });

      // Update invoice status if sent
      if (action === 'shared_whatsapp' || action === 'sent_email') {
        await supabase
          .from('invoices')
          .update({
            payment_status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
          .eq('payment_status', 'draft');
      }

      console.log(`✅ Tracked: ${action}`);

    } catch (error) {
      console.error('Track delivery error:', error);
    }
  }

  /**
   * ========================================
   * GET DELIVERY HISTORY
   * ========================================
   */
  static async getDeliveryHistory(invoiceId) {
    try {
      const { data, error } = await supabase
        .from('invoice_delivery_tracking')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Get delivery history error:', error);
      return [];
    }
  }

  /**
   * ========================================
   * MARK AS VIEWED
   * ========================================
   */
  static async markAsViewed(invoiceId) {
    await this.trackDelivery(invoiceId, 'viewed', {
      viewedAt: new Date().toISOString()
    });
  }
}

export default InvoiceDeliveryService;
