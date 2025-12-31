/**
 * GST Calculator Module for MindStack
 * Implements Indian GST calculation logic as per 2025 reforms
 * Supports: 0%, 5%, 18%, 40% rates, CGST+SGST/IGST, ITC, RCM
 */

/**
 * GST Rate Configuration (Updated September 2025)
 */
export const GST_RATES = {
  NIL: 0,
  RATE_5: 5,
  RATE_18: 18,
  RATE_40: 40
};

/**
 * State Codes for GST
 */
export const STATE_CODES = {
  'JAMMU_AND_KASHMIR': '01',
  'HIMACHAL_PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR_PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL_PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST_BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA_PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN_AND_DIU': '25',
  'DADRA_AND_NAGAR_HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA_PRADESH': '28',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL_NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN_AND_NICOBAR': '35',
  'TELANGANA': '36',
  'ANDHRA_PRADESH_NEW': '37',
  'LADAKH': '38'
};

/**
 * Determine GST Type based on state codes
 * @param {string} supplierStateCode - Supplier's state code
 * @param {string} recipientStateCode - Recipient's state code
 * @returns {string} - 'INTRA_STATE' or 'INTER_STATE'
 */
export const determineGSTType = (supplierStateCode, recipientStateCode) => {
  if (!supplierStateCode || !recipientStateCode) {
    throw new Error('State codes are required');
  }
  
  return supplierStateCode === recipientStateCode ? 'INTRA_STATE' : 'INTER_STATE';
};

/**
 * Calculate GST (Forward Calculation)
 * From amount including GST to base amount + GST breakdown
 * @param {number} amountInclGST - Amount including GST
 * @param {number} gstRate - GST rate (5, 18, 40)
 * @returns {object} - { baseAmount, gstAmount, total }
 */
