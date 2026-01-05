/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COUNTRY-SPECIFIC CONFIGURATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This service dynamically loads country-specific:
 * - Accounting systems
 * - Tax systems
 * - Payroll systems
 * - Compliance requirements
 * - Report formats
 * 
 * Each country gets its own specialized system!
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class CountryConfigService {
  static COUNTRY_CONFIG_KEY = '@mindstack_country_config';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * COUNTRY CONFIGURATIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  static COUNTRIES = {
    // 🇨🇭 SWITZERLAND - Simplified Swiss System
    CH: {
      code: 'CH',
      name: 'Switzerland',
      currency: 'CHF',
      currencySymbol: 'CHF',
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'de-CH',
      
      // Accounting system
      accountingSystem: 'SWISS_SIMPLIFIED',
      accountingStandard: 'Swiss GAAP',
      fiscalYearStart: '01-01', // Calendar year
      
      // Tax system
      taxSystem: {
        type: 'VAT',
        name: 'MWST',
        rates: [
          { name: 'Standard', rate: 8.1, code: 'STANDARD' },
          { name: 'Reduced', rate: 2.6, code: 'REDUCED' },
          { name: 'Special', rate: 3.8, code: 'SPECIAL' },
          { name: 'Zero', rate: 0, code: 'ZERO' }
        ],
        filingFrequency: 'QUARTERLY', // Quarterly VAT filing
        registrationThreshold: 100000 // CHF 100,000
      },
      
      // Payroll system
      payrollSystem: {
        enabled: true,
        type: 'SWISS_PAYROLL',
        components: [
          {
            code: 'AHV',
            name: 'Old-age and Survivors Insurance',
            rate: 10.6, // Total (employer + employee)
            employerRate: 5.3,
            employeeRate: 5.3,
            mandatory: true
          },
          {
            code: 'IV',
            name: 'Disability Insurance',
            rate: 1.4,
            employerRate: 0.7,
            employeeRate: 0.7,
            mandatory: true
          },
          {
            code: 'EO',
            name: 'Income Compensation',
            rate: 0.5,
            employerRate: 0.25,
            employeeRate: 0.25,
            mandatory: true
          },
          {
            code: 'ALV',
            name: 'Unemployment Insurance',
            rate: 2.2,
            employerRate: 1.1,
            employeeRate: 1.1,
            mandatory: true,
            maxSalary: 148200 // CHF 148,200
          },
          {
            code: 'BVG',
            name: 'Occupational Pension',
            rate: 'VARIABLE', // Depends on age
            mandatory: true,
            minSalary: 22050, // CHF 22,050
            maxSalary: 88200 // CHF 88,200
          },
          {
            code: 'UVG',
            name: 'Accident Insurance',
            rate: 'VARIABLE',
            employerPaid: true,
            mandatory: true
          },
          {
            code: 'KTG',
            name: 'Daily Sickness Allowance',
            rate: 'VARIABLE',
            mandatory: false
          }
        ],
        
        // Cantonal taxes (26 cantons)
        cantonalTax: {
          enabled: true,
          cantons: [
            { code: 'ZH', name: 'Zürich', rate: 'PROGRESSIVE' },
            { code: 'BE', name: 'Bern', rate: 'PROGRESSIVE' },
            { code: 'LU', name: 'Luzern', rate: 'PROGRESSIVE' },
            { code: 'UR', name: 'Uri', rate: 'PROGRESSIVE' },
            { code: 'SZ', name: 'Schwyz', rate: 'PROGRESSIVE' },
            { code: 'OW', name: 'Obwalden', rate: 'PROGRESSIVE' },
            { code: 'NW', name: 'Nidwalden', rate: 'PROGRESSIVE' },
            { code: 'GL', name: 'Glarus', rate: 'PROGRESSIVE' },
            { code: 'ZG', name: 'Zug', rate: 'PROGRESSIVE' },
            { code: 'FR', name: 'Fribourg', rate: 'PROGRESSIVE' },
            { code: 'SO', name: 'Solothurn', rate: 'PROGRESSIVE' },
            { code: 'BS', name: 'Basel-Stadt', rate: 'PROGRESSIVE' },
            { code: 'BL', name: 'Basel-Landschaft', rate: 'PROGRESSIVE' },
            { code: 'SH', name: 'Schaffhausen', rate: 'PROGRESSIVE' },
            { code: 'AR', name: 'Appenzell Ausserrhoden', rate: 'PROGRESSIVE' },
            { code: 'AI', name: 'Appenzell Innerrhoden', rate: 'PROGRESSIVE' },
            { code: 'SG', name: 'St. Gallen', rate: 'PROGRESSIVE' },
            { code: 'GR', name: 'Graubünden', rate: 'PROGRESSIVE' },
            { code: 'AG', name: 'Aargau', rate: 'PROGRESSIVE' },
            { code: 'TG', name: 'Thurgau', rate: 'PROGRESSIVE' },
            { code: 'TI', name: 'Ticino', rate: 'PROGRESSIVE' },
            { code: 'VD', name: 'Vaud', rate: 'PROGRESSIVE' },
            { code: 'VS', name: 'Valais', rate: 'PROGRESSIVE' },
            { code: 'NE', name: 'Neuchâtel', rate: 'PROGRESSIVE' },
            { code: 'GE', name: 'Geneva', rate: 'PROGRESSIVE' },
            { code: 'JU', name: 'Jura', rate: 'PROGRESSIVE' }
          ]
        }
      },
      
      // Simplified features for Switzerland
      features: {
        simplifiedAccounting: true,
        cashBasis: true, // Option for cash-basis accounting
        simplifiedVAT: true,
        quarterlyReporting: true,
        cantonalCompliance: true,
        socialSecurityIntegration: true,
        swissQRBill: true, // Swiss QR-Bill support
        eBanking: true // Swiss e-banking integration
      },
      
      // Languages
      languages: ['de', 'fr', 'it', 'en'],
      defaultLanguage: 'de'
    },

    // 🇮🇳 INDIA - GST System
    IN: {
      code: 'IN',
      name: 'India',
      currency: 'INR',
      currencySymbol: '₹',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-IN',
      
      accountingSystem: 'INDIAN_ACCOUNTING',
      accountingStandard: 'Ind AS',
      fiscalYearStart: '04-01', // April 1st
      
      taxSystem: {
        type: 'GST',
        name: 'Goods and Services Tax',
        rates: [
          { name: 'Zero', rate: 0, code: 'ZERO' },
          { name: 'Low', rate: 5, code: 'LOW' },
          { name: 'Standard', rate: 12, code: 'STANDARD' },
          { name: 'Higher', rate: 18, code: 'HIGHER' },
          { name: 'Highest', rate: 28, code: 'HIGHEST' }
        ],
        components: ['CGST', 'SGST', 'IGST'], // Central, State, Integrated
        filingFrequency: 'MONTHLY',
        registrationThreshold: 4000000, // ₹40 lakhs
        
        // GST Returns
        returns: [
          { code: 'GSTR-1', name: 'Outward Supplies', frequency: 'MONTHLY' },
          { code: 'GSTR-3B', name: 'Summary Return', frequency: 'MONTHLY' },
          { code: 'GSTR-9', name: 'Annual Return', frequency: 'YEARLY' }
        ]
      },
      
      payrollSystem: {
        enabled: true,
        type: 'INDIAN_PAYROLL',
        components: [
          {
            code: 'PF',
            name: 'Provident Fund',
            rate: 24, // 12% employer + 12% employee
            employerRate: 12,
            employeeRate: 12,
            mandatory: true,
            maxSalary: 15000 // ₹15,000
          },
          {
            code: 'ESI',
            name: 'Employee State Insurance',
            rate: 4.75, // 3.25% employer + 0.75% employee
            employerRate: 3.25,
            employeeRate: 0.75,
            mandatory: true,
            maxSalary: 21000 // ₹21,000
          },
          {
            code: 'PT',
            name: 'Professional Tax',
            rate: 'VARIABLE',
            stateBased: true,
            mandatory: true
          },
          {
            code: 'LWF',
            name: 'Labour Welfare Fund',
            rate: 'VARIABLE',
            stateBased: true,
            mandatory: false
          }
        ],
        
        // Income Tax
        incomeTax: {
          enabled: true,
          type: 'PROGRESSIVE',
          slabs: [
            { min: 0, max: 250000, rate: 0 },
            { min: 250001, max: 500000, rate: 5 },
            { min: 500001, max: 1000000, rate: 20 },
            { min: 1000001, max: Infinity, rate: 30 }
          ],
          cess: 4, // 4% Health & Education Cess
          standardDeduction: 50000 // ₹50,000
        }
      },
      
      features: {
        gstCompliance: true,
        eInvoicing: true, // E-invoicing for B2B
        eWayBill: true, // E-way bill for goods movement
        tdsTracking: true, // TDS (Tax Deducted at Source)
        tcsTracking: true, // TCS (Tax Collected at Source)
        form16Generation: true,
        form26ASReconciliation: true
      },
      
      languages: ['en', 'hi'],
      defaultLanguage: 'en'
    },

    // 🇺🇸 USA - IRS System
    US: {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      currencySymbol: '$',
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      
      accountingSystem: 'US_GAAP',
      accountingStandard: 'US GAAP',
      fiscalYearStart: '01-01',
      
      taxSystem: {
        type: 'SALES_TAX',
        name: 'Sales Tax',
        stateBased: true,
        rates: 'VARIABLE', // Each state has different rates
        filingFrequency: 'MONTHLY',
        
        // Federal taxes
        federalTax: {
          corporateRate: 21,
          selfEmploymentRate: 15.3
        }
      },
      
      payrollSystem: {
        enabled: true,
        type: 'US_PAYROLL',
        components: [
          {
            code: 'FICA_SS',
            name: 'Social Security',
            rate: 12.4,
            employerRate: 6.2,
            employeeRate: 6.2,
            mandatory: true,
            maxSalary: 160200 // $160,200 (2023)
          },
          {
            code: 'FICA_MEDICARE',
            name: 'Medicare',
            rate: 2.9,
            employerRate: 1.45,
            employeeRate: 1.45,
            mandatory: true
          },
          {
            code: 'FUTA',
            name: 'Federal Unemployment Tax',
            rate: 6.0,
            employerPaid: true,
            mandatory: true,
            maxSalary: 7000 // $7,000
          },
          {
            code: 'SUTA',
            name: 'State Unemployment Tax',
            rate: 'VARIABLE',
            stateBased: true,
            employerPaid: true,
            mandatory: true
          },
          {
            code: '401K',
            name: '401(k) Retirement Plan',
            rate: 'VARIABLE',
            employeeContribution: true,
            employerMatch: true,
            mandatory: false,
            maxContribution: 22500 // $22,500 (2023)
          }
        ],
        
        // Federal income tax withholding
        federalWithholding: {
          enabled: true,
          type: 'PROGRESSIVE',
          w4Form: true
        },
        
        // State income tax
        stateWithholding: {
          enabled: true,
          stateBased: true
        }
      },
      
      features: {
        w2Generation: true,
        form1099Generation: true,
        form941Filing: true, // Quarterly federal tax return
        form940Filing: true, // Annual FUTA return
        salesTaxCompliance: true,
        multiStatePayroll: true,
        aca1095Forms: true // Affordable Care Act
      },
      
      languages: ['en', 'es'],
      defaultLanguage: 'en'
    },

    // 🇬🇧 UK - PAYE System
    GB: {
      code: 'GB',
      name: 'United Kingdom',
      currency: 'GBP',
      currencySymbol: '£',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-GB',
      
      accountingSystem: 'UK_GAAP',
      accountingStandard: 'UK GAAP / IFRS',
      fiscalYearStart: '04-06', // April 6th
      
      taxSystem: {
        type: 'VAT',
        name: 'Value Added Tax',
        rates: [
          { name: 'Standard', rate: 20, code: 'STANDARD' },
          { name: 'Reduced', rate: 5, code: 'REDUCED' },
          { name: 'Zero', rate: 0, code: 'ZERO' }
        ],
        filingFrequency: 'QUARTERLY',
        registrationThreshold: 85000, // £85,000
        
        // Making Tax Digital (MTD)
        mtdCompliant: true
      },
      
      payrollSystem: {
        enabled: true,
        type: 'UK_PAYE',
        components: [
          {
            code: 'NI_EMPLOYER',
            name: 'Employer National Insurance',
            rate: 13.8,
            employerPaid: true,
            mandatory: true
          },
          {
            code: 'NI_EMPLOYEE',
            name: 'Employee National Insurance',
            rate: 'PROGRESSIVE',
            employeeRate: 12, // 12% on £12,570 - £50,270
            mandatory: true
          },
          {
            code: 'PENSION',
            name: 'Workplace Pension',
            rate: 8, // Minimum 8% total
            employerRate: 3,
            employeeRate: 5,
            mandatory: true // Auto-enrollment
          }
        ],
        
        // PAYE income tax
        incomeTax: {
          enabled: true,
          type: 'PROGRESSIVE',
          personalAllowance: 12570, // £12,570
          slabs: [
            { min: 0, max: 12570, rate: 0 },
            { min: 12571, max: 50270, rate: 20 },
            { min: 50271, max: 125140, rate: 40 },
            { min: 125141, max: Infinity, rate: 45 }
          ]
        }
      },
      
      features: {
        rtiSubmission: true, // Real Time Information
        p60Generation: true,
        p45Generation: true,
        p11dGeneration: true,
        cis: true, // Construction Industry Scheme
        studentLoanDeductions: true,
        pensionAutoEnrollment: true
      },
      
      languages: ['en'],
      defaultLanguage: 'en'
    },

    // 🇩🇪 GERMANY
    DE: {
      code: 'DE',
      name: 'Germany',
      currency: 'EUR',
      currencySymbol: '€',
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'de-DE',
      
      accountingSystem: 'GERMAN_HGB',
      accountingStandard: 'HGB (German GAAP)',
      fiscalYearStart: '01-01',
      
      taxSystem: {
        type: 'VAT',
        name: 'Umsatzsteuer',
        rates: [
          { name: 'Standard', rate: 19, code: 'STANDARD' },
          { name: 'Reduced', rate: 7, code: 'REDUCED' },
          { name: 'Zero', rate: 0, code: 'ZERO' }
        ],
        filingFrequency: 'MONTHLY',
        registrationThreshold: 22000 // €22,000
      },
      
      payrollSystem: {
        enabled: true,
        type: 'GERMAN_PAYROLL',
        components: [
          {
            code: 'RV',
            name: 'Pension Insurance (Rentenversicherung)',
            rate: 18.6,
            employerRate: 9.3,
            employeeRate: 9.3,
            mandatory: true
          },
          {
            code: 'KV',
            name: 'Health Insurance (Krankenversicherung)',
            rate: 14.6,
            employerRate: 7.3,
            employeeRate: 7.3,
            mandatory: true
          },
          {
            code: 'PV',
            name: 'Long-term Care Insurance (Pflegeversicherung)',
            rate: 3.05,
            employerRate: 1.525,
            employeeRate: 1.525,
            mandatory: true
          },
          {
            code: 'AV',
            name: 'Unemployment Insurance (Arbeitslosenversicherung)',
            rate: 2.6,
            employerRate: 1.3,
            employeeRate: 1.3,
            mandatory: true
          }
        ],
        
        incomeTax: {
          enabled: true,
          type: 'PROGRESSIVE',
          taxClasses: ['I', 'II', 'III', 'IV', 'V', 'VI']
        }
      },
      
      features: {
        gobd: true, // GoBD compliance (digital accounting)
        elster: true, // ELSTER tax filing
        sepaPayments: true,
        datevExport: true
      },
      
      languages: ['de', 'en'],
      defaultLanguage: 'de'
    },

    // 🇫🇷 FRANCE
    FR: {
      code: 'FR',
      name: 'France',
      currency: 'EUR',
      currencySymbol: '€',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'fr-FR',
      
      accountingSystem: 'FRENCH_PCG',
      accountingStandard: 'PCG (Plan Comptable Général)',
      fiscalYearStart: '01-01',
      
      taxSystem: {
        type: 'VAT',
        name: 'TVA',
        rates: [
          { name: 'Standard', rate: 20, code: 'STANDARD' },
          { name: 'Intermediate', rate: 10, code: 'INTERMEDIATE' },
          { name: 'Reduced', rate: 5.5, code: 'REDUCED' },
          { name: 'Super Reduced', rate: 2.1, code: 'SUPER_REDUCED' }
        ],
        filingFrequency: 'MONTHLY',
        registrationThreshold: 85800 // €85,800
      },
      
      payrollSystem: {
        enabled: true,
        type: 'FRENCH_PAYROLL',
        components: [
          {
            code: 'URSSAF',
            name: 'Social Security Contributions',
            rate: 'COMPLEX', // Multiple components
            mandatory: true
          },
          {
            code: 'RETRAITE',
            name: 'Retirement',
            rate: 'VARIABLE',
            mandatory: true
          },
          {
            code: 'CHOMAGE',
            name: 'Unemployment',
            rate: 4.05,
            employerPaid: true,
            mandatory: true
          }
        ]
      },
      
      features: {
        fecExport: true, // FEC (Fichier des Écritures Comptables)
        dsn: true, // DSN (Déclaration Sociale Nominative)
        sepaPayments: true
      },
      
      languages: ['fr', 'en'],
      defaultLanguage: 'fr'
    },

    // 🇦🇺 AUSTRALIA
    AU: {
      code: 'AU',
      name: 'Australia',
      currency: 'AUD',
      currencySymbol: 'A$',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-AU',
      
      accountingSystem: 'AUSTRALIAN_ACCOUNTING',
      accountingStandard: 'AASB',
      fiscalYearStart: '07-01', // July 1st
      
      taxSystem: {
        type: 'GST',
        name: 'Goods and Services Tax',
        rates: [
          { name: 'Standard', rate: 10, code: 'STANDARD' },
          { name: 'GST-Free', rate: 0, code: 'GST_FREE' }
        ],
        filingFrequency: 'QUARTERLY',
        registrationThreshold: 75000 // A$75,000
      },
      
      payrollSystem: {
        enabled: true,
        type: 'AUSTRALIAN_PAYROLL',
        components: [
          {
            code: 'SUPER',
            name: 'Superannuation',
            rate: 11, // 11% (2023-24)
            employerPaid: true,
            mandatory: true
          },
          {
            code: 'PAYG',
            name: 'Pay As You Go Withholding',
            rate: 'PROGRESSIVE',
            mandatory: true
          }
        ]
      },
      
      features: {
        stp: true, // Single Touch Payroll
        basStatement: true,
        paymentSummary: true
      },
      
      languages: ['en'],
      defaultLanguage: 'en'
    },

    // 🇨🇦 CANADA
    CA: {
      code: 'CA',
      name: 'Canada',
      currency: 'CAD',
      currencySymbol: 'C$',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-CA',
      
      accountingSystem: 'CANADIAN_GAAP',
      accountingStandard: 'ASPE / IFRS',
      fiscalYearStart: '01-01',
      
      taxSystem: {
        type: 'GST_HST',
        name: 'GST/HST',
        rates: [
          { name: 'GST', rate: 5, code: 'GST' },
          { name: 'HST', rate: 'PROVINCIAL', code: 'HST' }
        ],
        provinceBased: true,
        filingFrequency: 'QUARTERLY',
        registrationThreshold: 30000 // C$30,000
      },
      
      payrollSystem: {
        enabled: true,
        type: 'CANADIAN_PAYROLL',
        components: [
          {
            code: 'CPP',
            name: 'Canada Pension Plan',
            rate: 11.9,
            employerRate: 5.95,
            employeeRate: 5.95,
            mandatory: true
          },
          {
            code: 'EI',
            name: 'Employment Insurance',
            rate: 2.63,
            employerRate: 1.63,
            employeeRate: 1.0,
            mandatory: true
          }
        ],
        
        provincialTax: {
          enabled: true,
          provinceBased: true
        }
      },
      
      features: {
        t4Generation: true,
        roe: true, // Record of Employment
        provincialCompliance: true
      },
      
      languages: ['en', 'fr'],
      defaultLanguage: 'en'
    },

    // 🇸🇬 SINGAPORE
    SG: {
      code: 'SG',
      name: 'Singapore',
      currency: 'SGD',
      currencySymbol: 'S$',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-SG',
      
      accountingSystem: 'SINGAPORE_FRS',
      accountingStandard: 'SFRS',
      fiscalYearStart: '01-01',
      
      taxSystem: {
        type: 'GST',
        name: 'Goods and Services Tax',
        rates: [
          { name: 'Standard', rate: 9, code: 'STANDARD' }, // 9% from 2024
          { name: 'Zero', rate: 0, code: 'ZERO' }
        ],
        filingFrequency: 'QUARTERLY',
        registrationThreshold: 1000000 // S$1,000,000
      },
      
      payrollSystem: {
        enabled: true,
        type: 'SINGAPORE_PAYROLL',
        components: [
          {
            code: 'CPF',
            name: 'Central Provident Fund',
            rate: 'AGE_BASED',
            mandatory: true
          },
          {
            code: 'SDL',
            name: 'Skills Development Levy',
            rate: 0.25,
            employerPaid: true,
            mandatory: true
          },
          {
            code: 'FWL',
            name: 'Foreign Worker Levy',
            rate: 'VARIABLE',
            employerPaid: true,
            mandatory: false
          }
        ]
      },
      
      features: {
        iras: true, // IRAS integration
        cpfSubmission: true,
        ir8aGeneration: true
      },
      
      languages: ['en'],
      defaultLanguage: 'en'
    },

    // 🇦🇪 UAE
    AE: {
      code: 'AE',
      name: 'United Arab Emirates',
      currency: 'AED',
      currencySymbol: 'AED',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-AE',
      
      accountingSystem: 'UAE_ACCOUNTING',
      accountingStandard: 'IFRS',
      fiscalYearStart: '01-01',
      
      taxSystem: {
        type: 'VAT',
        name: 'Value Added Tax',
        rates: [
          { name: 'Standard', rate: 5, code: 'STANDARD' },
          { name: 'Zero', rate: 0, code: 'ZERO' }
        ],
        filingFrequency: 'QUARTERLY',
        registrationThreshold: 375000 // AED 375,000
      },
      
      payrollSystem: {
        enabled: true,
        type: 'UAE_PAYROLL',
        components: [
          {
            code: 'GRATUITY',
            name: 'End of Service Gratuity',
            rate: 'TENURE_BASED',
            employerPaid: true,
            mandatory: true
          }
        ],
        
        // No income tax in UAE
        incomeTax: {
          enabled: false
        }
      },
      
      features: {
        wps: true, // Wage Protection System
        mol: true, // Ministry of Labour compliance
        gratuityCalculator: true
      },
      
      languages: ['en', 'ar'],
      defaultLanguage: 'en'
    }
  };

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET COUNTRY CONFIGURATION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getCountryConfig(countryCode) {
    try {
      const config = this.COUNTRIES[countryCode];
      
      if (!config) {
        return {
          success: false,
          error: `Country ${countryCode} not supported`
        };
      }

      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('Get country config error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SET COUNTRY CONFIGURATION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async setCountryConfig(countryCode) {
    try {
      const config = this.COUNTRIES[countryCode];
      
      if (!config) {
        return {
          success: false,
          error: `Country ${countryCode} not supported`
        };
      }

      // Save to storage
      await AsyncStorage.setItem(
        this.COUNTRY_CONFIG_KEY,
        JSON.stringify(config)
      );

      console.log(`✅ Country configuration set: ${config.name}`);
      console.log(`   Currency: ${config.currency}`);
      console.log(`   Accounting: ${config.accountingSystem}`);
      console.log(`   Tax: ${config.taxSystem.name}`);
      console.log(`   Payroll: ${config.payrollSystem.enabled ? 'Enabled' : 'Disabled'}`);

      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('Set country config error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET CURRENT COUNTRY CONFIGURATION
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async getCurrentCountryConfig() {
    try {
      const configData = await AsyncStorage.getItem(this.COUNTRY_CONFIG_KEY);
      
      if (!configData) {
        return {
          success: false,
          error: 'No country configuration found'
        };
      }

      const config = JSON.parse(configData);

      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('Get current country config error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * GET ALL SUPPORTED COUNTRIES
   * ═══════════════════════════════════════════════════════════════════════
   */
  static getAllCountries() {
    return Object.values(this.COUNTRIES).map(country => ({
      code: country.code,
      name: country.name,
      currency: country.currency,
      currencySymbol: country.currencySymbol,
      taxSystem: country.taxSystem.name,
      payrollEnabled: country.payrollSystem.enabled
    }));
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CHECK IF COUNTRY IS SUPPORTED
   * ═══════════════════════════════════════════════════════════════════════
   */
  static isCountrySupported(countryCode) {
    return !!this.COUNTRIES[countryCode];
  }
}

export default CountryConfigService;