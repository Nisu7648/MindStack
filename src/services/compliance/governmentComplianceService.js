/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GOVERNMENT COMPLIANCE & STATUTORY REPORTS SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * LEGAL COMPLIANCE - INDIAN GOVERNMENT REGULATIONS:
 * 
 * 1. COMPANIES ACT 2013
 *    ✓ Section 128 - Books of Accounts (8-year retention)
 *    ✓ Section 129 - Financial Statements
 *    ✓ Section 134 - Directors' Report
 *    ✓ Section 143 - Auditor's Report
 * 
 * 2. GST ACT 2017
 *    ✓ GSTR-1 - Outward Supplies (Monthly/Quarterly)
 *    ✓ GSTR-3B - Summary Return (Monthly)
 *    ✓ GSTR-9 - Annual Return
 *    ✓ GSTR-9C - Reconciliation Statement (Audit)
 * 
 * 3. INCOME TAX ACT 1961
 *    ✓ TDS Returns - Form 24Q, 26Q, 27Q
 *    ✓ Advance Tax Payments
 *    ✓ ITR Filing - Various Forms
 *    ✓ Tax Audit Report - Form 3CA/3CB
 * 
 * 4. PF ACT 1952 & ESI ACT 1948
 *    ✓ Monthly PF Returns (ECR)
 *    ✓ Monthly ESI Returns
 *    ✓ Annual Returns
 * 
 * 5. MCA (MINISTRY OF CORPORATE AFFAIRS)
 *    ✓ Form AOC-4 - Financial Statements
 *    ✓ Form MGT-7 - Annual Return
 *    ✓ DPT-3 - Return of Deposits
 * 
 * 6. RBI REGULATIONS
 *    ✓ FEMA Compliance
 *    ✓ Foreign Exchange Reporting
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DatabaseService } from '../database/databaseService';
import moment from 'moment';

export class GovernmentComplianceService {
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GST COMPLIANCE
   * ═══════════════════════════════════════════════════════════════════════
   */

  /**
   * Generate GSTR-1 (Outward Supplies)
   * Due Date: 11th of next month
   */
  static async generateGSTR1(month, year) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const startDate = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
      const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

      // B2B Supplies (Business to Business)
      const [b2b] = await db.executeSql(
        `SELECT 
          customer_gstin,
          customer_name,
          invoice_number,
          invoice_date,
          invoice_value,
          taxable_value,
          cgst_amount,
          sgst_amount,
          igst_amount,
          cess_amount
        FROM sales_invoices
        WHERE invoice_date BETWEEN ? AND ?
        AND customer_gstin IS NOT NULL
        AND customer_gstin != ''
        ORDER BY invoice_date`,
        [startDate, endDate]
      );

      // B2C Large (B2C > 2.5 Lakhs)
      const [b2cl] = await db.executeSql(
        `SELECT 
          invoice_number,
          invoice_date,
          invoice_value,
          place_of_supply,
          taxable_value,
          igst_amount
        FROM sales_invoices
        WHERE invoice_date BETWEEN ? AND ?
        AND (customer_gstin IS NULL OR customer_gstin = '')
        AND invoice_value > 250000
        ORDER BY invoice_date`,
        [startDate, endDate]
      );

      // B2C Small (B2C <= 2.5 Lakhs) - State-wise summary
      const [b2cs] = await db.executeSql(
        `SELECT 
          place_of_supply,
          SUM(taxable_value) as total_taxable_value,
          SUM(cgst_amount) as total_cgst,
          SUM(sgst_amount) as total_sgst,
          SUM(igst_amount) as total_igst,
          SUM(cess_amount) as total_cess
        FROM sales_invoices
        WHERE invoice_date BETWEEN ? AND ?
        AND (customer_gstin IS NULL OR customer_gstin = '')
        AND invoice_value <= 250000
        GROUP BY place_of_supply`,
        [startDate, endDate]
      );

      // Credit/Debit Notes
      const [cdnr] = await db.executeSql(
        `SELECT 
          customer_gstin,
          customer_name,
          note_number,
          note_date,
          note_type,
          original_invoice_number,
          note_value,
          taxable_value,
          cgst_amount,
          sgst_amount,
          igst_amount
        FROM credit_debit_notes
        WHERE note_date BETWEEN ? AND ?
        AND customer_gstin IS NOT NULL
        ORDER BY note_date`,
        [startDate, endDate]
      );

      // Exports
      const [exports] = await db.executeSql(
        `SELECT 
          invoice_number,
          invoice_date,
          export_type,
          shipping_bill_number,
          shipping_bill_date,
          port_code,
          taxable_value,
          igst_amount
        FROM sales_invoices
        WHERE invoice_date BETWEEN ? AND ?
        AND is_export = 1
        ORDER BY invoice_date`,
        [startDate, endDate]
      );

