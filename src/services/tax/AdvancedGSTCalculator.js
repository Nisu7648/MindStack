/**
 * ADVANCED GST/TAX CALCULATOR
 * 
 * Per-line-item tax calculation
 * Auto-generates GST breakup
 * Credit notes auto-adjust tax
 * Always GST-valid
 * 
 * NO manual GST editing by default
 */

import GlobalTaxEngine from './GlobalTaxEngine';

class AdvancedGSTCalculator {
  /**
   * ========================================
   * CALCULATE LINE ITEM TAX
   * ========================================
   * 
   * Calculates tax for each line item separately
   * Generates complete GST breakup
   */
  static calculateLineItemTax(item, businessState, customerState, country = 'IN') {
    const { quantity, rate, discount = 0, gstRate = 18, hsnCode } = item;

    // Calculate taxable amount
    const grossAmount = quantity * rate;
    const taxableAmount = grossAmount - discount;

    // Determine tax type (Intra-state vs Inter-state)
    const isIntraState = businessState === customerState;

    let taxBreakup = {};
    let totalTax = 0;

    if (country === 'IN') {
      // India GST
      totalTax = (taxableAmount * gstRate) / 100;

      if (isIntraState) {
        // CGST + SGST
        taxBreakup = {
          CGST: {
            rate: gstRate / 2,
            amount: totalTax / 2
          },
          SGST: {
            rate: gstRate / 2,
            amount: totalTax / 2
          }
        };
      } else {
        // IGST
        taxBreakup = {
          IGST: {
            rate: gstRate,
            amount: totalTax
          }
        };
      }
    } else if (country === 'US') {
      // US Sales Tax
      totalTax = (taxableAmount * gstRate) / 100;
      taxBreakup = {
        SALES_TAX: {
          rate: gstRate,
          amount: totalTax
        }
      };
    } else if (country === 'GB' || country === 'EU') {
      // UK/EU VAT
      totalTax = (taxableAmount * gstRate) / 100;
      taxBreakup = {
        VAT: {
          rate: gstRate,
          amount: totalTax
        }
      };
    }

    return {
      itemName: item.name,
      hsnCode,
      quantity,
      rate,
      grossAmount,
      discount,
      taxableAmount,
      gstRate,
      taxBreakup,
      totalTax,
      totalAmount: taxableAmount + totalTax,
      isIntraState
    };
  }

  /**
   * ========================================
   * CALCULATE INVOICE TAX
   * ========================================
   * 
   * Calculates tax for entire invoice
   * Aggregates line-item taxes
   */
  static calculateInvoiceTax(items, businessState, customerState, country = 'IN') {
    const lineItems = [];
    const taxSummary = {};
    let totalTaxableAmount = 0;
    let totalTaxAmount = 0;
    let totalInvoiceAmount = 0;

    // Calculate each line item
    for (const item of items) {
      const lineItemTax = this.calculateLineItemTax(
        item,
        businessState,
        customerState,
        country
      );

      lineItems.push(lineItemTax);

      // Aggregate tax components
      for (const [component, details] of Object.entries(lineItemTax.taxBreakup)) {
        if (!taxSummary[component]) {
          taxSummary[component] = {
            rate: details.rate,
            amount: 0
          };
        }
        taxSummary[component].amount += details.amount;
      }

      totalTaxableAmount += lineItemTax.taxableAmount;
      totalTaxAmount += lineItemTax.totalTax;
      totalInvoiceAmount += lineItemTax.totalAmount;
    }

    return {
      lineItems,
      taxSummary,
      totals: {
        taxableAmount: totalTaxableAmount,
        totalTax: totalTaxAmount,
        totalAmount: totalInvoiceAmount
      },
      isIntraState: lineItems[0]?.isIntraState,
      country
    };
  }