export const calculateGSTForward = (amountInclGST, gstRate) => {
  if (amountInclGST < 0) {
    throw new Error('Amount cannot be negative');
  }
  
  if (gstRate === 0) {
    return {
      baseAmount: parseFloat(amountInclGST.toFixed(2)),
      gstAmount: 0,
      total: parseFloat(amountInclGST.toFixed(2))
    };
  }
  
  const gstAmount = amountInclGST * (gstRate / (100 + gstRate));
  const baseAmount = amountInclGST - gstAmount;
  
  return {
    baseAmount: parseFloat(baseAmount.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    total: parseFloat(amountInclGST.toFixed(2))
  };
};

/**
 * Calculate GST (Reverse Calculation)
 * From base amount (excluding GST) to total including GST
 * @param {number} baseAmount - Amount excluding GST
 * @param {number} gstRate - GST rate (5, 18, 40)
 * @returns {object} - { baseAmount, gstAmount, total }
 */
export const calculateGSTReverse = (baseAmount, gstRate) => {
  if (baseAmount < 0) {
    throw new Error('Amount cannot be negative');
  }
  
  if (gstRate === 0) {
    return {
      baseAmount: parseFloat(baseAmount.toFixed(2)),
      gstAmount: 0,
      total: parseFloat(baseAmount.toFixed(2))
    };
  }
  
  const gstAmount = baseAmount * (gstRate / 100);
  const total = baseAmount + gstAmount;
  
  return {
    baseAmount: parseFloat(baseAmount.toFixed(2)),
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

/**
 * Calculate GST breakdown (CGST+SGST or IGST)
 * @param {number} taxableValue - Taxable amount
 * @param {number} gstRate - GST rate
 * @param {string} gstType - 'INTRA_STATE' or 'INTER_STATE'
 * @returns {object} - { cgst, sgst, igst, totalGST }
 */
export const calculateGSTBreakdown = (taxableValue, gstRate, gstType) => {
  if (taxableValue < 0) {
    throw new Error('Taxable value cannot be negative');
  }
  
  const totalGST = taxableValue * (gstRate / 100);
  
  if (gstType === 'INTRA_STATE') {
    const cgst = totalGST / 2;
    const sgst = totalGST / 2;
    
    return {
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: 0,
      totalGST: parseFloat(totalGST.toFixed(2)),
      cgstRate: gstRate / 2,
      sgstRate: gstRate / 2,
      igstRate: 0
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: parseFloat(totalGST.toFixed(2)),
      totalGST: parseFloat(totalGST.toFixed(2)),
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate
    };
  }
};

/**
 * Calculate line item GST for invoice
 * @param {number} qty - Quantity
 * @param {number} rate - Rate per unit
 * @param {number} discount - Discount amount
 * @param {number} gstRate - GST rate
 * @param {string} gstType - 'INTRA_STATE' or 'INTER_STATE'
 * @returns {object} - Complete line item calculation
 */
export const calculateLineItemGST = (qty, rate, discount = 0, gstRate, gstType) => {
  const grossAmount = qty * rate;
  const taxableValue = grossAmount - discount;
  const gstBreakdown = calculateGSTBreakdown(taxableValue, gstRate, gstType);
  const totalAmount = taxableValue + gstBreakdown.totalGST;
  
  return {
    qty,
    rate: parseFloat(rate.toFixed(2)),
    grossAmount: parseFloat(grossAmount.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    taxableValue: parseFloat(taxableValue.toFixed(2)),
    gstRate,
    ...gstBreakdown,
    totalAmount: parseFloat(totalAmount.toFixed(2))
  };
};

/**
 * Calculate complete invoice with GST
 * @param {Array} items - Array of line items
 * @param {string} supplierState - Supplier state code
 * @param {string} recipientState - Recipient state code
 * @returns {object} - Complete invoice calculation
 */
export const calculateInvoice = (items, supplierState, recipientState) => {
  const gstType = determineGSTType(supplierState, recipientState);
  
  let totalTaxableValue = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalDiscount = 0;
  
  const processedItems = items.map((item, index) => {
    const lineItem = calculateLineItemGST(
      item.qty,
      item.rate,
      item.discount || 0,
      item.gstRate,
      gstType
    );
    
    totalTaxableValue += lineItem.taxableValue;
    totalCGST += lineItem.cgst;
    totalSGST += lineItem.sgst;
    totalIGST += lineItem.igst;
    totalDiscount += lineItem.discount;
    
    return {
      slNo: index + 1,
      description: item.description,
      hsnCode: item.hsnCode,
      sacCode: item.sacCode,
      ...lineItem
    };
  });
  
  const totalGST = totalCGST + totalSGST + totalIGST;
  const subtotal = totalTaxableValue + totalDiscount;
  const totalBeforeRoundOff = totalTaxableValue + totalGST;
  const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
  const totalAmount = Math.round(totalBeforeRoundOff);
  
  return {
    items: processedItems,
    gstType,
    summary: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalDiscount: parseFloat(totalDiscount.toFixed(2)),
      totalTaxableValue: parseFloat(totalTaxableValue.toFixed(2)),
      totalCGST: parseFloat(totalCGST.toFixed(2)),
      totalSGST: parseFloat(totalSGST.toFixed(2)),
      totalIGST: parseFloat(totalIGST.toFixed(2)),
      totalGST: parseFloat(totalGST.toFixed(2)),
      roundOff: parseFloat(roundOff.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    }
  };
};

/**
 * Calculate Input Tax Credit (ITC)
 * @param {number} inputGST - Total input GST paid
 * @param {number} outputGST - Total output GST collected
 * @returns {object} - ITC calculation
 */
export const calculateITC = (inputGST, outputGST) => {
  const itcClaim = Math.min(inputGST, outputGST);
  const gstPayable = Math.max(0, outputGST - itcClaim);
  const itcCarryForward = Math.max(0, inputGST - itcClaim);
  
  return {
    inputGST: parseFloat(inputGST.toFixed(2)),
    outputGST: parseFloat(outputGST.toFixed(2)),
    itcClaimed: parseFloat(itcClaim.toFixed(2)),
    gstPayable: parseFloat(gstPayable.toFixed(2)),
    itcCarryForward: parseFloat(itcCarryForward.toFixed(2))
  };
};

/**
 * Calculate ITC breakdown (CGST, SGST, IGST)
 * @param {object} inputGST - { cgst, sgst, igst }
 * @param {object} outputGST - { cgst, sgst, igst }
 * @returns {object} - Detailed ITC calculation
 */
export const calculateITCBreakdown = (inputGST, outputGST) => {
  // CGST ITC
  const cgstITC = Math.min(inputGST.cgst, outputGST.cgst);
  const cgstPayable = Math.max(0, outputGST.cgst - cgstITC);
  const cgstCarryForward = Math.max(0, inputGST.cgst - cgstITC);
  
  // SGST ITC
  const sgstITC = Math.min(inputGST.sgst, outputGST.sgst);
  const sgstPayable = Math.max(0, outputGST.sgst - sgstITC);
  const sgstCarryForward = Math.max(0, inputGST.sgst - sgstITC);
  
  // IGST ITC (can be used for CGST+SGST)
  let igstITC = 0;
  let igstPayable = outputGST.igst;
  let igstCarryForward = inputGST.igst;
  
  // Use IGST ITC for IGST liability first
  if (inputGST.igst > 0 && outputGST.igst > 0) {
    igstITC = Math.min(inputGST.igst, outputGST.igst);
    igstPayable = Math.max(0, outputGST.igst - igstITC);
    igstCarryForward = Math.max(0, inputGST.igst - igstITC);
  }
  
  // Cross-utilization: IGST ITC can be used for CGST+SGST
  if (igstCarryForward > 0) {
    // Use for CGST
    const cgstFromIGST = Math.min(igstCarryForward, cgstPayable);
    cgstPayable -= cgstFromIGST;
    igstCarryForward -= cgstFromIGST;
    
    // Use for SGST
    const sgstFromIGST = Math.min(igstCarryForward, sgstPayable);
    sgstPayable -= sgstFromIGST;
    igstCarryForward -= sgstFromIGST;
  }
  
  return {
    itcClaimed: {
      cgst: parseFloat(cgstITC.toFixed(2)),
      sgst: parseFloat(sgstITC.toFixed(2)),
      igst: parseFloat(igstITC.toFixed(2)),
      total: parseFloat((cgstITC + sgstITC + igstITC).toFixed(2))
    },
    gstPayable: {
      cgst: parseFloat(cgstPayable.toFixed(2)),
      sgst: parseFloat(sgstPayable.toFixed(2)),
      igst: parseFloat(igstPayable.toFixed(2)),
      total: parseFloat((cgstPayable + sgstPayable + igstPayable).toFixed(2))
    },
    itcCarryForward: {
      cgst: parseFloat(cgstCarryForward.toFixed(2)),
      sgst: parseFloat(sgstCarryForward.toFixed(2)),
      igst: parseFloat(igstCarryForward.toFixed(2)),
      total: parseFloat((cgstCarryForward + sgstCarryForward + igstCarryForward).toFixed(2))
    }
  };
};

/**
 * Calculate Reverse Charge Mechanism (RCM)
 * @param {number} amount - Transaction amount
 * @param {number} gstRate - GST rate
 * @param {boolean} isRCMApplicable - Whether RCM applies
 * @returns {object} - RCM calculation
 */
export const calculateRCM = (amount, gstRate, isRCMApplicable = false) => {
  if (!isRCMApplicable) {
    return {
      baseAmount: parseFloat(amount.toFixed(2)),
      rcmAmount: 0,
      totalPayable: parseFloat(amount.toFixed(2)),
      rcmApplicable: false
    };
  }
  
  const rcmAmount = amount * (gstRate / 100);
  const totalPayable = amount + rcmAmount;
  
  return {
    baseAmount: parseFloat(amount.toFixed(2)),
    rcmAmount: parseFloat(rcmAmount.toFixed(2)),
    totalPayable: parseFloat(totalPayable.toFixed(2)),
    gstRate,
    rcmApplicable: true
  };
};

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {object} - { valid, stateCode, panNumber, entityNumber, checksum }
 */
export const validateGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== 'string') {
    return { valid: false, error: 'GSTIN is required' };
  }
  
  // GSTIN format: 22AAAAA0000A1Z5
  // 2 digits state code + 10 digits PAN + 1 digit entity number + 1 letter Z + 1 digit checksum
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin)) {
    return { valid: false, error: 'Invalid GSTIN format' };
  }
  
  return {
    valid: true,
    stateCode: gstin.substring(0, 2),
    panNumber: gstin.substring(2, 12),
    entityNumber: gstin.substring(12, 13),
    checksum: gstin.substring(14, 15)
  };
};