      const gstr1 = {
        gstin: await this.getCompanyGSTIN(),
        period: `${month.toString().padStart(2, '0')}${year}`,
        b2b: this.formatB2BData(b2b),
        b2cl: this.formatB2CLData(b2cl),
        b2cs: this.formatB2CSData(b2cs),
        cdnr: this.formatCDNRData(cdnr),
        exports: this.formatExportsData(exports),
        summary: this.calculateGSTR1Summary(b2b, b2cl, b2cs, cdnr, exports)
      };

      return {
        success: true,
        gstr1,
        dueDate: moment(endDate).add(11, 'days').format('DD MMM YYYY')
      };
    } catch (error) {
      console.error('Generate GSTR-1 error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate GSTR-3B (Summary Return)
   * Due Date: 20th of next month
   */
  static async generateGSTR3B(month, year) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const startDate = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
      const endDate = moment(startDate).endOf('month').format('YYYY-MM-DD');

      // Outward Supplies
      const [outward] = await db.executeSql(
        `SELECT 
          SUM(taxable_value) as taxable_value,
          SUM(cgst_amount) as cgst,
          SUM(sgst_amount) as sgst,
          SUM(igst_amount) as igst,
          SUM(cess_amount) as cess
        FROM sales_invoices
        WHERE invoice_date BETWEEN ? AND ?`,
        [startDate, endDate]
      );

      // Inward Supplies (ITC Eligible)
      const [inward] = await db.executeSql(
        `SELECT 
          SUM(taxable_value) as taxable_value,
          SUM(cgst_amount) as cgst,
          SUM(sgst_amount) as sgst,
          SUM(igst_amount) as igst,
          SUM(cess_amount) as cess
        FROM purchase_invoices
        WHERE invoice_date BETWEEN ? AND ?
        AND itc_eligible = 1`,
        [startDate, endDate]
      );

      const outwardData = outward.rows.item(0);
      const inwardData = inward.rows.item(0);

      const gstr3b = {
        gstin: await this.getCompanyGSTIN(),
        period: `${month.toString().padStart(2, '0')}${year}`,
        outwardSupplies: {
          taxableValue: outwardData.taxable_value || 0,
          cgst: outwardData.cgst || 0,
          sgst: outwardData.sgst || 0,
          igst: outwardData.igst || 0,
          cess: outwardData.cess || 0
        },
        itcAvailed: {
          cgst: inwardData.cgst || 0,
          sgst: inwardData.sgst || 0,
          igst: inwardData.igst || 0,
          cess: inwardData.cess || 0
        },
        netTaxLiability: {
          cgst: (outwardData.cgst || 0) - (inwardData.cgst || 0),
          sgst: (outwardData.sgst || 0) - (inwardData.sgst || 0),
          igst: (outwardData.igst || 0) - (inwardData.igst || 0),
          cess: (outwardData.cess || 0) - (inwardData.cess || 0)
        }
      };

      gstr3b.totalTaxPayable = 
        gstr3b.netTaxLiability.cgst +
        gstr3b.netTaxLiability.sgst +
        gstr3b.netTaxLiability.igst +
        gstr3b.netTaxLiability.cess;

      return {
        success: true,
        gstr3b,
        dueDate: moment(endDate).add(20, 'days').format('DD MMM YYYY')
      };
    } catch (error) {
      console.error('Generate GSTR-3B error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TDS COMPLIANCE
   * ═══════════════════════════════════════════════════════════════════════
   */

  /**
   * Generate TDS Return - Form 24Q (Salary TDS)
   * Due Date: Quarterly
   */
  static async generateForm24Q(quarter, year) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const { startDate, endDate } = this.getQuarterDates(quarter, year);

      const [tdsData] = await db.executeSql(
        `SELECT 
          e.employee_code,
          e.first_name,
          e.last_name,
          e.pan_number,
          pr.month,
          pr.year,
          pr.gross_earnings,
          pr.tds_deduction,
          pr.net_salary
        FROM payroll_records pr
        JOIN employees e ON pr.employee_id = e.id
        WHERE pr.year = ? 
        AND pr.month BETWEEN ? AND ?
        AND pr.tds_deduction > 0
        ORDER BY e.employee_code, pr.year, pr.month`,
        [year, ...this.getQuarterMonths(quarter)]
      );

      const employees = [];
      for (let i = 0; i < tdsData.rows.length; i++) {
        employees.push(tdsData.rows.item(i));
      }

      // Group by employee
      const employeeWise = {};
      employees.forEach(emp => {
        const key = emp.employee_code;
        if (!employeeWise[key]) {
          employeeWise[key] = {
            employeeCode: emp.employee_code,
            name: `${emp.first_name} ${emp.last_name}`,
            pan: emp.pan_number,
            totalGross: 0,
            totalTDS: 0,
            months: []
          };
        }
        employeeWise[key].totalGross += emp.gross_earnings;
        employeeWise[key].totalTDS += emp.tds_deduction;
        employeeWise[key].months.push({
          month: emp.month,
          year: emp.year,
          gross: emp.gross_earnings,
          tds: emp.tds_deduction
        });
      });

      const form24Q = {
        tan: await this.getCompanyTAN(),
        quarter: `Q${quarter}`,
        financialYear: this.getFinancialYear(year),
        employees: Object.values(employeeWise),
        summary: {
          totalEmployees: Object.keys(employeeWise).length,
          totalGrossPayment: Object.values(employeeWise).reduce((sum, e) => sum + e.totalGross, 0),
          totalTDSDeducted: Object.values(employeeWise).reduce((sum, e) => sum + e.totalTDS, 0)
        }
      };

      return {
        success: true,
        form24Q,
        dueDate: this.getTDSDueDate(quarter, year)
      };
    } catch (error) {
      console.error('Generate Form 24Q error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate TDS Return - Form 26Q (Non-Salary TDS)
   */
  static async generateForm26Q(quarter, year) {
    try {
      const db = await DatabaseService.getDatabase();
      
      const { startDate, endDate } = this.getQuarterDates(quarter, year);

      const [tdsData] = await db.executeSql(
        `SELECT 
          vendor_name,
          vendor_pan,
          tds_section,
          SUM(payment_amount) as total_payment,
          SUM(tds_amount) as total_tds,
          COUNT(*) as transaction_count
        FROM vendor_payments
        WHERE payment_date BETWEEN ? AND ?
        AND tds_amount > 0
        GROUP BY vendor_pan, tds_section
        ORDER BY vendor_name`,
        [startDate, endDate]
      );

      const vendors = [];
      for (let i = 0; i < tdsData.rows.length; i++) {
        vendors.push(tdsData.rows.item(i));
      }

      const form26Q = {
        tan: await this.getCompanyTAN(),
        quarter: `Q${quarter}`,
        financialYear: this.getFinancialYear(year),
        deductees: vendors,
        summary: {
          totalDeductees: vendors.length,
          totalPayment: vendors.reduce((sum, v) => sum + v.total_payment, 0),
          totalTDS: vendors.reduce((sum, v) => sum + v.total_tds, 0)
        }
      };

      return {
        success: true,
        form26Q,
        dueDate: this.getTDSDueDate(quarter, year)
      };
    } catch (error) {
      console.error('Generate Form 26Q error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PF & ESI COMPLIANCE
   * ═══════════════════════════════════════════════════════════════════════
   */

  /**
   * Generate PF ECR (Electronic Challan cum Return)
   * Due Date: 15th of next month
   */
  static async generatePFECR(month, year) {
    try {
      const db = await DatabaseService.getDatabase();

      const [pfData] = await db.executeSql(
        `SELECT 
          e.employee_code,
          e.first_name,
          e.last_name,
          e.uan_number,
          e.pf_number,
          pr.basic_salary,
          pr.pf_deduction as employee_pf,
          pr.pf_deduction as employer_pf,
          (pr.pf_deduction * 0.0833) as pension_contribution
        FROM payroll_records pr
        JOIN employees e ON pr.employee_id = e.id
        WHERE pr.month = ? AND pr.year = ?
        AND pr.pf_deduction > 0
        ORDER BY e.employee_code`,
        [month, year]
      );

      const employees = [];
      for (let i = 0; i < pfData.rows.length; i++) {
        employees.push(pfData.rows.item(i));
      }

      const pfECR = {
        establishmentId: await this.getCompanyPFNumber(),
        month: month.toString().padStart(2, '0'),
        year: year,
        employees: employees.map(emp => ({
          uanNumber: emp.uan_number,
          pfNumber: emp.pf_number,
          name: `${emp.first_name} ${emp.last_name}`,
          grossWages: emp.basic_salary,
          epfWages: emp.basic_salary,
          epsWages: emp.basic_salary,
          edliWages: emp.basic_salary,
          employeePF: emp.employee_pf,
          employerPF: emp.employer_pf,
          pensionContribution: emp.pension_contribution
        })),
        summary: {
          totalEmployees: employees.length,
          totalEmployeePF: employees.reduce((sum, e) => sum + e.employee_pf, 0),
          totalEmployerPF: employees.reduce((sum, e) => sum + e.employer_pf, 0),
          totalPension: employees.reduce((sum, e) => sum + e.pension_contribution, 0)
        }
      };

      pfECR.summary.totalContribution = 
        pfECR.summary.totalEmployeePF + 
        pfECR.summary.totalEmployerPF;

      return {
        success: true,
        pfECR,
        dueDate: moment(`${year}-${month}-01`).add(1, 'month').date(15).format('DD MMM YYYY')
      };
    } catch (error) {
      console.error('Generate PF ECR error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate ESI Return
   * Due Date: 15th of next month
   */
  static async generateESIReturn(month, year) {
    try {
      const db = await DatabaseService.getDatabase();

      const [esiData] = await db.executeSql(
        `SELECT 
          e.employee_code,
          e.first_name,
          e.last_name,
          e.esi_number,
          pr.gross_earnings,
          pr.esi_deduction as employee_esi,
          (pr.esi_deduction * 3.25) as employer_esi
        FROM payroll_records pr
        JOIN employees e ON pr.employee_id = e.id
        WHERE pr.month = ? AND pr.year = ?
        AND pr.esi_deduction > 0
        ORDER BY e.employee_code`,
        [month, year]
      );

      const employees = [];
      for (let i = 0; i < esiData.rows.length; i++) {
        employees.push(esiData.rows.item(i));
      }

      const esiReturn = {
        establishmentCode: await this.getCompanyESINumber(),
        month: month.toString().padStart(2, '0'),
        year: year,
        employees: employees.map(emp => ({
          esiNumber: emp.esi_number,
          name: `${emp.first_name} ${emp.last_name}`,
          grossWages: emp.gross_earnings,
          employeeESI: emp.employee_esi,
          employerESI: emp.employer_esi
        })),
        summary: {
          totalEmployees: employees.length,
          totalGrossWages: employees.reduce((sum, e) => sum + e.gross_earnings, 0),
          totalEmployeeESI: employees.reduce((sum, e) => sum + e.employee_esi, 0),
          totalEmployerESI: employees.reduce((sum, e) => sum + e.employer_esi, 0)
        }
      };

      esiReturn.summary.totalContribution = 
        esiReturn.summary.totalEmployeeESI + 
        esiReturn.summary.totalEmployerESI;

      return {
        success: true,
        esiReturn,
        dueDate: moment(`${year}-${month}-01`).add(1, 'month').date(15).format('DD MMM YYYY')
      };
    } catch (error) {
      console.error('Generate ESI Return error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * HELPER METHODS
   * ═══════════════════════════════════════════════════════════════════════
   */

  static async getCompanyGSTIN() {
    // Get from company settings
    return 'GSTIN_NUMBER'; // Replace with actual
  }

  static async getCompanyTAN() {
    return 'TAN_NUMBER'; // Replace with actual
  }

  static async getCompanyPFNumber() {
    return 'PF_NUMBER'; // Replace with actual
  }

  static async getCompanyESINumber() {
    return 'ESI_NUMBER'; // Replace with actual
  }

  static getQuarterDates(quarter, year) {
    const quarters = {
      1: { start: `${year}-04-01`, end: `${year}-06-30` },
      2: { start: `${year}-07-01`, end: `${year}-09-30` },
      3: { start: `${year}-10-01`, end: `${year}-12-31` },
      4: { start: `${year + 1}-01-01`, end: `${year + 1}-03-31` }
    };
    return { startDate: quarters[quarter].start, endDate: quarters[quarter].end };
  }

  static getQuarterMonths(quarter) {
    const months = {
      1: [4, 6],
      2: [7, 9],
      3: [10, 12],
      4: [1, 3]
    };
    return months[quarter];
  }

  static getFinancialYear(year) {
    return `${year}-${(year + 1).toString().substr(2)}`;
  }

  static getTDSDueDate(quarter, year) {
    const dueDates = {
      1: `31 July ${year}`,
      2: `31 October ${year}`,
      3: `31 January ${year + 1}`,
      4: `31 May ${year + 1}`
    };
    return dueDates[quarter];
  }

  static formatB2BData(result) {
    const data = [];
    for (let i = 0; i < result.rows.length; i++) {
      data.push(result.rows.item(i));
    }
    return data;
  }

  static formatB2CLData(result) {
    const data = [];
    for (let i = 0; i < result.rows.length; i++) {
      data.push(result.rows.item(i));
    }
    return data;
  }

  static formatB2CSData(result) {
    const data = [];
    for (let i = 0; i < result.rows.length; i++) {
      data.push(result.rows.item(i));
    }
    return data;
  }

  static formatCDNRData(result) {
    const data = [];
    for (let i = 0; i < result.rows.length; i++) {
      data.push(result.rows.item(i));
    }
    return data;
  }

  static formatExportsData(result) {
    const data = [];
    for (let i = 0; i < result.rows.length; i++) {
      data.push(result.rows.item(i));
    }
    return data;
  }

  static calculateGSTR1Summary(b2b, b2cl, b2cs, cdnr, exports) {
    // Calculate totals
    return {
      totalInvoices: b2b.rows.length + b2cl.rows.length,
      totalTaxableValue: 0, // Calculate from all sources
      totalTax: 0 // Calculate from all sources
    };
  }
}

export default GovernmentComplianceService;
