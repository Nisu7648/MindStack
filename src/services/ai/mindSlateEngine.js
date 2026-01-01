/**
 * MINDSLATE CONVERSATIONAL ACCOUNTING INTELLIGENCE
 * 
 * Translation layer between human language and MindStack accounting engine
 * Converts messy human input into structured, accounting-valid transaction objects
 * 
 * Supports:
 * - Voice/Text input
 * - Multi-language (English, Hindi, Gujarati, Marathi, Tamil, Punjabi)
 * - Mixed languages
 * - Incomplete sentences
 * - Indian business vocabulary
 * - GST compliance
 */

/**
 * SUPPORTED LANGUAGES
 */
export const LANGUAGES = {
  ENGLISH: 'en',
  HINDI: 'hi',
  GUJARATI: 'gu',
  MARATHI: 'mr',
  TAMIL: 'ta',
  PUNJABI: 'pa'
};

/**
 * INTENT TYPES (V1)
 */
export const INTENT_TYPES = {
  EXPENSE_PAYMENT: 'EXPENSE_PAYMENT',
  CASH_SALE: 'CASH_SALE',
  CREDIT_SALE: 'CREDIT_SALE',
  CASH_PURCHASE: 'CASH_PURCHASE',
  CREDIT_PURCHASE: 'CREDIT_PURCHASE',
  CAPITAL_INTRODUCTION: 'CAPITAL_INTRODUCTION',
  DRAWINGS: 'DRAWINGS',
  BANK_TRANSFER: 'BANK_TRANSFER',
  GST_PAYMENT: 'GST_PAYMENT'
};

/**
 * PAYMENT MODES
 */
export const PAYMENT_MODES = {
  CASH: 'CASH',
  BANK: 'BANK',
  CREDIT: 'CREDIT',
  UPI: 'UPI',
  CHEQUE: 'CHEQUE',
  ONLINE: 'ONLINE'
};

/**
 * EXPENSE CATEGORIES
 */
export const EXPENSE_CATEGORIES = {
  RENT: 'RENT',
  SALARY: 'SALARY',
  ELECTRICITY: 'ELECTRICITY',
  TRANSPORT: 'TRANSPORT',
  TELEPHONE: 'TELEPHONE',
  INTERNET: 'INTERNET',
  OFFICE_SUPPLIES: 'OFFICE_SUPPLIES',
  MAINTENANCE: 'MAINTENANCE',
  INSURANCE: 'INSURANCE',
  PROFESSIONAL_FEES: 'PROFESSIONAL_FEES',
  ADVERTISING: 'ADVERTISING',
  MISCELLANEOUS: 'MISCELLANEOUS'
};

/**
 * MindSlate Conversational Engine
 */
class MindSlateEngine {
  constructor() {
    this.keywords = this.initializeKeywords();
    this.numberWords = this.initializeNumberWords();
  }

