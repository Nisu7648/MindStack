/**
 * GSTR-3B RETURN GENERATION SERVICE
 * Monthly self-declaration summary return
 * 
 * GSTR-3B Tables:
 * - Table 3.1: Outward taxable supplies
 * - Table 3.2: Inter-state supplies to unregistered persons
 * - Table 4: ITC Available
 * - Table 5: ITC Reversal/Reclaim
 * - Table 6: Tax Liability
 */

import { getDatabase } from '../database/schema';

/**
 * GSTR3B Service
 */
class GSTR3BService {
  constructor() {}

  /**
   * Generate complete GSTR-3B return
   */
  async generateGSTR3B(params) {
    const {
      gstin,
      financialYear,
      month, // Format: MMYYYY
      fromDate,
      toDate
    } = params;

    const db = await getDatabase();

    // Get data
    const outwardSupplies = await this.getOutwardSupplies(db, gstin, fromDate, toDate);
    const inwardSupplies = await this.getInwardSupplies(db, gstin, fromDate, toDate);
    const itcData = await this.getITCData(db, gstin, fromDate, toDate);

    // Generate tables
    const table31 = this.generateTable31(outwardSupplies);
    const table32 = this.generateTable32(outwardSupplies);
    const table4 = this.generateTable4(itcData);
    const table5 = this.generateTable5(itcData);
    const table6 = this.generateTable6(table31, table4, table5);

    return {
      gstin,
      financialYear,
      returnPeriod: month,
      fromDate,
      toDate,
      generatedAt: new Date().toISOString(),
      tables: {
        table31,
        table32,
        table4,
        table5,
        table6
      }
    };
  }

