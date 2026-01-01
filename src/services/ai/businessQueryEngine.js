/**
 * MINDSLATE BUSINESS QUERY INTELLIGENCE ENGINE
 * Answers business questions using accounting data
 * 
 * Features:
 * - Multi-language query understanding
 * - Natural language to SQL conversion
 * - Business metrics calculation
 * - Time period parsing
 * - Confidence scoring
 * - Response generation in user's language
 */

/**
 * QUERY TYPES
 */
export const QUERY_TYPES = {
  CASH_BALANCE: 'CASH_BALANCE',
  BANK_BALANCE: 'BANK_BALANCE',
  TOTAL_SALES: 'TOTAL_SALES',
  TOTAL_EXPENSES: 'TOTAL_EXPENSES',
  PROFIT_OR_LOSS: 'PROFIT_OR_LOSS',
  GST_PAYABLE: 'GST_PAYABLE',
  GST_RECEIVABLE: 'GST_RECEIVABLE',
  CUSTOMER_OUTSTANDING: 'CUSTOMER_OUTSTANDING',
  SUPPLIER_PAYABLE: 'SUPPLIER_PAYABLE',
  BUSINESS_SUMMARY: 'BUSINESS_SUMMARY',
  INVENTORY_VALUE: 'INVENTORY_VALUE',
  TOP_CUSTOMERS: 'TOP_CUSTOMERS',
  TOP_EXPENSES: 'TOP_EXPENSES',
  DAILY_SALES: 'DAILY_SALES',
  MONTHLY_TREND: 'MONTHLY_TREND'
};

/**
 * TIME PERIODS
 */
export const TIME_PERIODS = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  THIS_WEEK: 'THIS_WEEK',
  LAST_WEEK: 'LAST_WEEK',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  THIS_QUARTER: 'THIS_QUARTER',
  THIS_YEAR: 'THIS_YEAR',
  CUSTOM: 'CUSTOM'
};

/**
 * CONFIDENCE LEVELS
 */
export const CONFIDENCE_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Business Query Intelligence Engine
 */
class BusinessQueryEngine {
  constructor() {
    this.keywords = this.initializeKeywords();
  }

