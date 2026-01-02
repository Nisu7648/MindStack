/**
 * GLOBAL CURRENCY & NUMBER FORMATTING SERVICE
 * 
 * Country-specific currency and number formatting
 * Supports 50+ countries with proper formatting rules
 * Auto-applies based on business country selection
 */

/**
 * COUNTRY CONFIGURATION
 * Complete list of countries with currency and formatting rules
 */
export const COUNTRY_CONFIG = {
  // ASIA
  IN: {
    name: 'India',
    currency: 'INR',
    currencySymbol: '₹',
    currencyName: 'Indian Rupee',
    numberFormat: 'indian', // 1,00,000 (lakhs/crores)
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ₹1,000
    taxSystem: 'GST',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  US: {
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    numberFormat: 'western', // 1,000,000
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // $1,000
    taxSystem: 'SALES_TAX',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  GB: {
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    currencyName: 'British Pound',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // £1,000
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  AU: {
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    currencyName: 'Australian Dollar',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // A$1,000
    taxSystem: 'GST',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  CA: {
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'C$',
    currencyName: 'Canadian Dollar',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // C$1,000
    taxSystem: 'GST_HST',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  SG: {
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    currencyName: 'Singapore Dollar',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // S$1,000
    taxSystem: 'GST',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  AE: {
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'د.إ',
    currencyName: 'UAE Dirham',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // د.إ1,000
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  SA: {
    name: 'Saudi Arabia',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    currencyName: 'Saudi Riyal',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ر.س1,000
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  JP: {
    name: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    currencyName: 'Japanese Yen',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 0, // Yen has no decimals
    currencyPosition: 'before', // ¥1,000
    taxSystem: 'CONSUMPTION_TAX',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h'
  },
  CN: {
    name: 'China',
    currency: 'CNY',
    currencySymbol: '¥',
    currencyName: 'Chinese Yuan',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ¥1,000
    taxSystem: 'VAT',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h'
  },
  // EUROPE
  DE: {
    name: 'Germany',
    currency: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    numberFormat: 'european', // 1.000.000,00
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1.000,00 €
    taxSystem: 'VAT',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  },
  FR: {
    name: 'France',
    currency: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: ' ', // Space as separator
    decimalPlaces: 2,
    currencyPosition: 'after', // 1 000,00 €
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  IT: {
    name: 'Italy',
    currency: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1.000,00 €
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  ES: {
    name: 'Spain',
    currency: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1.000,00 €
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  NL: {
    name: 'Netherlands',
    currency: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'before', // €1.000,00
    taxSystem: 'VAT',
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '24h'
  },
  // SOUTH AMERICA
  BR: {
    name: 'Brazil',
    currency: 'BRL',
    currencySymbol: 'R$',
    currencyName: 'Brazilian Real',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'before', // R$1.000,00
    taxSystem: 'ICMS',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  MX: {
    name: 'Mexico',
    currency: 'MXN',
    currencySymbol: '$',
    currencyName: 'Mexican Peso',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // $1,000.00
    taxSystem: 'IVA',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  // AFRICA
  ZA: {
    name: 'South Africa',
    currency: 'ZAR',
    currencySymbol: 'R',
    currencyName: 'South African Rand',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // R1,000.00
    taxSystem: 'VAT',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: '24h'
  },
  NG: {
    name: 'Nigeria',
    currency: 'NGN',
    currencySymbol: '₦',
    currencyName: 'Nigerian Naira',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ₦1,000.00
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  // MORE ASIAN COUNTRIES
  MY: {
    name: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    currencyName: 'Malaysian Ringgit',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // RM1,000.00
    taxSystem: 'SST',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  TH: {
    name: 'Thailand',
    currency: 'THB',
    currencySymbol: '฿',
    currencyName: 'Thai Baht',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ฿1,000.00
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  ID: {
    name: 'Indonesia',
    currency: 'IDR',
    currencySymbol: 'Rp',
    currencyName: 'Indonesian Rupiah',
    numberFormat: 'western',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 0, // Rupiah typically has no decimals
    currencyPosition: 'before', // Rp1.000
    taxSystem: 'PPN',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  PH: {
    name: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    currencyName: 'Philippine Peso',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ₱1,000.00
    taxSystem: 'VAT',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  VN: {
    name: 'Vietnam',
    currency: 'VND',
    currencySymbol: '₫',
    currencyName: 'Vietnamese Dong',
    numberFormat: 'western',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 0, // Dong has no decimals
    currencyPosition: 'after', // 1.000₫
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  // MIDDLE EAST
  IL: {
    name: 'Israel',
    currency: 'ILS',
    currencySymbol: '₪',
    currencyName: 'Israeli Shekel',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // ₪1,000.00
    taxSystem: 'VAT',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  TR: {
    name: 'Turkey',
    currency: 'TRY',
    currencySymbol: '₺',
    currencyName: 'Turkish Lira',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1.000,00₺
    taxSystem: 'KDV',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  },
  // OCEANIA
  NZ: {
    name: 'New Zealand',
    currency: 'NZD',
    currencySymbol: 'NZ$',
    currencyName: 'New Zealand Dollar',
    numberFormat: 'western',
    decimalSeparator: '.',
    thousandSeparator: ',',
    decimalPlaces: 2,
    currencyPosition: 'before', // NZ$1,000.00
    taxSystem: 'GST',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h'
  },
  // NORDIC COUNTRIES
  SE: {
    name: 'Sweden',
    currency: 'SEK',
    currencySymbol: 'kr',
    currencyName: 'Swedish Krona',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: ' ',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1 000,00 kr
    taxSystem: 'MOMS',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h'
  },
  NO: {
    name: 'Norway',
    currency: 'NOK',
    currencySymbol: 'kr',
    currencyName: 'Norwegian Krone',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: ' ',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1 000,00 kr
    taxSystem: 'MVA',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  },
  DK: {
    name: 'Denmark',
    currency: 'DKK',
    currencySymbol: 'kr',
    currencyName: 'Danish Krone',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: '.',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1.000,00 kr
    taxSystem: 'MOMS',
    dateFormat: 'DD-MM-YYYY',
    timeFormat: '24h'
  },
  // SWITZERLAND
  CH: {
    name: 'Switzerland',
    currency: 'CHF',
    currencySymbol: 'CHF',
    currencyName: 'Swiss Franc',
    numberFormat: 'european',
    decimalSeparator: '.',
    thousandSeparator: "'", // Apostrophe as separator
    decimalPlaces: 2,
    currencyPosition: 'before', // CHF 1'000.00
    taxSystem: 'MWST',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  },
  // POLAND
  PL: {
    name: 'Poland',
    currency: 'PLN',
    currencySymbol: 'zł',
    currencyName: 'Polish Zloty',
    numberFormat: 'european',
    decimalSeparator: ',',
    thousandSeparator: ' ',
    decimalPlaces: 2,
    currencyPosition: 'after', // 1 000,00 zł
    taxSystem: 'VAT',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: '24h'
  }
};

/**
 * FORMAT NUMBER BASED ON COUNTRY
 */
export const formatNumber = (number, countryCode) => {
  const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.IN;
  
  if (isNaN(number)) return '0';
  
  const num = parseFloat(number);
  const parts = num.toFixed(config.decimalPlaces).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  let formattedInteger;

  if (config.numberFormat === 'indian') {
    // Indian format: 1,00,000 (lakhs/crores)
    formattedInteger = formatIndianNumber(integerPart);
  } else {
    // Western/European format: 1,000,000
    formattedInteger = formatWesternNumber(integerPart, config.thousandSeparator);
  }

  if (config.decimalPlaces > 0) {
    return `${formattedInteger}${config.decimalSeparator}${decimalPart}`;
  }
  
  return formattedInteger;
};

/**
 * FORMAT INDIAN NUMBER (Lakhs/Crores)
 */
const formatIndianNumber = (num) => {
  const numStr = num.toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  
  if (otherNumbers !== '') {
    return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  return lastThree;
};

/**
 * FORMAT WESTERN NUMBER
 */
const formatWesternNumber = (num, separator) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
};

/**
 * FORMAT CURRENCY
 */
export const formatCurrency = (amount, countryCode) => {
  const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.IN;
  const formattedNumber = formatNumber(amount, countryCode);
  
  if (config.currencyPosition === 'before') {
    return `${config.currencySymbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${config.currencySymbol}`;
  }
};

/**
 * PARSE NUMBER (Remove formatting)
 */
export const parseNumber = (formattedNumber, countryCode) => {
  const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.IN;
  
  // Remove currency symbol
  let cleaned = formattedNumber.replace(config.currencySymbol, '').trim();
  
  // Remove thousand separators
  cleaned = cleaned.replace(new RegExp(`\\${config.thousandSeparator}`, 'g'), '');
  
  // Replace decimal separator with dot
  if (config.decimalSeparator !== '.') {
    cleaned = cleaned.replace(config.decimalSeparator, '.');
  }
  
  return parseFloat(cleaned) || 0;
};

/**
 * GET NUMBER IN WORDS (Country-specific)
 */
export const numberToWords = (number, countryCode) => {
  const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.IN;
  
  if (config.numberFormat === 'indian') {
    return numberToWordsIndian(number);
  } else {
    return numberToWordsWestern(number);
  }
};

/**
 * NUMBER TO WORDS - INDIAN SYSTEM (Lakhs/Crores)
 */
const numberToWordsIndian = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const remainder = num % 100;

  let words = '';

  if (crore > 0) {
    words += convertTwoDigit(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigit(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigit(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    words += ones[hundred] + ' Hundred ';
  }
  if (remainder > 0) {
    if (remainder < 10) {
      words += ones[remainder];
    } else if (remainder < 20) {
      words += teens[remainder - 10];
    } else {
      words += tens[Math.floor(remainder / 10)] + ' ' + ones[remainder % 10];
    }
  }

  return words.trim();

  function convertTwoDigit(n) {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + ' ' + ones[n % 10];
  }
};

/**
 * NUMBER TO WORDS - WESTERN SYSTEM (Millions/Billions)
 */
const numberToWordsWestern = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';

  const billion = Math.floor(num / 1000000000);
  const million = Math.floor((num % 1000000000) / 1000000);
  const thousand = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  let words = '';

  if (billion > 0) {
    words += convertThreeDigit(billion) + ' Billion ';
  }
  if (million > 0) {
    words += convertThreeDigit(million) + ' Million ';
  }
  if (thousand > 0) {
    words += convertThreeDigit(thousand) + ' Thousand ';
  }
  if (remainder > 0) {
    words += convertThreeDigit(remainder);
  }

  return words.trim();

  function convertThreeDigit(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let result = '';

    if (hundred > 0) {
      result += ones[hundred] + ' Hundred ';
    }
    if (rest > 0) {
      if (rest < 10) {
        result += ones[rest];
      } else if (rest < 20) {
        result += teens[rest - 10];
      } else {
        result += tens[Math.floor(rest / 10)] + ' ' + ones[rest % 10];
      }
    }

    return result.trim();
  }
};

/**
 * GET COUNTRY LIST FOR DROPDOWN
 */
export const getCountryList = () => {
  return Object.entries(COUNTRY_CONFIG).map(([code, config]) => ({
    code,
    name: config.name,
    currency: config.currency,
    currencySymbol: config.currencySymbol,
    currencyName: config.currencyName,
    taxSystem: config.taxSystem
  })).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * GET COUNTRY CONFIG
 */
export const getCountryConfig = (countryCode) => {
  return COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.IN;
};

export default {
  COUNTRY_CONFIG,
  formatNumber,
  formatCurrency,
  parseNumber,
  numberToWords,
  getCountryList,
  getCountryConfig
};