  /**
   * Initialize multi-language keywords
   */
  initializeKeywords() {
    return {
      // Actions - Paid/Given
      paid: [
        'paid', 'pay', 'given', 'gave', 'payment',
        'दिया', 'दिये', 'दी', 'भुगतान',
        'આપ્યું', 'આપ્યા', 'ચૂકવ્યું',
        'दिले', 'दिला', 'भरले',
        'கொடுத்தேன்', 'செலுத்தினேன்',
        'ਦਿੱਤਾ', 'ਭੁਗਤਾਨ'
      ],

      // Actions - Received
      received: [
        'received', 'got', 'collect', 'collected',
        'मिला', 'मिली', 'मिले', 'प्राप्त',
        'મળ્યું', 'મળ્યા', 'મેળવ્યું',
        'मिळाले', 'मिळाला', 'मिळवले',
        'பெற்றேன்', 'வசூலித்தேன்',
        'ਮਿਲਿਆ', 'ਪ੍ਰਾਪਤ'
      ],

      // Actions - Sold
      sold: [
        'sold', 'sale', 'sales',
        'बेचा', 'बेची', 'बेचे', 'बिक्री',
        'વેચ્યું', 'વેચ્યા', 'વેચાણ',
        'विकले', 'विकला', 'विक्री',
        'விற்றேன்', 'விற்பனை',
        'ਵੇਚਿਆ', 'ਵਿਕਰੀ'
      ],

      // Actions - Bought/Purchase
      bought: [
        'bought', 'buy', 'purchase', 'purchased',
        'खरीदा', 'खरीदी', 'खरीदे', 'खरीद',
        'ખરીદ્યું', 'ખરીદ્યા', 'ખરીદી',
        'खरेदी', 'खरेदीला', 'खरेदी',
        'வாங்கினேன்', 'கொள்முதல்',
        'ਖਰੀਦਿਆ', 'ਖਰੀਦ'
      ],

      // Expense Types - Rent
      rent: [
        'rent', 'rental',
        'किराया', 'भाड़ा',
        'ભાડું', 'ભાડા',
        'भाडे', 'भाडा',
        'வாடகை',
        'ਕਿਰਾਇਆ'
      ],

      // Expense Types - Salary
      salary: [
        'salary', 'salaries', 'wages', 'wage',
        'वेतन', 'तनख्वाह', 'मजदूरी',
        'પગાર', 'વેતન', 'મજૂરી',
        'पगार', 'वेतन', 'मजुरी',
        'சம்பளம்', 'கூலி',
        'ਤਨਖਾਹ', 'ਮਜ਼ਦੂਰੀ'
      ],

      // Expense Types - Electricity
      electricity: [
        'electricity', 'electric', 'power', 'light',
        'बिजली', 'विद्युत',
        'વીજળી', 'વિદ્યુત',
        'वीज', 'विद्युत',
        'மின்சாரம்',
        'ਬਿਜਲੀ'
      ],

      // Expense Types - Transport
      transport: [
        'transport', 'transportation', 'travel', 'petrol', 'diesel', 'fuel',
        'परिवहन', 'यात्रा', 'पेट्रोल', 'डीजल',
        'ટ્રાન્સપોર્ટ', 'પેટ્રોલ', 'ડીઝલ',
        'वाहतूक', 'प्रवास', 'पेट्रोल',
        'போக்குவரத்து', 'பயணம்',
        'ਆਵਾਜਾਈ', 'ਯਾਤਰਾ'
      ],

      // Expense Types - Telephone
      telephone: [
        'telephone', 'phone', 'mobile', 'call',
        'टेलीफोन', 'फोन', 'मोबाइल',
        'ટેલિફોન', 'ફોન', 'મોબાઇલ',
        'दूरध्वनी', 'फोन',
        'தொலைபேசி', 'மொபைல்',
        'ਟੈਲੀਫੋਨ', 'ਫੋਨ'
      ],

      // Payment Modes - Cash
      cash: [
        'cash', 'hand',
        'नकद', 'कैश', 'रोकड़',
        'કેશ', 'રોકડ', 'નગદ',
        'रोख', 'रोकड',
        'பணம்', 'ரொக்கம்',
        'ਨਕਦ', 'ਕੈਸ਼'
      ],

      // Payment Modes - Bank
      bank: [
        'bank', 'cheque', 'check', 'online', 'transfer', 'upi', 'neft', 'rtgs', 'imps',
        'बैंक', 'चेक', 'ऑनलाइन', 'ट्रांसफर',
        'બેંક', 'ચેક', 'ઓનલાઈન', 'ટ્રાન્સફર',
        'बँक', 'चेक', 'ऑनलाईन',
        'வங்கி', 'காசோலை',
        'ਬੈਂਕ', 'ਚੈੱਕ'
      ],

      // Payment Modes - Credit
      credit: [
        'credit', 'udhar', 'due',
        'उधार', 'क्रेडिट', 'बाकी',
        'ઉધાર', 'ક્રેડિટ', 'બાકી',
        'उसने', 'उधार', 'बाकी',
        'கடன்', 'வரவு',
        'ਉਧਾਰ', 'ਕਰਜ਼ਾ'
      ],

      // GST Keywords
      gst: [
        'gst', 'tax', 'cgst', 'sgst', 'igst', 'bill', 'invoice',
        'जीएसटी', 'टैक्स', 'कर', 'बिल',
        'જીએસટી', 'ટેક્સ', 'કર', 'બિલ',
        'जीएसटी', 'कर', 'बिल',
        'ஜிஎஸ்டி', 'வரி', 'பில்',
        'ਜੀਐਸਟੀ', 'ਟੈਕਸ'
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
        'ગઈકાલ', 'ગયા કાલ',
        'काल', 'काल',
        'நேற்று',
        'ਕੱਲ੍ਹ'
      ],

      // Goods/Items
      goods: [
        'goods', 'items', 'products', 'stock', 'material',
        'माल', 'सामान', 'वस्तु',
        'માલ', 'સામાન', 'વસ્તુ',
        'माल', 'सामान',
        'பொருட்கள்', 'சரக்கு',
        'ਮਾਲ', 'ਸਾਮਾਨ'
      ],

      // Party indicators
      to: ['to', 'ko', 'को', 'ને', 'ला', 'க்கு', 'ਨੂੰ'],
      from: ['from', 'se', 'से', 'થી', 'पासून', 'இருந்து', 'ਤੋਂ']
    };
  }

