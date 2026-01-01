/**
 * GSTR-1 RETURN GENERATION SERVICE
 * Complete GSTR-1 return as per CBIC specifications
 * 
 * GSTR-1 Sections:
 * - B2B (Business to Business)
 * - B2C Large (>2.5 lakhs)
 * - B2C Small (<=2.5 lakhs)
 * - Credit/Debit Notes
 * - Exports
 * - Nil Rated, Exempted, Non-GST
 * - Amendments
 * - HSN Summary
 * - Document Summary
 */

import { getDatabase } from '../database/schema';
import advancedGSTEngine from './advancedGSTEngine';

/**
 * GSTR1 Service
 */
class GSTR1Service {
  constructor() {
    this.b2cLargeThreshold = 250000;
  }

  /**
   * Generate complete GSTR-1 return
   */
  async generateGSTR1(params) {
    const {
      gstin,
      financialYear,
      month, // Format: MMYYYY (e.g., 012025 for Jan 2025)
      fromDate,
      toDate
    } = params;

    const db = await getDatabase();

    // Get all invoices for the period
    const invoices = await this.getInvoices(db, gstin, fromDate, toDate);

    // Generate sections
    const b2b = await this.generateB2BSection(invoices);
    const b2cl = await this.generateB2CLSection(invoices);
    const b2cs = await this.generateB2CSSection(invoices);
    const cdnr = await this.generateCDNRSection(invoices); // Credit/Debit notes registered
    const cdnur = await this.generateCDNURSection(invoices); // Credit/Debit notes unregistered
    const exp = await this.generateExportSection(invoices);
    const nil = await this.generateNilRatedSection(invoices);
    const hsn = await this.generateHSNSummary(invoices);
    const docs = await this.generateDocumentSummary(invoices);

    // Calculate totals
    const summary = this.calculateSummary({
      b2b, b2cl, b2cs, cdnr, cdnur, exp, nil
    });

    return {
      gstin,
      financialYear,
      returnPeriod: month,
      fromDate,
      toDate,
      generatedAt: new Date().toISOString(),
      sections: {
        b2b,
        b2cl,
        b2cs,
        cdnr,
        cdnur,
        exp,
        nil,
        hsn,
        docs
      },
      summary
    };
  }

  /**
   * Generate B2B section (4A, 4B, 4C, 6B, 6C)
   */
  async generateB2BSection(invoices) {
    const b2bInvoices = invoices.filter(inv => 
      inv.recipient_gstin && 
      inv.transaction_type === 'B2B' &&
      inv.document_type === 'INVOICE'
    );

    const grouped = {};

    b2bInvoices.forEach(inv => {
      const key = inv.recipient_gstin;
      if (!grouped[key]) {
        grouped[key] = {
          ctin: inv.recipient_gstin,
          tradeName: inv.recipient_name,
          invoices: []
        };
      }

      grouped[key].invoices.push({
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        invoiceValue: inv.total_amount,
        placeOfSupply: inv.place_of_supply,
        reverseCharge: inv.is_rcm ? 'Y' : 'N',
        invoiceType: inv.is_rcm ? 'R' : 'R', // R=Regular, SEZWP, SEZWOP, DE
        ecomGSTIN: inv.ecom_gstin || null,
        items: this.formatB2BItems(inv)
      });
    });

    return Object.values(grouped);
  }

  /**
   * Format B2B items
   */
  formatB2BItems(invoice) {
    const items = JSON.parse(invoice.items_json || '[]');
    const grouped = {};

    items.forEach(item => {
      const key = item.gstRate;
      if (!grouped[key]) {
        grouped[key] = {
          rate: item.gstRate,
          taxableValue: 0,
          igstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          cessAmount: 0
        };
      }

      grouped[key].taxableValue += item.taxableValue;
      grouped[key].igstAmount += item.igst || 0;
      grouped[key].cgstAmount += item.cgst || 0;
      grouped[key].sgstAmount += item.sgst || 0;
      grouped[key].cessAmount += item.cess || 0;
    });

    return Object.values(grouped).map(g => ({
      rate: g.rate,
      taxableValue: this.round(g.taxableValue),
      igstAmount: this.round(g.igstAmount),
      cgstAmount: this.round(g.cgstAmount),
      sgstAmount: this.round(g.sgstAmount),
      cessAmount: this.round(g.cessAmount)
    }));
  }

