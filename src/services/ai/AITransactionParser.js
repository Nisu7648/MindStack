/**
 * AI TRANSACTION PARSER
 * 
 * Understands natural language transaction input in ANY language
 * 
 * Examples:
 * - "Sold 5 laptops to John for 50000"
 * - "Bought 10 chairs from ABC Furniture for 15000"
 * - "Paid rent 25000"
 * - "Received payment from customer 10000"
 * - "मैंने राज को 5000 का माल बेचा" (Hindi)
 * - "আমি 3000 টাকা খরচ করেছি" (Bengali)
 */

import { supabase } from '../supabase';

class AITransactionParser {
  /**
   * ========================================
   * PARSE NATURAL LANGUAGE TRANSACTION
   * ========================================
   */
  static async parseTransaction(text, businessId, language = 'auto') {
    try {
      console.log('🤖 Parsing transaction:', text);

      // Detect language if auto
      if (language === 'auto') {
        language = await this.detectLanguage(text);
      }

      // Translate to English if needed
      let englishText = text;
      if (language !== 'en') {
        englishText = await this.translateToEnglish(text, language);
      }

      // Extract transaction components
      const parsed = await this.extractComponents(englishText, businessId);

      // Validate and enrich
      const enriched = await this.enrichTransaction(parsed, businessId);

      console.log('✅ Parsed transaction:', enriched);

      return {
        success: true,
        transaction: enriched,
        originalText: text,
        language,
        confidence: parsed.confidence
      };

    } catch (error) {
      console.error('❌ Parse error:', error);
      return {
        success: false,
        error: error.message,
        originalText: text
      };
    }
  }

  /**
   * ========================================
   * DETECT LANGUAGE
   * ========================================
   */
  static async detectLanguage(text) {
    // Simple language detection based on character sets
    const hindiPattern = /[\u0900-\u097F]/;
    const bengaliPattern = /[\u0980-\u09FF]/;
    const tamilPattern = /[\u0B80-\u0BFF]/;
    const teluguPattern = /[\u0C00-\u0C7F]/;
    const marathiPattern = /[\u0900-\u097F]/;
    const gujaratiPattern = /[\u0A80-\u0AFF]/;

    if (hindiPattern.test(text)) return 'hi';
    if (bengaliPattern.test(text)) return 'bn';
    if (tamilPattern.test(text)) return 'ta';
    if (teluguPattern.test(text)) return 'te';
    if (marathiPattern.test(text)) return 'mr';
    if (gujaratiPattern.test(text)) return 'gu';

    return 'en';
  }

  /**
   * ========================================
   * TRANSLATE TO ENGLISH
   * ========================================
   */
  static async translateToEnglish(text, sourceLanguage) {
    // Common translations for Indian languages
    const translations = {
      // Hindi
      'बेचा': 'sold',
      'खरीदा': 'bought',
      'दिया': 'paid',
      'मिला': 'received',
      'खर्च': 'expense',
      'रुपये': 'rupees',
      'को': 'to',
      'से': 'from',

      // Bengali
      'বিক্রি': 'sold',
      'কিনেছি': 'bought',
      'দিয়েছি': 'paid',
      'পেয়েছি': 'received',
      'খরচ': 'expense',
      'টাকা': 'rupees',

      // Tamil
      'விற்றேன்': 'sold',
      'வாங்கினேன்': 'bought',
      'செலுத்தினேன்': 'paid',
      'பெற்றேன்': 'received',
      'செலவு': 'expense',
      'ரூபாய்': 'rupees'
    };

    let translated = text;

    // Replace known words
    for (const [native, english] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(native, 'g'), english);
    }

    // Extract numbers (works across all languages)
    const numbers = text.match(/\d+/g);
    if (numbers) {
      numbers.forEach(num => {
        if (!translated.includes(num)) {
          translated += ` ${num}`;
        }
      });
    }