  /**
   * Initialize number words mapping
   */
  initializeNumberWords() {
    return {
      // English
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'crore': 10000000,
      
      // Hindi
      'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
      'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
      'सौ': 100, 'हजार': 1000, 'लाख': 100000, 'करोड़': 10000000,
      
      // Gujarati
      'શૂન્ય': 0, 'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5,
      'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
      'સો': 100, 'હજાર': 1000, 'લાખ': 100000, 'કરોડ': 10000000,
      
      // Marathi
      'शून्य': 0, 'एक': 1, 'दोन': 2, 'तीन': 3, 'चार': 4, 'पाच': 5,
      'सहा': 6, 'सात': 7, 'आठ': 8, 'नऊ': 9, 'दहा': 10,
      'शंभर': 100, 'हजार': 1000, 'लाख': 100000, 'कोटी': 10000000
    };
  }

  /**
   * Main processing function
   * Converts human input to structured transaction object
   */
  async process(input) {
    try {
      // Normalize input
      const normalized = this.normalizeInput(input);
      
      // Detect language
      const language = this.detectLanguage(normalized);
      
      // Extract components
      const action = this.extractAction(normalized);
      const amount = this.extractAmount(normalized);
      const date = this.extractDate(normalized);
      const paymentMode = this.extractPaymentMode(normalized);
      const category = this.extractCategory(normalized);
      const party = this.extractParty(normalized);
      const gstInfo = this.extractGSTInfo(normalized);
      
      // Determine intent
      const intent = this.determineIntent(action, paymentMode, party);
      
      // Calculate confidence
      const confidence = this.calculateConfidence({
        action, amount, paymentMode, category, intent
      });
      
      // Check if clarification needed
      const clarification = this.checkClarification({
        intent, amount, paymentMode, party, gstInfo
      });
      
      if (clarification) {
        return {
          status: 'CLARIFICATION_REQUIRED',
          original_text: input,
          detected_language: language,
          missing_field: clarification.field,
          question: clarification.question,
          partial_data: {
            intent_type: intent,
            amount: amount,
            category: category
          }
        };
      }
      
      // Return complete transaction object
      return {
        status: 'READY',
        original_text: input,
        detected_language: language,
        intent_type: intent,
        amount: amount,
        transaction_date: date,
        payment_mode: paymentMode,
        party_name: party,
        gst_applicable: gstInfo.applicable,
        gst_rate: gstInfo.rate,
        category: category,
        confidence_score: confidence,
        metadata: {
          action: action,
          extracted_at: new Date().toISOString()
        }
      };
      
    } catch (error) {
      return {
        status: 'ERROR',
        original_text: input,
        error: error.message,
        confidence_score: 0.0
      };
    }
  }