  /**
   * Initialize multi-language keywords
   */
  initializeKeywords() {
    return {
      // Cash keywords
      cash: [
        'cash', 'cash balance', 'cash in hand', 'hand cash',
        'नकद', 'कैश', 'रोकड़', 'हाथ में कैश',
        'કેશ', 'રોકડ', 'નગદ',
        'रोख', 'रोकड',
        'பணம்', 'ரொக்கம்',
        'ਨਕਦ', 'ਕੈਸ਼'
      ],

      // Bank keywords
      bank: [
        'bank', 'bank balance', 'account balance',
        'बैंक', 'बैंक बैलेंस', 'खाता',
        'બેંક', 'બેંક બેલેન્સ',
        'बँक', 'बँक शिल्लक',
        'வங்கி', 'வங்கி இருப்பு',
        'ਬੈਂਕ', 'ਬੈਂਕ ਬਕਾਇਆ'
      ],

      // Sales keywords
      sales: [
        'sales', 'sale', 'sold', 'revenue', 'income', 'earning',
        'बिक्री', 'बेचा', 'आय', 'कमाई',
        'વેચાણ', 'વેચ્યું', 'આવક',
        'विक्री', 'विकले', 'उत्पन्न',
        'விற்பனை', 'வருமானம்',
        'ਵਿਕਰੀ', 'ਆਮਦਨ'
      ],

      // Expenses keywords
      expenses: [
        'expenses', 'expense', 'spent', 'cost', 'expenditure',
        'खर्च', 'खर्चा', 'व्यय',
        'ખર્ચ', 'ખર્ચો',
        'खर्च', 'व्यय',
        'செலவு', 'செலவுகள்',
        'ਖਰਚ', 'ਖਰਚਾ'
      ],

      // Profit keywords
      profit: [
        'profit', 'gain', 'earning', 'net income',
        'लाभ', 'मुनाफा', 'फायदा',
        'નફો', 'લાભ',
        'नफा', 'लाभ',
        'லாபம்', 'ஆதாயம்',
        'ਲਾਭ', 'ਮੁਨਾਫਾ'
      ],

      // Loss keywords
      loss: [
        'loss', 'deficit', 'negative',
        'हानि', 'घाटा', 'नुकसान',
        'નુકસાન', 'ઘાટો',
        'तोटा', 'हानी',
        'இழப்பு', 'நஷ்டம்',
        'ਘਾਟਾ', 'ਨੁਕਸਾਨ'
      ],

      // GST keywords
      gst: [
        'gst', 'tax', 'vat', 'duty',
        'जीएसटी', 'टैक्स', 'कर',
        'જીએસટી', 'ટેક્સ', 'કર',
        'जीएसटी', 'कर',
        'ஜிஎஸ்டி', 'வரி',
        'ਜੀਐਸਟੀ', 'ਟੈਕਸ'
      ],

      // Payable keywords
      payable: [
        'payable', 'pay', 'owe', 'due', 'pending',
        'देना', 'बकाया', 'बाकी',
        'આપવાનું', 'બાકી',
        'द्यायचे', 'बाकी',
        'கொடுக்க வேண்டும்',
        'ਦੇਣਾ', 'ਬਾਕੀ'
      ],

      // Receivable keywords
      receivable: [
        'receivable', 'receive', 'collect', 'get', 'due from',
        'लेना', 'मिलना', 'वसूली',
        'લેવાનું', 'મેળવવાનું',
        'घ्यायचे', 'मिळवायचे',
        'பெற வேண்டும்',
        'ਲੈਣਾ', 'ਮਿਲਣਾ'
      ],

      // Customer keywords
      customer: [
        'customer', 'client', 'buyer', 'debtor',
        'ग्राहक', 'खरीदार', 'देनदार',
        'ગ્રાહક', 'ખરીદદાર',
        'ग्राहक', 'खरेदीदार',
        'வாடிக்கையாளர்',
        'ਗਾਹਕ', 'ਖਰੀਦਦਾਰ'
      ],

      // Supplier keywords
      supplier: [
        'supplier', 'vendor', 'seller', 'creditor',
        'आपूर्तिकर्ता', 'विक्रेता', 'लेनदार',
        'સપ્લાયર', 'વેચનાર',
        'पुरवठादार', 'विक्रेता',
        'சப்ளையர்', 'விற்பனையாளர்',
        'ਸਪਲਾਇਰ', 'ਵੇਚਣ ਵਾਲਾ'
      ],

      // Time - Today
      today: [
        'today', 'aaj',
        'आज',
        'આજ',
        'आज',
        'இன்று',
        'ਅੱਜ'
      ],

      // Time - Yesterday
      yesterday: [
        'yesterday', 'kal',
        'कल', 'बीता कल',
        'ગઈકાલ',
        'काल',
        'நேற்று',
        'ਕੱਲ੍ਹ'
      ],

      // Time - This week
      thisWeek: [
        'this week', 'is hafte',
        'इस हफ्ते', 'इस सप्ताह',
        'આ અઠવાડિયે',
        'या आठवड्यात',
        'இந்த வாரம்',
        'ਇਸ ਹਫ਼ਤੇ'
      ],

      // Time - This month
      thisMonth: [
        'this month', 'is mahine',
        'इस महीने', 'इस माह',
        'આ મહિને',
        'या महिन्यात',
        'இந்த மாதம்',
        'ਇਸ ਮਹੀਨੇ'
      ],

      // Time - Last month
      lastMonth: [
        'last month', 'pichle mahine',
        'पिछले महीने', 'पिछले माह',
        'ગયા મહિને',
        'मागील महिन्यात',
        'கடந்த மாதம்',
        'ਪਿਛਲੇ ਮਹੀਨੇ'
      ],

      // Question words
      howMuch: [
        'how much', 'kitna', 'kitni',
        'कितना', 'कितनी',
        'કેટલું', 'કેટલા',
        'किती',
        'எவ்வளவு',
        'ਕਿੰਨਾ'
      ],

      // Balance keywords
      balance: [
        'balance', 'remaining', 'left',
        'बैलेंस', 'शेष', 'बाकी',
        'બેલેન્સ', 'બાકી',
        'शिल्लक', 'उरलेले',
        'இருப்பு', 'மீதம்',
        'ਬਕਾਇਆ', 'ਬਾਕੀ'
      ],

      // Summary keywords
      summary: [
        'summary', 'overview', 'report', 'status',
        'सारांश', 'रिपोर्ट', 'स्थिति',
        'સારાંશ', 'રિપોર્ટ',
        'सारांश', 'अहवाल',
        'சுருக்கம்', 'அறிக்கை',
        'ਸੰਖੇਪ', 'ਰਿਪੋਰਟ'
      ]
    };
  }

