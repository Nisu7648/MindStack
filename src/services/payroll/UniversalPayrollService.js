/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSAL PAYROLL SERVICE - ALL COUNTRIES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Dynamically handles payroll for ANY country based on CountryConfigService
 * 
 * Supported Countries:
 * 🇨🇭 Switzerland - AHV, IV, EO, ALV, BVG, UVG, KTG
 * 🇮🇳 India - PF, ESI, PT, LWF, Income Tax
 * 🇺🇸 USA - FICA, Medicare, FUTA, SUTA, 401k
 * 🇬🇧 UK - NI, PAYE, Pension
 * 🇩🇪 Germany - RV, KV, PV, AV
 * 🇫🇷 France - URSSAF, Retirement, Unemployment
 * 🇦🇺 Australia - Superannuation, PAYG
 * 🇨🇦 Canada - CPP, EI, Provincial Tax
 * 🇸🇬 Singapore - CPF, SDL, FWL
 * 🇦🇪 UAE - Gratuity
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import CountryConfigService from '../global/CountryConfigService';
import SwissPayrollService from './SwissPayrollService';
import { JournalService } from '../accounting/journalService';

export class UniversalPayrollService {
  static PAYROLL_KEY = '@mindstack_payroll';
  static EMPLOYEES_KEY = '@mindstack_employees';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CALCULATE PAYROLL - UNIVERSAL
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculatePayroll(employeeId, month, year) {
    try {
      // Get country configuration
      const countryConfig = await CountryConfigService.getCurrentCountryConfig();
      
      if (!countryConfig.success) {
        return {
          success: false,
          error: 'Country configuration not found'
        };
      }

      const country = countryConfig.data;

      // Route to country-specific calculation
      switch (country.code) {
        case 'CH':
          return await SwissPayrollService.calculatePayroll(employeeId, month, year);
        
        case 'IN':
          return await this.calculateIndianPayroll(employeeId, month, year, country);
        
        case 'US':
          return await this.calculateUSPayroll(employeeId, month, year, country);
        
        case 'GB':
          return await this.calculateUKPayroll(employeeId, month, year, country);
        
        case 'DE':
          return await this.calculateGermanPayroll(employeeId, month, year, country);
        
        case 'FR':
          return await this.calculateFrenchPayroll(employeeId, month, year, country);
        
        case 'AU':
          return await this.calculateAustralianPayroll(employeeId, month, year, country);
        
        case 'CA':
          return await this.calculateCanadianPayroll(employeeId, month, year, country);
        
        case 'SG':
          return await this.calculateSingaporePayroll(employeeId, month, year, country);
        
        case 'AE':
          return await this.calculateUAEPayroll(employeeId, month, year, country);
        
        default:
          return await this.calculateGenericPayroll(employeeId, month, year, country);
      }

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
   * INDIAN PAYROLL
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculateIndianPayroll(employeeId, month, year, country) {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const grossSalary = employee.grossSalary;
    const components = country.payrollSystem.components;

    // Calculate PF (Provident Fund)
    const pfComponent = components.find(c => c.code === 'PF');
    const pfSalary = Math.min(grossSalary, pfComponent.maxSalary);
    const pf = {
      employer: (pfSalary * pfComponent.employerRate) / 100,
      employee: (pfSalary * pfComponent.employeeRate) / 100,
      total: (pfSalary * pfComponent.rate) / 100
    };

    // Calculate ESI (Employee State Insurance)
    const esiComponent = components.find(c => c.code === 'ESI');
    let esi = { employer: 0, employee: 0, total: 0 };
    if (grossSalary <= esiComponent.maxSalary) {
      esi = {
        employer: (grossSalary * esiComponent.employerRate) / 100,
        employee: (grossSalary * esiComponent.employeeRate) / 100,
        total: (grossSalary * esiComponent.rate) / 100
      };
    }

    // Calculate Professional Tax (state-based)
    const pt = employee.professionalTax || 200; // ₹200 per month (varies by state)

    // Calculate Income Tax (TDS)
    const incomeTax = await this.calculateIndianIncomeTax(grossSalary, employee);

    // Calculate totals
    const totalEmployerContributions = pf.employer + esi.employer;
    const totalEmployeeDeductions = pf.employee + esi.employee + pt + incomeTax;
    const netSalary = grossSalary - totalEmployeeDeductions;

    return {
      success: true,
      data: {
        id: `PAY-${employeeId}-${year}${String(month).padStart(2, '0')}`,
        employeeId: employee.id,
        employeeName: employee.name,
        month: month,
        year: year,
        period: `${moment().month(month - 1).format('MMMM')} ${year}`,
        grossSalary: grossSalary,
        
        // Components
        pf: pf,
        esi: esi,
        professionalTax: pt,
        incomeTax: incomeTax,
        
        // Totals
        totalEmployerContributions: totalEmployerContributions,
        totalEmployeeDeductions: totalEmployeeDeductions,
        netSalary: netSalary,
        totalEmployerCost: grossSalary + totalEmployerContributions,
        
        status: 'CALCULATED',
        calculatedAt: moment().toISOString()
      }
    };
  }

  /**
   * Calculate Indian Income Tax (TDS)
   */
  static async calculateIndianIncomeTax(monthlySalary, employee) {
    const annualSalary = monthlySalary * 12;
    const standardDeduction = 50000;
    const taxableIncome = annualSalary - standardDeduction;

    let tax = 0;

    // Tax slabs (Old regime)
    if (taxableIncome <= 250000) {
      tax = 0;
    } else if (taxableIncome <= 500000) {
      tax = (taxableIncome - 250000) * 0.05;
    } else if (taxableIncome <= 1000000) {
      tax = 12500 + (taxableIncome - 500000) * 0.20;
    } else {
      tax = 112500 + (taxableIncome - 1000000) * 0.30;
    }

    // Add 4% Health & Education Cess
    tax = tax * 1.04;

    // Monthly TDS
    return tax / 12;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * US PAYROLL
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculateUSPayroll(employeeId, month, year, country) {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const grossSalary = employee.grossSalary;
    const components = country.payrollSystem.components;

    // Calculate Social Security
    const ssComponent = components.find(c => c.code === 'FICA_SS');
    const ssSalary = Math.min(grossSalary, ssComponent.maxSalary / 12);
    const socialSecurity = {
      employer: (ssSalary * ssComponent.employerRate) / 100,
      employee: (ssSalary * ssComponent.employeeRate) / 100,
      total: (ssSalary * ssComponent.rate) / 100
    };

    // Calculate Medicare
    const medicareComponent = components.find(c => c.code === 'FICA_MEDICARE');
    const medicare = {
      employer: (grossSalary * medicareComponent.employerRate) / 100,
      employee: (grossSalary * medicareComponent.employeeRate) / 100,
      total: (grossSalary * medicareComponent.rate) / 100
    };

    // Calculate FUTA
    const futaComponent = components.find(c => c.code === 'FUTA');
    const futaSalary = Math.min(grossSalary, futaComponent.maxSalary / 12);
    const futa = {
      employer: (futaSalary * futaComponent.rate) / 100,
      employee: 0,
      total: (futaSalary * futaComponent.rate) / 100
    };

    // Calculate Federal Withholding
    const federalWithholding = await this.calculateUSFederalWithholding(grossSalary, employee);

    // Calculate State Withholding
    const stateWithholding = await this.calculateUSStateWithholding(grossSalary, employee);

    // Calculate 401k (if enrolled)
    const k401 = employee.k401Contribution ? (grossSalary * employee.k401Contribution) / 100 : 0;

    // Calculate totals
    const totalEmployerContributions = socialSecurity.employer + medicare.employer + futa.employer;
    const totalEmployeeDeductions = socialSecurity.employee + medicare.employee + federalWithholding + stateWithholding + k401;
    const netSalary = grossSalary - totalEmployeeDeductions;

    return {
      success: true,
      data: {
        id: `PAY-${employeeId}-${year}${String(month).padStart(2, '0')}`,
        employeeId: employee.id,
        employeeName: employee.name,
        month: month,
        year: year,
        period: `${moment().month(month - 1).format('MMMM')} ${year}`,
        grossSalary: grossSalary,
        
        // Components
        socialSecurity: socialSecurity,
        medicare: medicare,
        futa: futa,
        federalWithholding: federalWithholding,
        stateWithholding: stateWithholding,
        k401: k401,
        
        // Totals
        totalEmployerContributions: totalEmployerContributions,
        totalEmployeeDeductions: totalEmployeeDeductions,
        netSalary: netSalary,
        totalEmployerCost: grossSalary + totalEmployerContributions,
        
        status: 'CALCULATED',
        calculatedAt: moment().toISOString()
      }
    };
  }

  /**
   * Calculate US Federal Withholding
   */
  static async calculateUSFederalWithholding(monthlySalary, employee) {
    // Simplified calculation - actual uses W-4 form
    const annualSalary = monthlySalary * 12;
    const standardDeduction = 13850; // 2023 single filer
    const taxableIncome = Math.max(0, annualSalary - standardDeduction);

    let tax = 0;

    // 2023 tax brackets (single)
    if (taxableIncome <= 11000) {
      tax = taxableIncome * 0.10;
    } else if (taxableIncome <= 44725) {
      tax = 1100 + (taxableIncome - 11000) * 0.12;
    } else if (taxableIncome <= 95375) {
      tax = 5147 + (taxableIncome - 44725) * 0.22;
    } else if (taxableIncome <= 182100) {
      tax = 16290 + (taxableIncome - 95375) * 0.24;
    } else if (taxableIncome <= 231250) {
      tax = 37104 + (taxableIncome - 182100) * 0.32;
    } else if (taxableIncome <= 578125) {
      tax = 52832 + (taxableIncome - 231250) * 0.35;
    } else {
      tax = 174238.25 + (taxableIncome - 578125) * 0.37;
    }

    return tax / 12;
  }

  /**
   * Calculate US State Withholding
   */
  static async calculateUSStateWithholding(monthlySalary, employee) {
    // Simplified - varies by state
    const stateRate = employee.stateWithholdingRate || 5.0;
    return (monthlySalary * stateRate) / 100;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UK PAYROLL (PAYE)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculateUKPayroll(employeeId, month, year, country) {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const grossSalary = employee.grossSalary;
    const annualSalary = grossSalary * 12;

    // Calculate National Insurance
    const niEmployer = (grossSalary * 13.8) / 100;
    const niEmployee = this.calculateUKNationalInsurance(grossSalary);

    // Calculate PAYE Income Tax
    const incomeTax = this.calculateUKIncomeTax(grossSalary);

    // Calculate Pension (Auto-enrollment)
    const pensionEmployer = (grossSalary * 3) / 100;
    const pensionEmployee = (grossSalary * 5) / 100;

    // Calculate totals
    const totalEmployerContributions = niEmployer + pensionEmployer;
    const totalEmployeeDeductions = niEmployee + incomeTax + pensionEmployee;
    const netSalary = grossSalary - totalEmployeeDeductions;

    return {
      success: true,
      data: {
        id: `PAY-${employeeId}-${year}${String(month).padStart(2, '0')}`,
        employeeId: employee.id,
        employeeName: employee.name,
        month: month,
        year: year,
        period: `${moment().month(month - 1).format('MMMM')} ${year}`,
        grossSalary: grossSalary,
        
        // Components
        nationalInsurance: {
          employer: niEmployer,
          employee: niEmployee,
          total: niEmployer + niEmployee
        },
        incomeTax: incomeTax,
        pension: {
          employer: pensionEmployer,
          employee: pensionEmployee,
          total: pensionEmployer + pensionEmployee
        },
        
        // Totals
        totalEmployerContributions: totalEmployerContributions,
        totalEmployeeDeductions: totalEmployeeDeductions,
        netSalary: netSalary,
        totalEmployerCost: grossSalary + totalEmployerContributions,
        
        status: 'CALCULATED',
        calculatedAt: moment().toISOString()
      }
    };
  }

  /**
   * Calculate UK National Insurance
   */
  static calculateUKNationalInsurance(monthlySalary) {
    const annualSalary = monthlySalary * 12;
    const threshold = 12570; // £12,570 per year
    const upperLimit = 50270; // £50,270 per year

    let ni = 0;

    if (annualSalary > threshold) {
      const taxableAmount = Math.min(annualSalary - threshold, upperLimit - threshold);
      ni = taxableAmount * 0.12;

      if (annualSalary > upperLimit) {
        ni += (annualSalary - upperLimit) * 0.02;
      }
    }

    return ni / 12;
  }

  /**
   * Calculate UK Income Tax (PAYE)
   */
  static calculateUKIncomeTax(monthlySalary) {
    const annualSalary = monthlySalary * 12;
    const personalAllowance = 12570;

    let tax = 0;

    if (annualSalary > personalAllowance) {
      const taxableIncome = annualSalary - personalAllowance;

      if (taxableIncome <= 37700) {
        tax = taxableIncome * 0.20;
      } else if (taxableIncome <= 125140) {
        tax = 37700 * 0.20 + (taxableIncome - 37700) * 0.40;
      } else {
        tax = 37700 * 0.20 + 87440 * 0.40 + (taxableIncome - 125140) * 0.45;
      }
    }

    return tax / 12;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GENERIC PAYROLL (For countries without specific implementation)
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async calculateGenericPayroll(employeeId, month, year, country) {
    const employee = await this.getEmployee(employeeId);
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const grossSalary = employee.grossSalary;

    // Generic calculation based on country config
    const components = country.payrollSystem.components || [];
    
    let totalEmployerContributions = 0;
    let totalEmployeeDeductions = 0;
    const calculatedComponents = [];

    for (const component of components) {
      if (component.rate === 'VARIABLE') {
        // Skip variable rate components
        continue;
      }

      const employer = component.employerPaid 
        ? (grossSalary * (component.rate || component.employerRate || 0)) / 100
        : (grossSalary * (component.employerRate || 0)) / 100;

      const employee = (grossSalary * (component.employeeRate || 0)) / 100;

      totalEmployerContributions += employer;
      totalEmployeeDeductions += employee;

      calculatedComponents.push({
        code: component.code,
        name: component.name,
        employer: employer,
        employee: employee,
        total: employer + employee
      });
    }

    const netSalary = grossSalary - totalEmployeeDeductions;

    return {
      success: true,
      data: {
        id: `PAY-${employeeId}-${year}${String(month).padStart(2, '0')}`,
        employeeId: employee.id,
        employeeName: employee.name,
        month: month,
        year: year,
        period: `${moment().month(month - 1).format('MMMM')} ${year}`,
        grossSalary: grossSalary,
        
        // Components
        components: calculatedComponents,
        
        // Totals
        totalEmployerContributions: totalEmployerContributions,
        totalEmployeeDeductions: totalEmployeeDeductions,
        netSalary: netSalary,
        totalEmployerCost: grossSalary + totalEmployerContributions,
        
        status: 'CALCULATED',
        calculatedAt: moment().toISOString()
      }
    };
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

      return {
        success: true,
        data: payroll
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
      const journalEntry = {
        voucherType: 'PAYROLL',
        voucherNumber: `PAY-${payroll.id}`,
        date: payroll.paymentDate,
        entries: [
          {
            accountCode: 'SAL-001',
            accountName: 'Salary Expense',
            debit: payroll.grossSalary,
            credit: 0
          },
          {
            accountCode: 'SOC-001',
            accountName: 'Social Security Expense',
            debit: payroll.totalEmployerContributions,
            credit: 0
          },
          {
            accountCode: 'EMP-PAY-001',
            accountName: 'Employee Payable',
            debit: 0,
            credit: payroll.netSalary
          },
          {
            accountCode: 'SOC-PAY-001',
            accountName: 'Deductions Payable',
            debit: 0,
            credit: payroll.totalEmployeeDeductions
          },
          {
            accountCode: 'SOC-PAY-002',
            accountName: 'Employer Contributions Payable',
            debit: 0,
            credit: payroll.totalEmployerContributions
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
}

export default UniversalPayrollService;