  /**
   * Normalize input text
   */
  normalizeInput(input) {
    return input
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Detect language from input
   */
  detectLanguage(input) {
    // Check for Devanagari script (Hindi/Marathi)
    if (/[\u0900-\u097F]/.test(input)) {
      return LANGUAGES.HINDI;
    }
    
    // Check for Gujarati script
    if (/[\u0A80-\u0AFF]/.test(input)) {
      return LANGUAGES.GUJARATI;
    }
    
    // Check for Tamil script
    if (/[\u0B80-\u0BFF]/.test(input)) {
      return LANGUAGES.TAMIL;
    }
    
    // Check for Gurmukhi script (Punjabi)
    if (/[\u0A00-\u0A7F]/.test(input)) {
      return LANGUAGES.PUNJABI;
    }
    
    // Default to English
    return LANGUAGES.ENGLISH;
  }

  /**
   * Extract action from input
   */
  extractAction(input) {
    if (this.matchKeywords(input, this.keywords.paid)) {
      return 'PAID';
    }
    if (this.matchKeywords(input, this.keywords.received)) {
      return 'RECEIVED';
    }
    if (this.matchKeywords(input, this.keywords.sold)) {
      return 'SOLD';
    }
    if (this.matchKeywords(input, this.keywords.bought)) {
      return 'BOUGHT';
    }
    return null;
  }

  /**
   * Extract amount from input
   */
  extractAmount(input) {
    // Try to find numeric amount
    const numericPatterns = [
      /₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/,
      /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:rupees|rs|रुपये|રૂપિયા)/i
    ];
    
    for (const pattern of numericPatterns) {
      const match = input.match(pattern);
      if (match) {
        let amount = parseFloat(match[1].replace(/,/g, ''));
        
        // Check for multipliers
        if (/k|thousand|हजार|હજાર/i.test(input)) {
          amount *= 1000;
        } else if (/lakh|लाख|લાખ/i.test(input)) {
          amount *= 100000;
        } else if (/crore|करोड़|કરોડ/i.test(input)) {
          amount *= 10000000;
        }
        
        return amount;
      }
    }
    
    // Try to extract from words
    return this.extractAmountFromWords(input);
  }

  /**
   * Extract amount from number words
   */
  extractAmountFromWords(input) {
    const words = input.split(' ');
    let amount = 0;
    let currentNumber = 0;
    
    for (const word of words) {
      const value = this.numberWords[word];
      
      if (value !== undefined) {
        if (value >= 100) {
          currentNumber = currentNumber === 0 ? value : currentNumber * value;
        } else {
          currentNumber += value;
        }
      }
    }
    
    return currentNumber > 0 ? currentNumber : null;
  }

  /**
   * Extract date from input
   */
  extractDate(input) {
    const today = new Date();
    
    // Check for "today"
    if (this.matchKeywords(input, this.keywords.today)) {
      return today.toISOString().split('T')[0];
    }
    
    // Check for "yesterday"
    if (this.matchKeywords(input, this.keywords.yesterday)) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }
    