  /**
   * Process business query
   */
  async processQuery(query, userId = null) {
    try {
      // Normalize query
      const normalized = this.normalizeQuery(query);

      // Detect language
      const language = this.detectLanguage(normalized);

      // Classify query type
      const queryType = this.classifyQuery(normalized);

      // Extract time period
      const timePeriod = this.extractTimePeriod(normalized);

      // Extract entity (customer/supplier name if mentioned)
      const entity = this.extractEntity(normalized);

      // Calculate confidence
      const confidence = this.calculateConfidence(queryType, timePeriod);

      // Get date range
      const dateRange = this.getDateRange(timePeriod);

      // Execute query and get answer
      const answer = await this.executeQuery({
        queryType,
        timePeriod,
        dateRange,
        entity,
        userId
      });

      // Generate spoken response
      const spokenAnswer = this.generateSpokenAnswer(
        queryType,
        answer,
        language,
        timePeriod
      );

      return {
        status: 'ANSWER_READY',
        original_question: query,
        detected_language: language,
        query_type: queryType,
        time_period: timePeriod,
        entity: entity,
        numeric_answer: answer.value,
        formatted_answer: answer.formatted,
        spoken_answer: spokenAnswer,
        confidence: confidence,
        details: answer.details || null
      };

    } catch (error) {
      return {
        status: 'ERROR',
        original_question: query,
        error: error.message,
        confidence: CONFIDENCE_LEVELS.LOW
      };
    }
  }

  /**
   * Normalize query
   */
  normalizeQuery(query) {
    return query.toLowerCase().trim();
  }

  /**
   * Detect language
   */
  detectLanguage(query) {
    // Check for Devanagari script (Hindi/Marathi)
    if (/[\u0900-\u097F]/.test(query)) {
      return 'hi';
    }
    
    // Check for Gujarati script
    if (/[\u0A80-\u0AFF]/.test(query)) {
      return 'gu';
    }
    
    // Check for Tamil script
    if (/[\u0B80-\u0BFF]/.test(query)) {
      return 'ta';
    }
    
    // Check for Gurmukhi script (Punjabi)
    if (/[\u0A00-\u0A7F]/.test(query)) {
      return 'pa';
    }
    
    return 'en';
  }

  /**
   * Classify query type
   */
  classifyQuery(query) {
    // Cash balance
    if (this.matchKeywords(query, this.keywords.cash) && 
        this.matchKeywords(query, this.keywords.balance)) {
      return QUERY_TYPES.CASH_BALANCE;
    }

    // Bank balance
    if (this.matchKeywords(query, this.keywords.bank) && 
        this.matchKeywords(query, this.keywords.balance)) {
      return QUERY_TYPES.BANK_BALANCE;
    }

    // Sales
    if (this.matchKeywords(query, this.keywords.sales)) {
      return QUERY_TYPES.TOTAL_SALES;
    }

    // Expenses
    if (this.matchKeywords(query, this.keywords.expenses)) {
      return QUERY_TYPES.TOTAL_EXPENSES;
    }

    // Profit
    if (this.matchKeywords(query, this.keywords.profit)) {
      return QUERY_TYPES.PROFIT_OR_LOSS;
    }

    // Loss
    if (this.matchKeywords(query, this.keywords.loss)) {
      return QUERY_TYPES.PROFIT_OR_LOSS;
    }

    // GST Payable
    if (this.matchKeywords(query, this.keywords.gst) && 
        this.matchKeywords(query, this.keywords.payable)) {
      return QUERY_TYPES.GST_PAYABLE;
    }

    // GST Receivable
    if (this.matchKeywords(query, this.keywords.gst) && 
        this.matchKeywords(query, this.keywords.receivable)) {
      return QUERY_TYPES.GST_RECEIVABLE;
    }

    // Customer Outstanding
    if (this.matchKeywords(query, this.keywords.customer) || 
        this.matchKeywords(query, this.keywords.receivable)) {
      return QUERY_TYPES.CUSTOMER_OUTSTANDING;
    }

    // Supplier Payable
    if (this.matchKeywords(query, this.keywords.supplier) || 
        (this.matchKeywords(query, this.keywords.payable) && 
         !this.matchKeywords(query, this.keywords.gst))) {
      return QUERY_TYPES.SUPPLIER_PAYABLE;
    }

    // Business Summary
    if (this.matchKeywords(query, this.keywords.summary)) {
      return QUERY_TYPES.BUSINESS_SUMMARY;
    }

    // Default to business summary
    return QUERY_TYPES.BUSINESS_SUMMARY;
  }