  /**
   * Table 3.1: Outward taxable supplies
   */
  generateTable31(supplies) {
    const table = {
      outwardTaxableSupplies: {
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      outwardTaxableSuppliesZeroRated: {
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      otherOutwardSupplies: {
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      inwardSuppliesRCM: {
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      nonGSTOutwardSupplies: {
        taxableValue: 0
      }
    };

    supplies.forEach(supply => {
      if (supply.is_export || supply.is_sez) {
        // Zero rated supplies
        table.outwardTaxableSuppliesZeroRated.taxableValue += supply.taxable_value;
        table.outwardTaxableSuppliesZeroRated.igst += supply.igst_amount || 0;
        table.outwardTaxableSuppliesZeroRated.cgst += supply.cgst_amount || 0;
        table.outwardTaxableSuppliesZeroRated.sgst += supply.sgst_amount || 0;
        table.outwardTaxableSuppliesZeroRated.cess += supply.cess_amount || 0;
      } else if (supply.is_rcm) {
        // RCM supplies
        table.inwardSuppliesRCM.taxableValue += supply.taxable_value;
        table.inwardSuppliesRCM.igst += supply.igst_amount || 0;
        table.inwardSuppliesRCM.cgst += supply.cgst_amount || 0;
        table.inwardSuppliesRCM.sgst += supply.sgst_amount || 0;
        table.inwardSuppliesRCM.cess += supply.cess_amount || 0;
      } else if (supply.is_non_gst) {
        // Non-GST supplies
        table.nonGSTOutwardSupplies.taxableValue += supply.taxable_value;
      } else if (supply.gst_rate === 0 || supply.is_exempted) {
        // Other outward supplies (nil rated, exempted)
        table.otherOutwardSupplies.taxableValue += supply.taxable_value;
      } else {
        // Regular taxable supplies
        table.outwardTaxableSupplies.taxableValue += supply.taxable_value;
        table.outwardTaxableSupplies.igst += supply.igst_amount || 0;
        table.outwardTaxableSupplies.cgst += supply.cgst_amount || 0;
        table.outwardTaxableSupplies.sgst += supply.sgst_amount || 0;
        table.outwardTaxableSupplies.cess += supply.cess_amount || 0;
      }
    });

    // Round all values
    Object.keys(table).forEach(key => {
      Object.keys(table[key]).forEach(field => {
        table[key][field] = this.round(table[key][field]);
      });
    });

    return table;
  }

  /**
   * Table 3.2: Inter-state supplies to unregistered persons
   */
  generateTable32(supplies) {
    const interStateSupplies = supplies.filter(s => 
      !s.recipient_gstin && 
      s.supplier_state !== s.place_of_supply
    );

    const placeWise = {};

    interStateSupplies.forEach(supply => {
      const pos = supply.place_of_supply;
      if (!placeWise[pos]) {
        placeWise[pos] = {
          placeOfSupply: pos,
          taxableValue: 0,
          igst: 0
        };
      }

      placeWise[pos].taxableValue += supply.taxable_value;
      placeWise[pos].igst += supply.igst_amount || 0;
    });

    return Object.values(placeWise).map(p => ({
      placeOfSupply: p.placeOfSupply,
      taxableValue: this.round(p.taxableValue),
      igst: this.round(p.igst)
    }));
  }

  /**
   * Table 4: ITC Available
   */
  generateTable4(itcData) {
    const table = {
      importOfGoods: {
        igst: 0,
        cess: 0
      },
      importOfServices: {
        igst: 0,
        cess: 0
      },
      inwardSuppliesRCM: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      inwardSuppliesNonRCM: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      allOtherITC: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      }
    };

    itcData.forEach(itc => {
      if (itc.is_import_goods) {
        table.importOfGoods.igst += itc.igst_amount || 0;
        table.importOfGoods.cess += itc.cess_amount || 0;
      } else if (itc.is_import_services) {
        table.importOfServices.igst += itc.igst_amount || 0;
        table.importOfServices.cess += itc.cess_amount || 0;
      } else if (itc.is_rcm) {
        table.inwardSuppliesRCM.igst += itc.igst_amount || 0;
        table.inwardSuppliesRCM.cgst += itc.cgst_amount || 0;
        table.inwardSuppliesRCM.sgst += itc.sgst_amount || 0;
        table.inwardSuppliesRCM.cess += itc.cess_amount || 0;
      } else {
        table.inwardSuppliesNonRCM.igst += itc.igst_amount || 0;
        table.inwardSuppliesNonRCM.cgst += itc.cgst_amount || 0;
        table.inwardSuppliesNonRCM.sgst += itc.sgst_amount || 0;
        table.inwardSuppliesNonRCM.cess += itc.cess_amount || 0;
      }
    });

    // Calculate total ITC
    const totalITC = {
      igst: table.importOfGoods.igst + table.importOfServices.igst + 
            table.inwardSuppliesRCM.igst + table.inwardSuppliesNonRCM.igst + 
            table.allOtherITC.igst,
      cgst: table.inwardSuppliesRCM.cgst + table.inwardSuppliesNonRCM.cgst + 
            table.allOtherITC.cgst,
      sgst: table.inwardSuppliesRCM.sgst + table.inwardSuppliesNonRCM.sgst + 
            table.allOtherITC.sgst,
      cess: table.importOfGoods.cess + table.importOfServices.cess + 
            table.inwardSuppliesRCM.cess + table.inwardSuppliesNonRCM.cess + 
            table.allOtherITC.cess
    };

    // Round all values
    Object.keys(table).forEach(key => {
      Object.keys(table[key]).forEach(field => {
        table[key][field] = this.round(table[key][field]);
      });
    });

    table.totalITC = {
      igst: this.round(totalITC.igst),
      cgst: this.round(totalITC.cgst),
      sgst: this.round(totalITC.sgst),
      cess: this.round(totalITC.cess)
    };

    return table;
  }

  /**
   * Table 5: ITC Reversal/Reclaim
   */
  generateTable5(itcData) {
    const reversals = itcData.filter(itc => itc.is_reversal);
    const reclaims = itcData.filter(itc => itc.is_reclaim);

    const table = {
      rule42: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      rule43: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      others: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      totalReversal: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
      netITC: { igst: 0, cgst: 0, sgst: 0, cess: 0 }
    };

    reversals.forEach(rev => {
      if (rev.reversal_rule === 'RULE_42') {
        table.rule42.igst += rev.igst_amount || 0;
        table.rule42.cgst += rev.cgst_amount || 0;
        table.rule42.sgst += rev.sgst_amount || 0;
        table.rule42.cess += rev.cess_amount || 0;
      } else if (rev.reversal_rule === 'RULE_43') {
        table.rule43.igst += rev.igst_amount || 0;
        table.rule43.cgst += rev.cgst_amount || 0;
        table.rule43.sgst += rev.sgst_amount || 0;
        table.rule43.cess += rev.cess_amount || 0;
      } else {
        table.others.igst += rev.igst_amount || 0;
        table.others.cgst += rev.cgst_amount || 0;
        table.others.sgst += rev.sgst_amount || 0;
        table.others.cess += rev.cess_amount || 0;
      }
    });

    // Calculate total reversal
    table.totalReversal = {
      igst: table.rule42.igst + table.rule43.igst + table.others.igst,
      cgst: table.rule42.cgst + table.rule43.cgst + table.others.cgst,
      sgst: table.rule42.sgst + table.rule43.sgst + table.others.sgst,
      cess: table.rule42.cess + table.rule43.cess + table.others.cess
    };

    // Round all values
    Object.keys(table).forEach(key => {
      Object.keys(table[key]).forEach(field => {
        table[key][field] = this.round(table[key][field]);
      });
    });

    return table;
  }

  /**
   * Table 6: Tax Liability
   */
  generateTable6(table31, table4, table5) {
    // Tax payable = Output tax - ITC available + ITC reversal
    const outputTax = {
      igst: table31.outwardTaxableSupplies.igst + 
            table31.outwardTaxableSuppliesZeroRated.igst + 
            table31.inwardSuppliesRCM.igst,
      cgst: table31.outwardTaxableSupplies.cgst + 
            table31.inwardSuppliesRCM.cgst,
      sgst: table31.outwardTaxableSupplies.sgst + 
            table31.inwardSuppliesRCM.sgst,
      cess: table31.outwardTaxableSupplies.cess + 
            table31.outwardTaxableSuppliesZeroRated.cess + 
            table31.inwardSuppliesRCM.cess
    };

    const itcAvailable = table4.totalITC;
    const itcReversal = table5.totalReversal;

    const taxPayable = {
      igst: Math.max(0, outputTax.igst - itcAvailable.igst + itcReversal.igst),
      cgst: Math.max(0, outputTax.cgst - itcAvailable.cgst + itcReversal.cgst),
      sgst: Math.max(0, outputTax.sgst - itcAvailable.sgst + itcReversal.sgst),
      cess: Math.max(0, outputTax.cess - itcAvailable.cess + itcReversal.cess)
    };

    return {
      taxPayable: {
        igst: this.round(taxPayable.igst),
        cgst: this.round(taxPayable.cgst),
        sgst: this.round(taxPayable.sgst),
        cess: this.round(taxPayable.cess)
      },
      paidThroughCash: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      paidThroughITC: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      interest: {
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      lateFee: {
        cgst: 0,
        sgst: 0
      }
    };
  }

  /**
   * Get outward supplies
   */
  async getOutwardSupplies(db, gstin, fromDate, toDate) {
    const result = await db.executeSql(
      `SELECT * FROM gst_invoices 
       WHERE supplier_gstin = ? 
       AND invoice_date >= ? 
       AND invoice_date <= ?
       AND document_type = 'INVOICE'`,
      [gstin, fromDate, toDate]
    );

    const supplies = [];
    for (let i = 0; i < result.rows.length; i++) {
      supplies.push(result.rows.item(i));
    }

    return supplies;
  }

  /**
   * Get inward supplies
   */
  async getInwardSupplies(db, gstin, fromDate, toDate) {
    const result = await db.executeSql(
      `SELECT * FROM gst_purchases 
       WHERE recipient_gstin = ? 
       AND purchase_date >= ? 
       AND purchase_date <= ?`,
      [gstin, fromDate, toDate]
    );

    const supplies = [];
    for (let i = 0; i < result.rows.length; i++) {
      supplies.push(result.rows.item(i));
    }

    return supplies;
  }

  /**
   * Get ITC data
   */
  async getITCData(db, gstin, fromDate, toDate) {
    const result = await db.executeSql(
      `SELECT * FROM itc_ledger 
       WHERE gstin = ? 
       AND transaction_date >= ? 
       AND transaction_date <= ?`,
      [gstin, fromDate, toDate]
    );

    const itcData = [];
    for (let i = 0; i < result.rows.length; i++) {
      itcData.push(result.rows.item(i));
    }

    return itcData;
  }

  /**
   * Round to 2 decimals
   */
  round(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Export GSTR-3B to JSON
   */
  exportToJSON(gstr3bData) {
    return JSON.stringify(gstr3bData, null, 2);
  }

  /**
   * Validate GSTR-3B
   */
  validateGSTR3B(gstr3bData) {
    const errors = [];

    if (!gstr3bData.gstin) {
      errors.push('GSTIN is required');
    }

    if (!gstr3bData.returnPeriod) {
      errors.push('Return period is required');
    }

    // Validate tax liability
    const table6 = gstr3bData.tables.table6;
    if (table6.taxPayable.igst < 0 || table6.taxPayable.cgst < 0 || 
        table6.taxPayable.sgst < 0 || table6.taxPayable.cess < 0) {
      errors.push('Tax payable cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Create singleton instance
const gstr3bService = new GSTR3BService();

export default gstr3bService;
export { GSTR3BService };