/**
 * Generate QR Code data for GST invoice
 * @param {object} invoice - Invoice object
 * @returns {string} - QR code data string
 */
export const generateInvoiceQRData = (invoice) => {
  const qrData = {
    SupplierGSTIN: invoice.supplierGSTIN,
    InvoiceNo: invoice.invoiceNo,
    InvoiceDate: invoice.invoiceDate,
    InvoiceValue: invoice.totalAmount,
    PlaceOfSupply: invoice.placeOfSupply,
    ReverseCharge: invoice.reverseCharge ? 'Y' : 'N',
    InvoiceType: invoice.invoiceType || 'INV',
    HSN: invoice.items.map(i => i.hsnCode).filter(Boolean).join(',')
  };
  
  // Format: Key1=Value1|Key2=Value2|...
  return Object.entries(qrData)
    .map(([key, value]) => `${key}=${value}`)
    .join('|');
};

/**
 * Convert number to words (for invoice amount)
 * @param {number} amount - Amount to convert
 * @returns {string} - Amount in words
 */
export const amountToWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanThousand = (num) => {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertLessThanThousand(num % 100) : '');
  };
  
  if (amount === 0) return 'Zero Rupees Only';
  
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  
  let result = '';
  
  // Crores
  if (rupees >= 10000000) {
    result += convertLessThanThousand(Math.floor(rupees / 10000000)) + ' Crore ';
    rupees %= 10000000;
  }
  
  // Lakhs
  if (rupees >= 100000) {
    result += convertLessThanThousand(Math.floor(rupees / 100000)) + ' Lakh ';
    rupees %= 100000;
  }
  
  // Thousands
  if (rupees >= 1000) {
    result += convertLessThanThousand(Math.floor(rupees / 1000)) + ' Thousand ';
    rupees %= 1000;
  }
  
  // Hundreds
  if (rupees > 0) {
    result += convertLessThanThousand(rupees) + ' ';
  }
  
  result += 'Rupees';
  
  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }
  
  return result.trim() + ' Only';
};

export default {
  GST_RATES,
  STATE_CODES,
  determineGSTType,
  calculateGSTForward,
  calculateGSTReverse,
  calculateGSTBreakdown,
  calculateLineItemGST,
  calculateInvoice,
  calculateITC,
  calculateITCBreakdown,
  calculateRCM,
  validateGSTIN,
  generateInvoiceQRData,
  amountToWords
};