  /**
   * Extract time period
   */
  extractTimePeriod(query) {
    if (this.matchKeywords(query, this.keywords.today)) {
      return TIME_PERIODS.TODAY;
    }
    if (this.matchKeywords(query, this.keywords.yesterday)) {
      return TIME_PERIODS.YESTERDAY;
    }
    if (this.matchKeywords(query, this.keywords.thisWeek)) {
      return TIME_PERIODS.THIS_WEEK;
    }
    if (this.matchKeywords(query, this.keywords.thisMonth)) {
      return TIME_PERIODS.THIS_MONTH;
    }
    if (this.matchKeywords(query, this.keywords.lastMonth)) {
      return TIME_PERIODS.LAST_MONTH;
    }

    // Default to this month
    return TIME_PERIODS.THIS_MONTH;
  }

  /**
   * Extract entity name (customer/supplier)
   */
  extractEntity(query) {
    // Look for proper nouns (capitalized words)
    const words = query.split(' ');
    const properNouns = words.filter(word => 
      word.length > 2 && word[0] === word[0].toUpperCase()
    );

    return properNouns.length > 0 ? properNouns.join(' ') : null;
  }

  /**
   * Calculate confidence
   */
  calculateConfidence(queryType, timePeriod) {
    if (queryType && timePeriod) {
      return CONFIDENCE_LEVELS.HIGH;
    }
    if (queryType) {
      return CONFIDENCE_LEVELS.MEDIUM;
    }
    return CONFIDENCE_LEVELS.LOW;
  }