  /**
   * ========================================
   * VALIDATE GST INVOICE
   * ========================================
   * 
   * Ensures invoice is GST-valid
   */
  static validateGSTInvoice(invoiceData, business, customer) {
    const errors = [];

    // Check business GSTIN
    if (!business.gstin || business.gstin.length !== 15) {
      errors.push('Invalid business GSTIN');
    }

    // Check customer GSTIN for B2B
    if (invoiceData.invoiceType === 'tax_invoice' && invoiceData.total > 250000) {
      if (!customer.gstin || customer.gstin.length !== 15) {
        errors.push('Customer GSTIN required for invoices above ₹2.5 lakhs');
      }
    }

    // Check HSN codes
    if (invoiceData.total > 500000) {
      for (const item of invoiceData.items) {
        if (!item.hsnCode || item.hsnCode.length < 4) {
          errors.push(`HSN code required for item: ${item.name}`);
        }
      }
    }

    // Check tax rates
    for (const item of invoiceData.items) {
      if (![0, 5, 12, 18, 28].includes(item.gstRate)) {
        errors.push(`Invalid GST rate ${item.gstRate}% for item: ${item.name}`);
      }
    }

    // Check place of supply
    if (!customer.state) {
      errors.push('Customer state (Place of Supply) is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ========================================
   * GENERATE GST BREAKUP REPORT
   * ========================================
   */
  static generateGSTBreakup(invoiceData) {
    const breakup = {
      invoiceNumber: invoiceData.invoice_number,
      invoiceDate: invoiceData.invoice_date,
      customerName: invoiceData.customer.name,
      customerGSTIN: invoiceData.customer.gstin,
      placeOfSupply: invoiceData.customer.state,
      items: [],
      taxSummary: {},
      totals: {
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
        totalAmount: 0
      }
    };

    // Process each item
    for (const item of invoiceData.items) {
      const itemBreakup = {
        name: item.name,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        rate: item.rate,
        taxableValue: item.taxableAmount,
        gstRate: item.gstRate,
        cgst: item.taxBreakup?.CGST?.amount || 0,
        sgst: item.taxBreakup?.SGST?.amount || 0,
        igst: item.taxBreakup?.IGST?.amount || 0,
        totalTax: item.totalTax,
        totalAmount: item.totalAmount
      };

      breakup.items.push(itemBreakup);

      // Aggregate totals
      breakup.totals.taxableValue += itemBreakup.taxableValue;
      breakup.totals.cgst += itemBreakup.cgst;
      breakup.totals.sgst += itemBreakup.sgst;
      breakup.totals.igst += itemBreakup.igst;
      breakup.totals.totalTax += itemBreakup.totalTax;
      breakup.totals.totalAmount += itemBreakup.totalAmount;
    }

    return breakup;
  }

  /**
   * ========================================
   * CALCULATE CREDIT NOTE TAX ADJUSTMENT
   * ========================================
   * 
   * Auto-adjusts tax for credit notes
   * Reverses original invoice tax
   */
  static calculateCreditNoteTaxAdjustment(originalInvoice, creditNoteItems) {
    const adjustments = {
      originalTax: {},
      creditNoteTax: {},
      netAdjustment: {}
    };

    // Get original invoice tax
    if (originalInvoice.taxSummary) {
      adjustments.originalTax = { ...originalInvoice.taxSummary };
    }

    // Calculate credit note tax
    const creditNoteTaxCalc = this.calculateInvoiceTax(
      creditNoteItems,
      originalInvoice.business.state,
      originalInvoice.customer.state,
      originalInvoice.business.country
    );

    adjustments.creditNoteTax = creditNoteTaxCalc.taxSummary;

    // Calculate net adjustment (negative values = reversal)
    for (const [component, details] of Object.entries(adjustments.originalTax)) {
      const creditAmount = adjustments.creditNoteTax[component]?.amount || 0;
      adjustments.netAdjustment[component] = {
        original: details.amount,
        creditNote: creditAmount,
        adjustment: details.amount - creditAmount
      };
    }

    return adjustments;
  }

  /**
   * ========================================
   * ROUND GST AMOUNTS
   * ========================================
   * 
   * Rounds GST amounts as per rules
   */
  static roundGSTAmount(amount) {
    // Round to 2 decimal places
    return Math.round(amount * 100) / 100;
  }

  /**
   * ========================================
   * GET GST RATE SUGGESTIONS
   * ========================================
   */
  static getGSTRateSuggestions(category) {
    const rateSuggestions = {
      'food': [5, 12],
      'clothing': [5, 12],
      'electronics': [18],
      'services': [18],
      'luxury': [28],
      'essential': [0, 5],
      'books': [0],
      'medicines': [0, 5, 12]
    };

    return rateSuggestions[category?.toLowerCase()] || [18];
  }

  /**
   * ========================================
   * GENERATE GSTR-1 DATA
   * ========================================
   * 
   * Prepares data for GSTR-1 filing
   */
  static generateGSTR1Data(invoices, period) {
    const gstr1Data = {
      period,
      b2b: [], // B2B invoices
      b2cl: [], // B2C Large (>2.5L)
      b2cs: [], // B2C Small
      cdnr: [], // Credit/Debit notes (registered)
      cdnur: [], // Credit/Debit notes (unregistered)
      summary: {
        totalInvoices: 0,
        totalTaxableValue: 0,
        totalCGST: 0,
        totalSGST: 0,
        totalIGST: 0,
        totalTax: 0
      }
    };

    for (const invoice of invoices) {
      // Classify invoice
      if (invoice.customer.gstin) {
        // B2B
        gstr1Data.b2b.push({
          gstin: invoice.customer.gstin,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          invoiceValue: invoice.total,
          placeOfSupply: invoice.customer.state,
          reverseCharge: 'N',
          invoiceType: 'Regular',
          taxableValue: invoice.subtotal,
          cgst: invoice.taxSummary?.CGST?.amount || 0,
          sgst: invoice.taxSummary?.SGST?.amount || 0,
          igst: invoice.taxSummary?.IGST?.amount || 0
        });
      } else if (invoice.total > 250000) {
        // B2C Large
        gstr1Data.b2cl.push({
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          invoiceValue: invoice.total,
          placeOfSupply: invoice.customer.state,
          taxableValue: invoice.subtotal,
          tax: invoice.tax_amount
        });
      } else {
        // B2C Small
        const existingEntry = gstr1Data.b2cs.find(
          e => e.placeOfSupply === invoice.customer.state && e.rate === invoice.items[0]?.gstRate
        );

        if (existingEntry) {
          existingEntry.taxableValue += invoice.subtotal;
          existingEntry.tax += invoice.tax_amount;
        } else {
          gstr1Data.b2cs.push({
            placeOfSupply: invoice.customer.state,
            rate: invoice.items[0]?.gstRate || 18,
            taxableValue: invoice.subtotal,
            tax: invoice.tax_amount
          });
        }
      }

      // Update summary
      gstr1Data.summary.totalInvoices++;
      gstr1Data.summary.totalTaxableValue += invoice.subtotal;
      gstr1Data.summary.totalCGST += invoice.taxSummary?.CGST?.amount || 0;
      gstr1Data.summary.totalSGST += invoice.taxSummary?.SGST?.amount || 0;
      gstr1Data.summary.totalIGST += invoice.taxSummary?.IGST?.amount || 0;
      gstr1Data.summary.totalTax += invoice.tax_amount;
    }

    return gstr1Data;
  }

  /**
   * ========================================
   * VALIDATE TAX CALCULATION
   * ========================================
   */
  static validateTaxCalculation(invoice) {
    const errors = [];

    // Check if tax matches line items
    let calculatedTax = 0;
    for (const item of invoice.items) {
      calculatedTax += item.totalTax;
    }

    const difference = Math.abs(calculatedTax - invoice.tax_amount);
    if (difference > 0.01) {
      errors.push(`Tax mismatch: Calculated ${calculatedTax}, Invoice shows ${invoice.tax_amount}`);
    }

    // Check if total matches
    const calculatedTotal = invoice.subtotal + invoice.tax_amount - (invoice.discount || 0);
    const totalDifference = Math.abs(calculatedTotal - invoice.total);
    if (totalDifference > 0.01) {
      errors.push(`Total mismatch: Calculated ${calculatedTotal}, Invoice shows ${invoice.total}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default AdvancedGSTCalculator;