    return translated;
  }

  /**
   * ========================================
   * EXTRACT COMPONENTS
   * ========================================
   */
  static async extractComponents(text, businessId) {
    const components = {
      type: null,
      party: null,
      amount: null,
      items: [],
      quantity: null,
      description: text,
      confidence: 0
    };

    const lowerText = text.toLowerCase();

    // Detect transaction type
    if (this.matchesPattern(lowerText, ['sold', 'sale', 'invoice', 'bill'])) {
      components.type = 'sale';
      components.confidence += 0.3;
    } else if (this.matchesPattern(lowerText, ['bought', 'purchase', 'purchased'])) {
      components.type = 'purchase';
      components.confidence += 0.3;
    } else if (this.matchesPattern(lowerText, ['paid', 'payment out', 'expense'])) {
      components.type = 'payment_out';
      components.confidence += 0.3;
    } else if (this.matchesPattern(lowerText, ['received', 'payment in', 'got'])) {
      components.type = 'payment_in';
      components.confidence += 0.3;
    } else if (this.matchesPattern(lowerText, ['expense', 'spent', 'cost'])) {
      components.type = 'expense';
      components.confidence += 0.3;
    }

    // Extract amount
    const amountMatch = text.match(/(?:rs\.?|₹|rupees?)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
    if (amountMatch) {
      components.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      components.confidence += 0.3;
    }

    // Extract quantity
    const quantityMatch = text.match(/(\d+)\s+(?:pieces?|items?|units?|pcs?)/i);
    if (quantityMatch) {
      components.quantity = parseInt(quantityMatch[1]);
      components.confidence += 0.1;
    }

    // Extract party name (customer/supplier)
    const toMatch = text.match(/(?:to|for)\s+([A-Za-z\s]+?)(?:\s+for|\s+rs|\s+₹|$)/i);
    const fromMatch = text.match(/(?:from)\s+([A-Za-z\s]+?)(?:\s+for|\s+rs|\s+₹|$)/i);
    
    if (toMatch) {
      components.party = toMatch[1].trim();
      components.confidence += 0.2;
    } else if (fromMatch) {
      components.party = fromMatch[1].trim();
      components.confidence += 0.2;
    }

    // Extract item name
    const itemPatterns = [
      /(?:sold|bought|purchased)\s+(\d+)?\s*([A-Za-z\s]+?)(?:\s+to|\s+from|\s+for|\s+rs|\s+₹)/i,
      /(\d+)\s+([A-Za-z\s]+?)(?:\s+to|\s+from|\s+for|\s+rs|\s+₹)/i
    ];

    for (const pattern of itemPatterns) {
      const match = text.match(pattern);
      if (match) {
        const itemName = match[2] ? match[2].trim() : match[1].trim();
        if (itemName && itemName.length > 2) {
          components.items.push({
            name: itemName,
            quantity: components.quantity || 1
          });
          components.confidence += 0.1;
          break;
        }
      }
    }

    return components;
  }

  /**
   * ========================================
   * MATCH PATTERN
   * ========================================
   */
  static matchesPattern(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * ========================================
   * ENRICH TRANSACTION
   * ========================================
   */
  static async enrichTransaction(parsed, businessId) {
    const enriched = { ...parsed };

    // Find or create party (customer/supplier)
    if (parsed.party) {
      const party = await this.findOrCreateParty(
        parsed.party,
        parsed.type,
        businessId
      );
      enriched.partyId = party.id;
      enriched.partyDetails = party;
    }

    // Find or create items
    if (parsed.items.length > 0) {
      const enrichedItems = [];
      for (const item of parsed.items) {
        const product = await this.findOrCreateProduct(
          item.name,
          businessId
        );
        enrichedItems.push({
          ...item,
          productId: product.id,
          rate: product.sale_price || 0,
          gstRate: product.gst_rate || 18
        });
      }
      enriched.items = enrichedItems;
    }

    // Calculate missing amount if possible
    if (!enriched.amount && enriched.items.length > 0) {
      enriched.amount = enriched.items.reduce((sum, item) => {
        return sum + (item.quantity * item.rate);
      }, 0);
    }

    return enriched;
  }

  /**
   * ========================================
   * FIND OR CREATE PARTY
   * ========================================
   */
  static async findOrCreateParty(name, transactionType, businessId) {
    const tableName = (transactionType === 'sale' || transactionType === 'payment_in')
      ? 'customers'
      : 'suppliers';

    // Search for existing party
    const { data: existing } = await supabase
      .from(tableName)
      .select('*')
      .eq('business_id', businessId)
      .ilike('name', `%${name}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Create new party
    const { data: newParty } = await supabase
      .from(tableName)
      .insert({
        business_id: businessId,
        name: name,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    return newParty;
  }

  /**
   * ========================================
   * FIND OR CREATE PRODUCT
   * ========================================
   */
  static async findOrCreateProduct(name, businessId) {
    // Search for existing product
    const { data: existing } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId)
      .ilike('name', `%${name}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Create new product
    const { data: newProduct } = await supabase
      .from('inventory_items')
      .insert({
        business_id: businessId,
        name: name,
        quantity: 0,
        sale_price: 0,
        purchase_price: 0,
        gst_rate: 18,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    return newProduct;
  }

  /**
   * ========================================
   * GET SUGGESTIONS
   * ========================================
   */
  static async getSuggestions(partialText, businessId) {
    const suggestions = [];

    // Get recent customers
    const { data: customers } = await supabase
      .from('customers')
      .select('name')
      .eq('business_id', businessId)
      .limit(5);

    // Get recent products
    const { data: products } = await supabase
      .from('inventory_items')
      .select('name, sale_price')
      .eq('business_id', businessId)
      .limit(5);

    // Generate suggestions
    if (customers && customers.length > 0) {
      customers.forEach(customer => {
        suggestions.push(`Sold to ${customer.name} for `);
        suggestions.push(`Received payment from ${customer.name} `);
      });
    }

    if (products && products.length > 0) {
      products.forEach(product => {
        suggestions.push(`Sold ${product.name} for ${product.sale_price}`);
        suggestions.push(`Bought ${product.name} for `);
      });
    }

    // Common expense suggestions
    suggestions.push('Paid rent ');
    suggestions.push('Paid salary ');
    suggestions.push('Paid electricity bill ');
    suggestions.push('Bought office supplies ');

    return suggestions;
  }

  /**
   * ========================================
   * VALIDATE PARSED TRANSACTION
   * ========================================
   */
  static validateParsedTransaction(parsed) {
    const errors = [];

    if (!parsed.type) {
      errors.push('Could not determine transaction type');
    }

    if (!parsed.amount || parsed.amount <= 0) {
      errors.push('Could not determine amount');
    }

    if (parsed.confidence < 0.5) {
      errors.push('Low confidence in parsing. Please provide more details.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * ========================================
   * GENERATE CONFIRMATION MESSAGE
   * ========================================
   */
  static generateConfirmationMessage(parsed, language = 'en') {
    const messages = {
      en: {
        sale: `Creating sale invoice for ${parsed.party || 'customer'} - ₹${parsed.amount}`,
        purchase: `Recording purchase from ${parsed.party || 'supplier'} - ₹${parsed.amount}`,
        payment_in: `Recording payment received from ${parsed.party || 'customer'} - ₹${parsed.amount}`,
        payment_out: `Recording payment to ${parsed.party || 'supplier'} - ₹${parsed.amount}`,
        expense: `Recording expense - ₹${parsed.amount}`
      },
      hi: {
        sale: `${parsed.party || 'ग्राहक'} के लिए बिक्री बिल बना रहे हैं - ₹${parsed.amount}`,
        purchase: `${parsed.party || 'आपूर्तिकर्ता'} से खरीद दर्ज कर रहे हैं - ₹${parsed.amount}`,
        payment_in: `${parsed.party || 'ग्राहक'} से भुगतान प्राप्त - ₹${parsed.amount}`,
        payment_out: `${parsed.party || 'आपूर्तिकर्ता'} को भुगतान - ₹${parsed.amount}`,
        expense: `खर्च दर्ज कर रहे हैं - ₹${parsed.amount}`
      }
    };

    const langMessages = messages[language] || messages.en;
    return langMessages[parsed.type] || 'Processing transaction...';
  }
}

export default AITransactionParser;