    // Check for specific date pattern (DD/MM/YYYY or DD-MM-YYYY)
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
    const match = input.match(datePattern);
    
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    
    // Default to today
    return today.toISOString().split('T')[0];
  }

  /**
   * Extract payment mode from input
   */
  extractPaymentMode(input) {
    if (this.matchKeywords(input, this.keywords.cash)) {
      return PAYMENT_MODES.CASH;
    }
    if (this.matchKeywords(input, this.keywords.bank)) {
      return PAYMENT_MODES.BANK;
    }
    if (this.matchKeywords(input, this.keywords.credit)) {
      return PAYMENT_MODES.CREDIT;
    }
    if (/upi/i.test(input)) {
      return PAYMENT_MODES.UPI;
    }
    if (/cheque|check/i.test(input)) {
      return PAYMENT_MODES.CHEQUE;
    }
    if (/online/i.test(input)) {
      return PAYMENT_MODES.ONLINE;
    }
    return null;
  }

  /**
   * Extract expense category from input
   */
  extractCategory(input) {
    if (this.matchKeywords(input, this.keywords.rent)) {
      return EXPENSE_CATEGORIES.RENT;
    }
    if (this.matchKeywords(input, this.keywords.salary)) {
      return EXPENSE_CATEGORIES.SALARY;
    }
    if (this.matchKeywords(input, this.keywords.electricity)) {
      return EXPENSE_CATEGORIES.ELECTRICITY;
    }
    if (this.matchKeywords(input, this.keywords.transport)) {
      return EXPENSE_CATEGORIES.TRANSPORT;
    }
    if (this.matchKeywords(input, this.keywords.telephone)) {
      return EXPENSE_CATEGORIES.TELEPHONE;
    }
    return EXPENSE_CATEGORIES.MISCELLANEOUS;
  }

  /**
   * Extract party name from input
   */
  extractParty(input) {
    // Look for "to [name]" or "from [name]" patterns
    const toPattern = new RegExp(`(${this.keywords.to.join('|')})\\s+([A-Za-z\\s]+?)(?:\\s|$)`, 'i');
    const fromPattern = new RegExp(`(${this.keywords.from.join('|')})\\s+([A-Za-z\\s]+?)(?:\\s|$)`, 'i');
    
    let match = input.match(toPattern);
    if (match) {
      return match[2].trim();
    }
    
    match = input.match(fromPattern);
    if (match) {
      return match[2].trim();
    }
    
    return null;
  }

  /**
   * Extract GST information from input
   */
  extractGSTInfo(input) {
    const applicable = this.matchKeywords(input, this.keywords.gst);
    
    if (!applicable) {
      return { applicable: false, rate: null };
    }
    
    // Try to extract GST rate
    const ratePatterns = [
      /(\d+)%/,
      /(\d+)\s*percent/i,
      /gst\s*(\d+)/i
    ];
    
    for (const pattern of ratePatterns) {
      const match = input.match(pattern);
      if (match) {
        const rate = parseInt(match[1]);
        // Validate GST rate (0, 5, 18, 40)
        if ([0, 5, 18, 40].includes(rate)) {
          return { applicable: true, rate: rate };
        }
      }
    }
    
    return { applicable: true, rate: null };
  }

  /**
   * Determine transaction intent
   */
  determineIntent(action, paymentMode, party) {
    if (action === 'PAID') {
      return INTENT_TYPES.EXPENSE_PAYMENT;
    }
    
    if (action === 'RECEIVED') {
      return paymentMode === PAYMENT_MODES.CASH ? 
        INTENT_TYPES.CASH_SALE : INTENT_TYPES.CREDIT_SALE;
    }
    
    if (action === 'SOLD') {
      return paymentMode === PAYMENT_MODES.CASH || paymentMode === PAYMENT_MODES.BANK ?
        INTENT_TYPES.CASH_SALE : INTENT_TYPES.CREDIT_SALE;
    }
    
    if (action === 'BOUGHT') {
      return paymentMode === PAYMENT_MODES.CASH || paymentMode === PAYMENT_MODES.BANK ?
        INTENT_TYPES.CASH_PURCHASE : INTENT_TYPES.CREDIT_PURCHASE;
    }
    
    return null;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(data) {
    let score = 0.0;
    let factors = 0;
    
    // Action detected
    if (data.action) {
      score += 0.25;
      factors++;
    }
    
    // Amount detected
    if (data.amount) {
      score += 0.25;
      factors++;
    }
    
    // Payment mode detected
    if (data.paymentMode) {
      score += 0.25;
      factors++;
    }
    
    // Category detected
    if (data.category) {
      score += 0.15;
      factors++;
    }
    
    // Intent determined
    if (data.intent) {
      score += 0.10;
      factors++;
    }
    
    return parseFloat(score.toFixed(2));
  }

  /**
   * Check if clarification is needed
   */
  checkClarification(data) {
    // Amount missing
    if (!data.amount) {
      return {
        field: 'amount',
        question: 'Amount kitna hai?'
      };
    }
    
    // Payment mode missing for non-credit transactions
    if (!data.paymentMode && data.intent !== INTENT_TYPES.CREDIT_SALE && 
        data.intent !== INTENT_TYPES.CREDIT_PURCHASE) {
      return {
        field: 'payment_mode',
        question: 'Cash se payment hua ya bank se?'
      };
    }
    
    // Party missing for credit transactions
    if ((data.intent === INTENT_TYPES.CREDIT_SALE || 
         data.intent === INTENT_TYPES.CREDIT_PURCHASE) && !data.party) {
      return {
        field: 'party_name',
        question: data.intent === INTENT_TYPES.CREDIT_SALE ? 
          'Customer ka naam kya hai?' : 'Supplier ka naam kya hai?'
      };
    }
    
    // GST rate missing when GST applicable
    if (data.gstInfo && data.gstInfo.applicable && !data.gstInfo.rate) {
      return {
        field: 'gst_rate',
        question: 'GST rate kitna hai? (5%, 18%, ya 40%)'
      };
    }
    
    return null;
  }

  /**
   * Match keywords in input
   */
  matchKeywords(input, keywords) {
    return keywords.some(keyword => 
      input.includes(keyword.toLowerCase())
    );
  }

  /**
   * Process clarification response
   */
  async processClarification(originalInput, clarificationResponse, missingField) {
    // Combine original input with clarification
    const combinedInput = `${originalInput} ${clarificationResponse}`;
    
    // Re-process with combined input
    return this.process(combinedInput);
  }
}

// Create singleton instance
const mindSlateEngine = new MindSlateEngine();

export default mindSlateEngine;
export { MindSlateEngine };