  /**
   * Get date range from time period
   */
  getDateRange(timePeriod) {
    const now = new Date();
    let fromDate, toDate;

    switch (timePeriod) {
      case TIME_PERIODS.TODAY:
        fromDate = new Date(now.setHours(0, 0, 0, 0));
        toDate = new Date(now.setHours(23, 59, 59, 999));
        break;

      case TIME_PERIODS.YESTERDAY:
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        fromDate = new Date(yesterday.setHours(0, 0, 0, 0));
        toDate = new Date(yesterday.setHours(23, 59, 59, 999));
        break;

      case TIME_PERIODS.THIS_WEEK:
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        fromDate = new Date(startOfWeek.setHours(0, 0, 0, 0));
        toDate = new Date(now.setHours(23, 59, 59, 999));
        break;

      case TIME_PERIODS.LAST_WEEK:
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        fromDate = new Date(lastWeekStart.setHours(0, 0, 0, 0));
        toDate = new Date(lastWeekEnd.setHours(23, 59, 59, 999));
        break;

      case TIME_PERIODS.THIS_MONTH:
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;

      case TIME_PERIODS.LAST_MONTH:
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;

      case TIME_PERIODS.THIS_QUARTER:
        const quarter = Math.floor(now.getMonth() / 3);
        fromDate = new Date(now.getFullYear(), quarter * 3, 1);
        toDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;

      case TIME_PERIODS.THIS_YEAR:
        fromDate = new Date(now.getFullYear(), 0, 1);
        toDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;

      default:
        // Default to this month
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0]
    };
  }

  /**
   * Execute query (placeholder - will be implemented in integration service)
   */
  async executeQuery(params) {
    // This will be implemented in the integration service
    // For now, return placeholder
    return {
      value: 0,
      formatted: '₹0',
      details: null
    };
  }

  /**
   * Generate spoken answer
   */
  generateSpokenAnswer(queryType, answer, language, timePeriod) {
    const value = answer.formatted;
    const period = this.getTimePeriodText(timePeriod, language);

    const templates = {
      en: {
        [QUERY_TYPES.CASH_BALANCE]: `Cash balance is ${value}`,
        [QUERY_TYPES.BANK_BALANCE]: `Bank balance is ${value}`,
        [QUERY_TYPES.TOTAL_SALES]: `Total sales ${period} is ${value}`,
        [QUERY_TYPES.TOTAL_EXPENSES]: `Total expenses ${period} is ${value}`,
        [QUERY_TYPES.PROFIT_OR_LOSS]: answer.value >= 0 ? 
          `Profit ${period} is ${value}` : 
          `Loss ${period} is ${value}`,
        [QUERY_TYPES.GST_PAYABLE]: `GST payable is ${value}`,
        [QUERY_TYPES.CUSTOMER_OUTSTANDING]: `Customer outstanding is ${value}`,
        [QUERY_TYPES.SUPPLIER_PAYABLE]: `Supplier payable is ${value}`
      },
      hi: {
        [QUERY_TYPES.CASH_BALANCE]: `कैश बैलेंस ${value} है`,
        [QUERY_TYPES.BANK_BALANCE]: `बैंक बैलेंस ${value} है`,
        [QUERY_TYPES.TOTAL_SALES]: `${period} की कुल बिक्री ${value} है`,
        [QUERY_TYPES.TOTAL_EXPENSES]: `${period} का कुल खर्च ${value} है`,
        [QUERY_TYPES.PROFIT_OR_LOSS]: answer.value >= 0 ? 
          `${period} का लाभ ${value} है` : 
          `${period} की हानि ${value} है`,
        [QUERY_TYPES.GST_PAYABLE]: `GST देना ${value} है`,
        [QUERY_TYPES.CUSTOMER_OUTSTANDING]: `ग्राहक से लेना ${value} है`,
        [QUERY_TYPES.SUPPLIER_PAYABLE]: `सप्लायर को देना ${value} है`
      },
      gu: {
        [QUERY_TYPES.CASH_BALANCE]: `કેશ બેલેન્સ ${value} છે`,
        [QUERY_TYPES.BANK_BALANCE]: `બેંક બેલેન્સ ${value} છે`,
        [QUERY_TYPES.TOTAL_SALES]: `${period} નું કુલ વેચાણ ${value} છે`,
        [QUERY_TYPES.TOTAL_EXPENSES]: `${period} નો કુલ ખર્ચ ${value} છે`,
        [QUERY_TYPES.PROFIT_OR_LOSS]: answer.value >= 0 ? 
          `${period} નો નફો ${value} છે` : 
          `${period} નું નુકસાન ${value} છે`,
        [QUERY_TYPES.GST_PAYABLE]: `GST આપવાનું ${value} છે`,
        [QUERY_TYPES.CUSTOMER_OUTSTANDING]: `ગ્રાહક પાસેથી લેવાનું ${value} છે`,
        [QUERY_TYPES.SUPPLIER_PAYABLE]: `સપ્લાયરને આપવાનું ${value} છે`
      }
    };

    const langTemplates = templates[language] || templates.en;
    return langTemplates[queryType] || `Answer: ${value}`;
  }

  /**
   * Get time period text
   */
  getTimePeriodText(timePeriod, language) {
    const texts = {
      en: {
        [TIME_PERIODS.TODAY]: 'today',
        [TIME_PERIODS.YESTERDAY]: 'yesterday',
        [TIME_PERIODS.THIS_WEEK]: 'this week',
        [TIME_PERIODS.THIS_MONTH]: 'this month',
        [TIME_PERIODS.LAST_MONTH]: 'last month'
      },
      hi: {
        [TIME_PERIODS.TODAY]: 'आज',
        [TIME_PERIODS.YESTERDAY]: 'कल',
        [TIME_PERIODS.THIS_WEEK]: 'इस हफ्ते',
        [TIME_PERIODS.THIS_MONTH]: 'इस महीने',
        [TIME_PERIODS.LAST_MONTH]: 'पिछले महीने'
      },
      gu: {
        [TIME_PERIODS.TODAY]: 'આજ',
        [TIME_PERIODS.YESTERDAY]: 'ગઈકાલ',
        [TIME_PERIODS.THIS_WEEK]: 'આ અઠવાડિયે',
        [TIME_PERIODS.THIS_MONTH]: 'આ મહિને',
        [TIME_PERIODS.LAST_MONTH]: 'ગયા મહિને'
      }
    };

    const langTexts = texts[language] || texts.en;
    return langTexts[timePeriod] || '';
  }

  /**
   * Match keywords
   */
  matchKeywords(query, keywords) {
    return keywords.some(keyword => query.includes(keyword.toLowerCase()));
  }
}

// Create singleton instance
const businessQueryEngine = new BusinessQueryEngine();

export default businessQueryEngine;
export { BusinessQueryEngine };