  /**
   * Generate B2C Large section (5A, 5B)
   * B2C invoices > 2.5 lakhs
   */
  async generateB2CLSection(invoices) {
    const b2clInvoices = invoices.filter(inv => 
      !inv.recipient_gstin && 
      inv.total_amount > this.b2cLargeThreshold &&
      inv.document_type === 'INVOICE'
    );

    const grouped = {};

    b2clInvoices.forEach(inv => {
      const key = `${inv.place_of_supply}_${inv.gst_rate}`;
      if (!grouped[key]) {
        grouped[key] = {
          placeOfSupply: inv.place_of_supply,
          rate: inv.gst_rate,
          taxableValue: 0,
          igstAmount: 0,
          cessAmount: 0,
          ecomGSTIN: inv.ecom_gstin || null,
          invoices: []
        };
      }

      grouped[key].taxableValue += inv.taxable_value;
      grouped[key].igstAmount += inv.igst_amount;
      grouped[key].cessAmount += inv.cess_amount || 0;
      grouped[key].invoices.push({
        invoiceNumber: inv.invoice_number,
        invoiceDate: inv.invoice_date,
        invoiceValue: inv.total_amount
      });
    });

    return Object.values(grouped);
  }

  /**
   * Generate B2C Small section (7)
   * B2C invoices <= 2.5 lakhs
   */
  async generateB2CSSection(invoices) {
    const b2csInvoices = invoices.filter(inv => 
      !inv.recipient_gstin && 
      inv.total_amount <= this.b2cLargeThreshold &&
      inv.document_type === 'INVOICE'
    );

    const grouped = {};

    b2csInvoices.forEach(inv => {
      const gstType = inv.supplier_state === inv.place_of_supply ? 'E' : 'OE'; // E=Intra, OE=Inter
      const key = `${gstType}_${inv.place_of_supply}_${inv.gst_rate}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          type: gstType,
          placeOfSupply: inv.place_of_supply,
          rate: inv.gst_rate,
          taxableValue: 0,
          igstAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          cessAmount: 0,
          ecomGSTIN: inv.ecom_gstin || null
        };
      }

      grouped[key].taxableValue += inv.taxable_value;
      grouped[key].igstAmount += inv.igst_amount || 0;
      grouped[key].cgstAmount += inv.cgst_amount || 0;
      grouped[key].sgstAmount += inv.sgst_amount || 0;
      grouped[key].cessAmount += inv.cess_amount || 0;
    });

    return Object.values(grouped);
  }

  /**
   * Generate CDNR section (9B)
   * Credit/Debit notes to registered persons
   */
  async generateCDNRSection(invoices) {
    const cdnrDocs = invoices.filter(inv => 
      inv.recipient_gstin &&
      (inv.document_type === 'CREDIT_NOTE' || inv.document_type === 'DEBIT_NOTE')
    );

    const grouped = {};

    cdnrDocs.forEach(doc => {
      const key = doc.recipient_gstin;
      if (!grouped[key]) {
        grouped[key] = {
          ctin: doc.recipient_gstin,
          tradeName: doc.recipient_name,
          notes: []
        };
      }

      grouped[key].notes.push({
        noteNumber: doc.invoice_number,
        noteDate: doc.invoice_date,
        noteType: doc.document_type === 'CREDIT_NOTE' ? 'C' : 'D',
        noteValue: doc.total_amount,
        placeOfSupply: doc.place_of_supply,
        reverseCharge: doc.is_rcm ? 'Y' : 'N',
        invoiceNumber: doc.original_invoice_number,
        invoiceDate: doc.original_invoice_date,
        preGST: 'N',
        items: this.formatB2BItems(doc)
      });
    });

    return Object.values(grouped);
  }

  /**
   * Generate CDNUR section (9B)
   * Credit/Debit notes to unregistered persons
   */
  async generateCDNURSection(invoices) {
    const cdnurDocs = invoices.filter(inv => 
      !inv.recipient_gstin &&
      (inv.document_type === 'CREDIT_NOTE' || inv.document_type === 'DEBIT_NOTE')
    );

    return cdnurDocs.map(doc => ({
      noteNumber: doc.invoice_number,
      noteDate: doc.invoice_date,
      noteType: doc.document_type === 'CREDIT_NOTE' ? 'C' : 'D',
      noteValue: doc.total_amount,
      placeOfSupply: doc.place_of_supply,
      invoiceNumber: doc.original_invoice_number,
      invoiceDate: doc.original_invoice_date,
      preGST: 'N',
      items: this.formatB2BItems(doc)
    }));
  }

  /**
   * Generate Export section (6A)
   */
  async generateExportSection(invoices) {
    const exportInvoices = invoices.filter(inv => 
      inv.transaction_type === 'EXPORT' ||
      inv.transaction_type === 'EXPORT_WOPAY' ||
      inv.transaction_type === 'SEZ_WPAY' ||
      inv.transaction_type === 'SEZ_WOPAY'
    );

    return exportInvoices.map(inv => ({
      exportType: inv.transaction_type,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      invoiceValue: inv.total_amount,
      portCode: inv.port_code,
      shippingBillNumber: inv.shipping_bill_number,
      shippingBillDate: inv.shipping_bill_date,
      rate: inv.gst_rate,
      taxableValue: inv.taxable_value,
      igstAmount: inv.igst_amount || 0,
      cessAmount: inv.cess_amount || 0
    }));
  }

  /**
   * Generate Nil Rated section (8)
   */
  async generateNilRatedSection(invoices) {
    const nilInvoices = invoices.filter(inv => inv.gst_rate === 0);

    const summary = {
      nilRated: 0,
      exempted: 0,
      nonGST: 0
    };

    nilInvoices.forEach(inv => {
      if (inv.is_exempted) {
        summary.exempted += inv.taxable_value;
      } else if (inv.is_non_gst) {
        summary.nonGST += inv.taxable_value;
      } else {
        summary.nilRated += inv.taxable_value;
      }
    });

    return {
      interSupplies: {
        nilRated: this.round(summary.nilRated),
        exempted: this.round(summary.exempted),
        nonGST: this.round(summary.nonGST)
      },
      intraSupplies: {
        nilRated: this.round(summary.nilRated),
        exempted: this.round(summary.exempted),
        nonGST: this.round(summary.nonGST)
      }
    };
  }

  /**
   * Generate HSN Summary (12)
   */
  async generateHSNSummary(invoices) {
    const hsnMap = {};

    invoices.forEach(inv => {
      const items = JSON.parse(inv.items_json || '[]');
      
      items.forEach(item => {
        const hsn = item.hsnCode || item.sacCode || 'UNCLASSIFIED';
        const key = `${hsn}_${item.gstRate}`;
        
        if (!hsnMap[key]) {
          hsnMap[key] = {
            hsnCode: hsn,
            description: item.description,
            uqc: item.unit || 'NOS',
            totalQuantity: 0,
            totalValue: 0,
            taxableValue: 0,
            igstAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            cessAmount: 0,
            rate: item.gstRate
          };
        }

        hsnMap[key].totalQuantity += item.quantity;
        hsnMap[key].totalValue += item.totalAmount;
        hsnMap[key].taxableValue += item.taxableValue;
        hsnMap[key].igstAmount += item.igst || 0;
        hsnMap[key].cgstAmount += item.cgst || 0;
        hsnMap[key].sgstAmount += item.sgst || 0;
        hsnMap[key].cessAmount += item.cess || 0;
      });
    });

    return Object.values(hsnMap).map(hsn => ({
      hsnCode: hsn.hsnCode,
      description: hsn.description,
      uqc: hsn.uqc,
      totalQuantity: this.round(hsn.totalQuantity),
      totalValue: this.round(hsn.totalValue),
      taxableValue: this.round(hsn.taxableValue),
      igstAmount: this.round(hsn.igstAmount),
      cgstAmount: this.round(hsn.cgstAmount),
      sgstAmount: this.round(hsn.sgstAmount),
      cessAmount: this.round(hsn.cessAmount),
      rate: hsn.rate
    }));
  }

  /**
   * Generate Document Summary (13)
   */
  async generateDocumentSummary(invoices) {
    const summary = {
      invoices: { from: null, to: null, total: 0, cancelled: 0 },
      debitNotes: { from: null, to: null, total: 0, cancelled: 0 },
      creditNotes: { from: null, to: null, total: 0, cancelled: 0 }
    };

    const docTypes = {
      'INVOICE': 'invoices',
      'DEBIT_NOTE': 'debitNotes',
      'CREDIT_NOTE': 'creditNotes'
    };

    invoices.forEach(inv => {
      const type = docTypes[inv.document_type];
      if (!type) return;

      summary[type].total++;
      if (inv.is_cancelled) {
        summary[type].cancelled++;
      }

      // Track number range
      const num = parseInt(inv.invoice_number.replace(/\D/g, ''));
      if (!summary[type].from || num < summary[type].from) {
        summary[type].from = inv.invoice_number;
      }
      if (!summary[type].to || num > summary[type].to) {
        summary[type].to = inv.invoice_number;
      }
    });

    return summary;
  }

  /**
   * Calculate summary
   */
  calculateSummary(sections) {
    let totalTaxableValue = 0;
    let totalIGST = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalCess = 0;

    // B2B
    sections.b2b.forEach(party => {
      party.invoices.forEach(inv => {
        inv.items.forEach(item => {
          totalTaxableValue += item.taxableValue;
          totalIGST += item.igstAmount;
          totalCGST += item.cgstAmount;
          totalSGST += item.sgstAmount;
          totalCess += item.cessAmount;
        });
      });
    });

    // B2CL
    sections.b2cl.forEach(entry => {
      totalTaxableValue += entry.taxableValue;
      totalIGST += entry.igstAmount;
      totalCess += entry.cessAmount;
    });

    // B2CS
    sections.b2cs.forEach(entry => {
      totalTaxableValue += entry.taxableValue;
      totalIGST += entry.igstAmount;
      totalCGST += entry.cgstAmount;
      totalSGST += entry.sgstAmount;
      totalCess += entry.cessAmount;
    });

    return {
      totalTaxableValue: this.round(totalTaxableValue),
      totalIGST: this.round(totalIGST),
      totalCGST: this.round(totalCGST),
      totalSGST: this.round(totalSGST),
      totalCess: this.round(totalCess),
      totalTax: this.round(totalIGST + totalCGST + totalSGST + totalCess)
    };
  }

  /**
   * Get invoices from database
   */
  async getInvoices(db, gstin, fromDate, toDate) {
    const result = await db.executeSql(
      `SELECT * FROM gst_invoices 
       WHERE supplier_gstin = ? 
       AND invoice_date >= ? 
       AND invoice_date <= ?
       ORDER BY invoice_date, invoice_number`,
      [gstin, fromDate, toDate]
    );

    const invoices = [];
    for (let i = 0; i < result.rows.length; i++) {
      invoices.push(result.rows.item(i));
    }

    return invoices;
  }

  /**
   * Round to 2 decimals
   */
  round(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Export GSTR-1 to JSON (for upload to GST portal)
   */
  exportToJSON(gstr1Data) {
    return JSON.stringify(gstr1Data, null, 2);
  }

  /**
   * Validate GSTR-1 before filing
   */
  validateGSTR1(gstr1Data) {
    const errors = [];

    // Check if GSTIN is valid
    if (!gstr1Data.gstin) {
      errors.push('GSTIN is required');
    }

    // Check if return period is valid
    if (!gstr1Data.returnPeriod) {
      errors.push('Return period is required');
    }

    // Validate B2B section
    if (gstr1Data.sections.b2b) {
      gstr1Data.sections.b2b.forEach((party, index) => {
        if (!party.ctin) {
          errors.push(`B2B entry ${index + 1}: Recipient GSTIN is required`);
        }
        party.invoices.forEach((inv, invIndex) => {
          if (!inv.invoiceNumber) {
            errors.push(`B2B entry ${index + 1}, Invoice ${invIndex + 1}: Invoice number is required`);
          }
        });
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const gstr1Service = new GSTR1Service();

export default gstr1Service;
export { GSTR1Service };
