/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SWISS PAYROLL SERVICE - COMPLETE SWISS PAYROLL SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Handles all Swiss payroll components:
 * - AHV (Old-age and Survivors Insurance)
 * - IV (Disability Insurance)
 * - EO (Income Compensation)
 * - ALV (Unemployment Insurance)
 * - BVG (Occupational Pension)
 * - UVG (Accident Insurance)
 * - KTG (Daily Sickness Allowance)
 * - Cantonal taxes (all 26 cantons)
 * - Federal taxes
 * - Payslip generation
 * - Annual statements
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { JournalService } from '../accounting/journalService';

export class SwissPayrollService {
  static PAYROLL_KEY = '@mindstack_swiss_payroll';
  static EMPLOYEES_KEY = '@mindstack_employees';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CALCULATE SWISS PAYROLL
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculatePayroll(employeeId, month, year) {
    try {
      // Get employee data
      const employee = await this.getEmployee(employeeId);
      
      if (!employee) {
        return {
          success: false,
          error: 'Employee not found'
        };
      }

      const grossSalary = employee.grossSalary;
      const canton = employee.canton;
      const birthDate = employee.birthDate;
      const age = moment().diff(moment(birthDate), 'years');

      // Calculate all components
      const ahv = this.calculateAHV(grossSalary);
      const iv = this.calculateIV(grossSalary);
      const eo = this.calculateEO(grossSalary);
      const alv = this.calculateALV(grossSalary);
      const bvg = this.calculateBVG(grossSalary, age);
      const uvg = this.calculateUVG(grossSalary, employee.uvgRate || 1.0);
      const ktg = employee.ktgEnabled ? this.calculateKTG(grossSalary, employee.ktgRate || 1.5) : { employer: 0, employee: 0, total: 0 };
      
      // Calculate taxes
      const cantonalTax = await this.calculateCantonalTax(grossSalary, canton, employee.taxRate || 0);
      const federalTax = this.calculateFederalTax(grossSalary, employee.federalTaxRate || 0);
      const churchTax = employee.churchTaxEnabled ? this.calculateChurchTax(cantonalTax, employee.churchTaxRate || 0) : 0;

      // Calculate totals
      const totalEmployerContributions = 
        ahv.employer +
        iv.employer +
        eo.employer +
        alv.employer +
        bvg.employer +
        uvg.employer +
        ktg.employer;

      const totalEmployeeDeductions =
        ahv.employee +
        iv.employee +
        eo.employee +
        alv.employee +
        bvg.employee +
        uvg.employee +
        ktg.employee +
        cantonalTax +
        federalTax +
        churchTax;

      const netSalary = grossSalary - totalEmployeeDeductions;

      // Create payroll record
      const payroll = {
        id: `PAY-${employeeId}-${year}${String(month).padStart(2, '0')}`,
        employeeId: employee.id,
        employeeName: employee.name,
        month: month,
        year: year,
        period: `${moment().month(month - 1).format('MMMM')} ${year}`,
        
        // Salary
        grossSalary: grossSalary,
        
        // Social security contributions
        ahv: ahv,
        iv: iv,
        eo: eo,
        alv: alv,
        bvg: bvg,
        uvg: uvg,
        ktg: ktg,
        
        // Taxes
        cantonalTax: cantonalTax,
        federalTax: federalTax,
        churchTax: churchTax,
        
        // Totals
        totalEmployerContributions: totalEmployerContributions,
        totalEmployeeDeductions: totalEmployeeDeductions,
        netSalary: netSalary,
        
        // Employer total cost
        totalEmployerCost: grossSalary + totalEmployerContributions,
        
        // Status
        status: 'CALCULATED',
        calculatedAt: moment().toISOString(),
        calculatedBy: 'SYSTEM'
      };

      return {
        success: true,
        data: payroll
      };

    } catch (error) {
      console.error('Calculate payroll error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SOCIAL SECURITY CALCULATIONS
   * ═══════════════════════════════════════════════════════════════════════
   */

  /**
   * Calculate AHV (Old-age and Survivors Insurance)
   * Rate: 10.6% (5.3% employer + 5.3% employee)
   */
  static calculateAHV(grossSalary) {
    const rate = 10.6;
    const employerRate = 5.3;
    const employeeRate = 5.3;

    const total = (grossSalary * rate) / 100;
    const employer = (grossSalary * employerRate) / 100;
    const employee = (grossSalary * employeeRate) / 100;

    return {
      rate: rate,
      employerRate: employerRate,
      employeeRate: employeeRate,
      total: this.round(total),
      employer: this.round(employer),
      employee: this.round(employee)
    };
  }

  /**
   * Calculate IV (Disability Insurance)
   * Rate: 1.4% (0.7% employer + 0.7% employee)
   */
  static calculateIV(grossSalary) {
    const rate = 1.4;
    const employerRate = 0.7;
    const employeeRate = 0.7;

    const total = (grossSalary * rate) / 100;
    const employer = (grossSalary * employerRate) / 100;
    const employee = (grossSalary * employeeRate) / 100;

    return {
      rate: rate,
      employerRate: employerRate,
      employeeRate: employeeRate,
      total: this.round(total),
      employer: this.round(employer),
      employee: this.round(employee)
    };
  }

  /**
   * Calculate EO (Income Compensation)
   * Rate: 0.5% (0.25% employer + 0.25% employee)
   */
  static calculateEO(grossSalary) {
    const rate = 0.5;
    const employerRate = 0.25;
    const employeeRate = 0.25;

    const total = (grossSalary * rate) / 100;
    const employer = (grossSalary * employerRate) / 100;
    const employee = (grossSalary * employeeRate) / 100;

    return {
      rate: rate,
      employerRate: employerRate,
      employeeRate: employeeRate,
      total: this.round(total),
      employer: this.round(employer),
      employee: this.round(employee)
    };
  }

  /**
   * Calculate ALV (Unemployment Insurance)
   * Rate: 2.2% (1.1% employer + 1.1% employee) up to CHF 148,200
   * Additional 1% on salary above CHF 148,200 (employee only)
   */
  static calculateALV(grossSalary) {
    const maxSalary = 148200;
    const rate = 2.2;
    const employerRate = 1.1;
    const employeeRate = 1.1;
    const additionalRate = 1.0; // On salary above max

    let employer = 0;
    let employee = 0;

    if (grossSalary <= maxSalary) {
      employer = (grossSalary * employerRate) / 100;
      employee = (grossSalary * employeeRate) / 100;
    } else {
      // Up to max salary
      employer = (maxSalary * employerRate) / 100;
      employee = (maxSalary * employeeRate) / 100;
      
      // Additional on excess (employee only)
      const excess = grossSalary - maxSalary;
      employee += (excess * additionalRate) / 100;
    }

    const total = employer + employee;

    return {
      rate: rate,
      employerRate: employerRate,
      employeeRate: employeeRate,
      additionalRate: additionalRate,
      maxSalary: maxSalary,
      total: this.round(total),
      employer: this.round(employer),
      employee: this.round(employee)
    };
  }

  /**
   * Calculate BVG (Occupational Pension)
   * Rate varies by age
   * Insured salary: CHF 22,050 - CHF 88,200
   */
  static calculateBVG(grossSalary, age) {
    const minSalary = 22050;
    const maxSalary = 88200;
    const coordinationDeduction = 25725;

    // Check if salary is above minimum
    if (grossSalary < minSalary) {
      return {
        rate: 0,
        employerRate: 0,
        employeeRate: 0,
        insuredSalary: 0,
        total: 0,
        employer: 0,
        employee: 0
      };
    }

    // Calculate insured salary
    let insuredSalary = grossSalary - coordinationDeduction;
    insuredSalary = Math.max(3675, insuredSalary); // Minimum insured salary
    insuredSalary = Math.min(insuredSalary, maxSalary - coordinationDeduction); // Maximum insured salary

    // Age-based rates
    let rate = 0;
    if (age >= 25 && age <= 34) {
      rate = 7.0;
    } else if (age >= 35 && age <= 44) {
      rate = 10.0;
    } else if (age >= 45 && age <= 54) {
      rate = 15.0;
    } else if (age >= 55) {
      rate = 18.0;
    }

    // Split equally between employer and employee
    const employerRate = rate / 2;
    const employeeRate = rate / 2;

    const total = (insuredSalary * rate) / 100;
    const employer = (insuredSalary * employerRate) / 100;
    const employee = (insuredSalary * employeeRate) / 100;

    return {
      rate: rate,
      employerRate: employerRate,
      employeeRate: employeeRate,
      insuredSalary: insuredSalary,
      minSalary: minSalary,
      maxSalary: maxSalary,
      coordinationDeduction: coordinationDeduction,
      total: this.round(total),
      employer: this.round(employer),
      employee: this.round(employee)
    };
  }

  /**
   * Calculate UVG (Accident Insurance)
   * Employer paid
   * Rate varies by industry (typically 1-3%)
   */
  static calculateUVG(grossSalary, rate = 1.0) {
    const total = (grossSalary * rate) / 100;

    return {
      rate: rate,
      employerRate: rate,
      employeeRate: 0,
      total: this.round(total),
      employer: this.round(total),
      employee: 0
    };
  }

  /**
   * Calculate KTG (Daily Sickness Allowance)
   * Optional
   * Rate varies (typically 1-2%)
   * Usually split 50/50 or employer paid
   */
  static calculateKTG(grossSalary, rate = 1.5) {
    const employerRate = rate / 2;
    const employeeRate = rate / 2;

    const total = (grossSalary * rate) / 100;
    const employer = (grossSalary * employerRate) / 100;
    const employee = (grossSalary * employeeRate) / 100;

    return {
      rate: rate,
      employerRate: employerRate,
      employeeRate: employeeRate,
      total: this.round(total),
      employer: this.round(employer),
      employee: this.round(employee)
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TAX CALCULATIONS
   * ═══════════════════════════════════════════════════════════════════════
   */

  /**
   * Calculate cantonal tax (withholding tax)
   * Rate varies by canton and income
   */
  static async calculateCantonalTax(grossSalary, canton, taxRate) {
    // If tax rate is provided, use it
    if (taxRate > 0) {
      return this.round((grossSalary * taxRate) / 100);
    }

    // Otherwise, use canton-specific calculation
    // This is simplified - actual calculation is complex
    const cantonalRates = {
      'ZH': 2.5,  // Zürich
      'BE': 3.0,  // Bern
      'LU': 2.0,  // Luzern
      'UR': 1.5,  // Uri
      'SZ': 1.2,  // Schwyz (lowest)
      'OW': 1.8,  // Obwalden
      'NW': 1.5,  // Nidwalden
      'GL': 2.2,  // Glarus
      'ZG': 1.0,  // Zug (very low)
      'FR': 2.8,  // Fribourg
      'SO': 2.6,  // Solothurn
      'BS': 3.5,  // Basel-Stadt
      'BL': 2.7,  // Basel-Landschaft
      'SH': 2.4,  // Schaffhausen
      'AR': 2.1,  // Appenzell Ausserrhoden
      'AI': 1.9,  // Appenzell Innerrhoden
      'SG': 2.3,  // St. Gallen
      'GR': 2.0,  // Graubünden
      'AG': 2.5,  // Aargau
      'TG': 2.2,  // Thurgau
      'TI': 2.9,  // Ticino
      'VD': 3.2,  // Vaud
      'VS': 2.7,  // Valais
      'NE': 3.1,  // Neuchâtel
      'GE': 3.8,  // Geneva (highest)
      'JU': 3.0   // Jura
    };

    const rate = cantonalRates[canton] || 2.5;
    return this.round((grossSalary * rate) / 100);
  }

  /**
   * Calculate federal tax (withholding tax)
   */
  static calculateFederalTax(grossSalary, taxRate) {
    if (taxRate > 0) {
      return this.round((grossSalary * taxRate) / 100);
    }

    // Simplified federal tax calculation
    // Actual calculation is progressive
    let rate = 0;
    if (grossSalary <= 17800) {
      rate = 0;
    } else if (grossSalary <= 31600) {
      rate = 0.77;
    } else if (grossSalary <= 41400) {
      rate = 0.88;
    } else if (grossSalary <= 55200) {
      rate = 2.64;
    } else if (grossSalary <= 72500) {
      rate = 2.97;
    } else if (grossSalary <= 78100) {
      rate = 5.94;
    } else {
      rate = 11.5;
    }

    return this.round((grossSalary * rate) / 100);
  }

  /**
   * Calculate church tax
   * Usually 10-15% of cantonal tax
   */
  static calculateChurchTax(cantonalTax, rate = 10) {
    return this.round((cantonalTax * rate) / 100);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PROCESS PAYROLL
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async processPayroll(payrollData) {
    try {
      const {
        employeeId,
        month,
        year,
        paymentDate,
        paymentMethod,
        notes
      } = payrollData;

      // Calculate payroll
      const calculation = await this.calculatePayroll(employeeId, month, year);
      
      if (!calculation.success) {
        return calculation;
      }

      const payroll = calculation.data;

      // Update status
      payroll.status = 'PROCESSED';
      payroll.processedAt = moment().toISOString();
      payroll.paymentDate = paymentDate || moment().toISOString();
      payroll.paymentMethod = paymentMethod || 'BANK_TRANSFER';
      payroll.notes = notes || '';

      // Create accounting entries
      await this.createPayrollAccountingEntries(payroll);

      // Save payroll
      await this.savePayroll(payroll);

      // Generate payslip
      const payslip = await this.generatePayslip(payroll);

      return {
        success: true,
        data: {
          payroll,
          payslip
        }
      };

    } catch (error) {
      console.error('Process payroll error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create accounting entries for payroll
   */
  static async createPayrollAccountingEntries(payroll) {
    try {
      // Journal entry for salary payment
      const journalEntry = {
        voucherType: 'PAYROLL',
        voucherNumber: `PAY-${payroll.id}`,
        date: payroll.paymentDate,
        entries: [
          // Debit: Salary expense
          {
            accountCode: 'SAL-001',
            accountName: 'Salary Expense',
            debit: payroll.grossSalary,
            credit: 0
          },
          // Debit: Employer contributions
          {
            accountCode: 'SOC-001',
            accountName: 'Social Security Expense',
            debit: payroll.totalEmployerContributions,
            credit: 0
          },
          // Credit: Employee payable (net salary)
          {
            accountCode: 'EMP-PAY-001',
            accountName: 'Employee Payable',
            debit: 0,
            credit: payroll.netSalary
          },
          // Credit: Social security payable
          {
            accountCode: 'SOC-PAY-001',
            accountName: 'Social Security Payable',
            debit: 0,
            credit: payroll.ahv.total + payroll.iv.total + payroll.eo.total + payroll.alv.total
          },
          // Credit: Pension payable
          {
            accountCode: 'PEN-PAY-001',
            accountName: 'Pension Payable',
            debit: 0,
            credit: payroll.bvg.total
          },
          // Credit: Insurance payable
          {
            accountCode: 'INS-PAY-001',
            accountName: 'Insurance Payable',
            debit: 0,
            credit: payroll.uvg.total + payroll.ktg.total
          },
          // Credit: Tax payable
          {
            accountCode: 'TAX-PAY-001',
            accountName: 'Tax Payable',
            debit: 0,
            credit: payroll.cantonalTax + payroll.federalTax + payroll.churchTax
          }
        ],
        totalDebit: payroll.grossSalary + payroll.totalEmployerContributions,
        totalCredit: payroll.grossSalary + payroll.totalEmployerContributions,
        narration: `Payroll for ${payroll.employeeName} - ${payroll.period}`,
        reference: payroll.id
      };

      await JournalService.createJournalEntry(journalEntry);

      return { success: true };
    } catch (error) {
      console.error('Create payroll accounting entries error:', error);
      throw error;
    }
  }

  /**
   * Save payroll
   */
  static async savePayroll(payroll) {
    try {
      const payrollData = await AsyncStorage.getItem(this.PAYROLL_KEY);
      const payrolls = payrollData ? JSON.parse(payrollData) : [];
      
      payrolls.unshift(payroll);
      
      await AsyncStorage.setItem(this.PAYROLL_KEY, JSON.stringify(payrolls));
      
      return { success: true };
    } catch (error) {
      console.error('Save payroll error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERATE PAYSLIP
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async generatePayslip(payroll) {
    const businessData = await AsyncStorage.getItem('@mindstack_business');
    const business = businessData ? JSON.parse(businessData) : {};

    const employee = await this.getEmployee(payroll.employeeId);

    const payslip = {
      id: payroll.id,
      period: payroll.period,
      paymentDate: moment(payroll.paymentDate).format('DD.MM.YYYY'),
      
      // Business info
      businessName: business.name || 'MindStack Business',
      businessAddress: business.address || '',
      
      // Employee info
      employeeName: employee.name,
      employeeAddress: employee.address || '',
      employeeAHVNumber: employee.ahvNumber || '',
      
      // Salary breakdown
      grossSalary: this.formatCurrency(payroll.grossSalary),
      
      // Deductions
      deductions: [
        {
          name: 'AHV/IV/EO',
          rate: `${payroll.ahv.employeeRate + payroll.iv.employeeRate + payroll.eo.employeeRate}%`,
          amount: this.formatCurrency(payroll.ahv.employee + payroll.iv.employee + payroll.eo.employee)
        },
        {
          name: 'ALV',
          rate: `${payroll.alv.employeeRate}%`,
          amount: this.formatCurrency(payroll.alv.employee)
        },
        {
          name: 'BVG',
          rate: `${payroll.bvg.employeeRate}%`,
          amount: this.formatCurrency(payroll.bvg.employee)
        },
        {
          name: 'UVG',
          rate: `${payroll.uvg.employeeRate}%`,
          amount: this.formatCurrency(payroll.uvg.employee)
        }
      ],
      
      // Taxes
      taxes: [
        {
          name: 'Cantonal Tax',
          amount: this.formatCurrency(payroll.cantonalTax)
        },
        {
          name: 'Federal Tax',
          amount: this.formatCurrency(payroll.federalTax)
        }
      ],
      
      // Totals
      totalDeductions: this.formatCurrency(payroll.totalEmployeeDeductions),
      netSalary: this.formatCurrency(payroll.netSalary),
      
      // Employer contributions
      employerContributions: [
        {
          name: 'AHV/IV/EO',
          amount: this.formatCurrency(payroll.ahv.employer + payroll.iv.employer + payroll.eo.employer)
        },
        {
          name: 'ALV',
          amount: this.formatCurrency(payroll.alv.employer)
        },
        {
          name: 'BVG',
          amount: this.formatCurrency(payroll.bvg.employer)
        },
        {
          name: 'UVG',
          amount: this.formatCurrency(payroll.uvg.employer)
        }
      ],
      
      totalEmployerContributions: this.formatCurrency(payroll.totalEmployerContributions),
      totalEmployerCost: this.formatCurrency(payroll.totalEmployerCost)
    };

    return payslip;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * EMPLOYEE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════════════
   */
  
  /**
   * Get employee
   */
  static async getEmployee(employeeId) {
    try {
      const employeesData = await AsyncStorage.getItem(this.EMPLOYEES_KEY);
      const employees = employeesData ? JSON.parse(employeesData) : [];
      
      return employees.find(e => e.id === employeeId);
    } catch (error) {
      console.error('Get employee error:', error);
      return null;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UTILITY FUNCTIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  
  /**
   * Round to 2 decimal places
   */
  static round(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Format currency
   */
  static formatCurrency(value) {
    return `CHF ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'")}`;
  }
}

export default SwissPayrollService;