/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RECEIPT SCANNING SERVICE (OCR)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Features:
 * - Take photo of receipt
 * - Extract text using OCR
 * - Parse receipt data (amount, date, vendor, VAT)
 * - Suggest category
 * - Create journal entry
 * - Store receipt image
 * 
 * OCR Providers:
 * - Google Vision API (best accuracy)
 * - Tesseract.js (free, offline)
 * - AWS Textract (good for complex receipts)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { JournalService } from '../accounting/journalService';
import { LedgerService } from '../accounting/ledgerService';

export class ReceiptScanningService {
  static RECEIPTS_KEY = '@mindstack_receipts';
  static RECEIPT_IMAGES_KEY = '@mindstack_receipt_images';

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SCAN RECEIPT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async scanReceipt(imageUri, ocrProvider = 'GOOGLE_VISION') {
    try {
      console.log('📸 Starting receipt scan:', imageUri);

      // 1. Perform OCR
      const ocrResult = await this.performOCR(imageUri, ocrProvider);
      console.log('📝 OCR completed:', ocrResult.text.length, 'characters');

      // 2. Parse receipt data
      const receiptData = this.parseReceiptText(ocrResult.text);
      console.log('📊 Parsed receipt:', receiptData);

      // 3. Suggest category
      const category = await this.suggestCategory(receiptData);
      console.log('🏷️ Suggested category:', category);

      // 4. Create receipt record
      const receipt = {
        id: `RCP-${Date.now()}`,
        imageUri: imageUri,
        ocrText: ocrResult.text,
        
        // Parsed data
        vendor: receiptData.vendor,
        date: receiptData.date,
        amount: receiptData.amount,
        vatAmount: receiptData.vatAmount,
        vatRate: receiptData.vatRate,
        currency: receiptData.currency,
        
        // Suggested categorization
        suggestedCategory: category.category,
        suggestedAccount: category.account,
        confidence: category.confidence,
        
        // Status
        status: 'PENDING_REVIEW',
        scannedAt: moment().toISOString(),
        
        // Additional info
        items: receiptData.items || [],
        paymentMethod: receiptData.paymentMethod,
        receiptNumber: receiptData.receiptNumber
      };

      // 5. Save receipt
      await this.saveReceipt(receipt);

      // 6. Save image
      await this.saveReceiptImage(receipt.id, imageUri);

      return {
        success: true,
        data: receipt
      };

    } catch (error) {
      console.error('Receipt scan error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PERFORM OCR
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async performOCR(imageUri, provider) {
    switch (provider) {
      case 'GOOGLE_VISION':
        return await this.googleVisionOCR(imageUri);
      
      case 'TESSERACT':
        return await this.tesseractOCR(imageUri);
      
      case 'AWS_TEXTRACT':
        return await this.awsTextractOCR(imageUri);
      
      default:
        return await this.googleVisionOCR(imageUri);
    }
  }

  /**
   * Google Vision API OCR
   */
  static async googleVisionOCR(imageUri) {
    try {
      // Note: In production, you'd call Google Vision API
      // For now, this is a placeholder that simulates OCR

      // Read image as base64
      const base64Image = await this.imageToBase64(imageUri);

      // Call Google Vision API
      const apiKey = await this.getGoogleVisionAPIKey();
      
      if (!apiKey) {
        throw new Error('Google Vision API key not configured');
      }

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 1
                  }
                ]
              }
            ]
          })
        }
      );

      const result = await response.json();

      if (result.responses && result.responses[0].textAnnotations) {
        const text = result.responses[0].textAnnotations[0].description;
        return {
          success: true,
          text: text,
          provider: 'GOOGLE_VISION'
        };
      } else {
        throw new Error('No text detected in image');
      }

    } catch (error) {
      console.error('Google Vision OCR error:', error);
      throw error;
    }
  }

  /**
   * Tesseract.js OCR (Free, Offline)
   */
  static async tesseractOCR(imageUri) {
    try {
      // Note: In production, you'd use Tesseract.js
      // This is a placeholder

      // For React Native, you'd use react-native-tesseract-ocr
      // const text = await TesseractOcr.recognize(imageUri, 'LANG_ENGLISH');

      return {
        success: true,
        text: 'Tesseract OCR placeholder',
        provider: 'TESSERACT'
      };

    } catch (error) {
      console.error('Tesseract OCR error:', error);
      throw error;
    }
  }

  /**
   * AWS Textract OCR
   */
  static async awsTextractOCR(imageUri) {
    try {
      // Note: In production, you'd call AWS Textract
      // This is a placeholder

      return {
        success: true,
        text: 'AWS Textract placeholder',
        provider: 'AWS_TEXTRACT'
      };

    } catch (error) {
      console.error('AWS Textract OCR error:', error);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * PARSE RECEIPT TEXT
   * ═══════════════════════════════════════════════════════════════════════
   */
  static parseReceiptText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    const receiptData = {
      vendor: null,
      date: null,
      amount: null,
      vatAmount: null,
      vatRate: null,
      currency: 'CHF',
      items: [],
      paymentMethod: null,
      receiptNumber: null
    };

    // Extract vendor (usually first line or line with company keywords)
    receiptData.vendor = this.extractVendor(lines);

    // Extract date
    receiptData.date = this.extractDate(lines);

    // Extract amount
    const amountData = this.extractAmount(lines);
    receiptData.amount = amountData.amount;
    receiptData.currency = amountData.currency;

    // Extract VAT
    const vatData = this.extractVAT(lines);
    receiptData.vatAmount = vatData.amount;
    receiptData.vatRate = vatData.rate;

    // Extract receipt number
    receiptData.receiptNumber = this.extractReceiptNumber(lines);

    // Extract payment method
    receiptData.paymentMethod = this.extractPaymentMethod(lines);

    // Extract items (if possible)
    receiptData.items = this.extractItems(lines);

    return receiptData;
  }

  /**
   * Extract vendor name
   */
  static extractVendor(lines) {
    // Usually the first few lines contain vendor name
    // Look for lines with company keywords
    const companyKeywords = ['gmbh', 'ag', 'sa', 'ltd', 'inc', 'corp', 'restaurant', 'hotel', 'shop'];
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      
      // Check if line contains company keywords
      if (companyKeywords.some(keyword => line.includes(keyword))) {
        return lines[i];
      }
      
      // Or if it's a longer line (likely company name)
      if (lines[i].length > 10 && lines[i].length < 50) {
        return lines[i];
      }
    }

    return lines[0] || 'Unknown Vendor';
  }

  /**
   * Extract date
   */
  static extractDate(lines) {
    const datePatterns = [
      /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/,  // DD.MM.YYYY or DD/MM/YYYY
      /(\d{2,4})[.\/-](\d{1,2})[.\/-](\d{1,2})/,  // YYYY.MM.DD or YYYY/MM/DD
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{2,4})/i
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          // Try to parse the date
          const date = moment(match[0], ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY']);
          if (date.isValid()) {
            return date.toISOString();
          }
        }
      }
    }

    // Default to today
    return moment().toISOString();
  }

  /**
   * Extract amount
   */
  static extractAmount(lines) {
    // Look for total amount keywords
    const totalKeywords = ['total', 'gesamt', 'betrag', 'montant', 'totale', 'sum', 'amount'];
    
    // Amount patterns
    const amountPattern = /(\d{1,10}[',.]?\d{0,3}[.,]\d{2})\s*(chf|eur|usd|€|\$|fr\.?)?/i;

    let maxAmount = 0;
    let currency = 'CHF';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains total keywords
      const hasTotal = totalKeywords.some(keyword => lowerLine.includes(keyword));
      
      // Extract amount
      const match = line.match(amountPattern);
      if (match) {
        const amountStr = match[1].replace(/[']/g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount)) {
          // If line has "total" keyword, prioritize this amount
          if (hasTotal) {
            maxAmount = amount;
            currency = match[2] ? this.normalizeCurrency(match[2]) : 'CHF';
            break;
          }
          
          // Otherwise, keep track of maximum amount
          if (amount > maxAmount) {
            maxAmount = amount;
            currency = match[2] ? this.normalizeCurrency(match[2]) : 'CHF';
          }
        }
      }
    }

    return {
      amount: maxAmount,
      currency: currency
    };
  }

  /**
   * Extract VAT
   */
  static extractVAT(lines) {
    const vatKeywords = ['mwst', 'vat', 'tva', 'iva', 'tax', 'steuer'];
    const vatPattern = /(\d{1,2}[.,]\d{1,2})\s*%/;
    const amountPattern = /(\d{1,10}[',.]?\d{0,3}[.,]\d{2})/;

    let vatRate = null;
    let vatAmount = null;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains VAT keywords
      const hasVAT = vatKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasVAT) {
        // Extract VAT rate
        const rateMatch = line.match(vatPattern);
        if (rateMatch) {
          const rateStr = rateMatch[1].replace(',', '.');
          vatRate = parseFloat(rateStr);
        }
        
        // Extract VAT amount
        const amountMatch = line.match(amountPattern);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/[']/g, '').replace(',', '.');
          vatAmount = parseFloat(amountStr);
        }
      }
    }

    return {
      rate: vatRate,
      amount: vatAmount
    };
  }

  /**
   * Extract receipt number
   */
  static extractReceiptNumber(lines) {
    const receiptKeywords = ['receipt', 'beleg', 'quittung', 'reçu', 'ricevuta', 'bon', 'ticket'];
    const numberPattern = /[#:]?\s*(\d{4,})/;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains receipt keywords
      const hasReceipt = receiptKeywords.some(keyword => lowerLine.includes(keyword));
      
      if (hasReceipt) {
        const match = line.match(numberPattern);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * Extract payment method
   */
  static extractPaymentMethod(lines) {
    const text = lines.join(' ').toLowerCase();

    if (text.includes('cash') || text.includes('bar') || text.includes('espèces')) {
      return 'CASH';
    } else if (text.includes('card') || text.includes('karte') || text.includes('carte')) {
      return 'CARD';
    } else if (text.includes('credit')) {
      return 'CREDIT_CARD';
    } else if (text.includes('debit')) {
      return 'DEBIT_CARD';
    }

    return null;
  }

  /**
   * Extract items (if possible)
   */
  static extractItems(lines) {
    // This is complex and depends on receipt format
    // For now, return empty array
    // In production, you'd use more sophisticated parsing
    return [];
  }

  /**
   * Normalize currency
   */
  static normalizeCurrency(currencyStr) {
    const normalized = currencyStr.toLowerCase().trim();
    
    if (normalized.includes('chf') || normalized.includes('fr')) {
      return 'CHF';
    } else if (normalized.includes('eur') || normalized.includes('€')) {
      return 'EUR';
    } else if (normalized.includes('usd') || normalized.includes('$')) {
      return 'USD';
    }
    
    return 'CHF';
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * SUGGEST CATEGORY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async suggestCategory(receiptData) {
    const vendor = (receiptData.vendor || '').toLowerCase();
    const amount = receiptData.amount || 0;

    // Category patterns
    const patterns = {
      'FUEL': {
        keywords: ['esso', 'shell', 'bp', 'migrol', 'tamoil', 'benzin', 'petrol', 'gas station'],
        account: 'FUEL-001'
      },
      'RESTAURANT': {
        keywords: ['restaurant', 'café', 'coffee', 'pizza', 'burger', 'mcdonald', 'starbucks'],
        account: 'MEAL-001'
      },
      'SUPERMARKET': {
        keywords: ['migros', 'coop', 'aldi', 'lidl', 'denner', 'spar', 'supermarket'],
        account: 'SUPPLIES-001'
      },
      'OFFICE_SUPPLIES': {
        keywords: ['staples', 'office', 'papeterie', 'büro'],
        account: 'OFF-001'
      },
      'HOTEL': {
        keywords: ['hotel', 'motel', 'inn', 'accommodation'],
        account: 'TRV-001'
      },
      'PARKING': {
        keywords: ['parking', 'parkhaus', 'parkplatz'],
        account: 'PARK-001'
      },
      'PHARMACY': {
        keywords: ['pharmacy', 'apotheke', 'pharmacie', 'medikament'],
        account: 'MED-001'
      },
      'HARDWARE': {
        keywords: ['bauhaus', 'hornbach', 'obi', 'hardware', 'baumarkt'],
        account: 'MAINT-001'
      }
    };

    // Check patterns
    let bestMatch = null;
    let bestScore = 0;

    for (const [category, pattern] of Object.entries(patterns)) {
      let score = 0;
      
      for (const keyword of pattern.keywords) {
        if (vendor.includes(keyword)) {
          score += 1;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          category: category,
          account: pattern.account,
          confidence: Math.min(score / pattern.keywords.length, 1.0)
        };
      }
    }

    // Default category if no match
    if (!bestMatch) {
      bestMatch = {
        category: 'OTHER_EXPENSE',
        account: 'OTH-EXP-001',
        confidence: 0.3
      };
    }

    return bestMatch;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * CONFIRM AND CREATE JOURNAL ENTRY
   * ═══════════════════════════════════════════════════════════════════════
   */
  static async confirmAndCreateEntry(receiptId, confirmedData) {
    try {
      // Get receipt
      const receiptsData = await AsyncStorage.getItem(this.RECEIPTS_KEY);
      const receipts = receiptsData ? JSON.parse(receiptsData) : [];
      const receipt = receipts.find(r => r.id === receiptId);

      if (!receipt) {
        return {
          success: false,
          error: 'Receipt not found'
        };
      }

      // Update receipt with confirmed data
      const updatedReceipt = {
        ...receipt,
        ...confirmedData,
        status: 'CONFIRMED',
        confirmedAt: moment().toISOString()
      };

      // Create journal entry
      const journalEntry = {
        voucherType: 'EXPENSE',
        voucherNumber: `RCP-${receiptId}`,
        date: updatedReceipt.date,
        entries: [
          {
            accountCode: updatedReceipt.suggestedAccount,
            accountName: updatedReceipt.suggestedCategory,
            debit: updatedReceipt.amount,
            credit: 0
          },
          {
            accountCode: 'CASH-001',
            accountName: 'Cash A/c',
            debit: 0,
            credit: updatedReceipt.amount
          }
        ],
        totalDebit: updatedReceipt.amount,
        totalCredit: updatedReceipt.amount,
        narration: `${updatedReceipt.vendor} - ${updatedReceipt.suggestedCategory}`,
        reference: receiptId,
        attachments: [updatedReceipt.imageUri]
      };

      const result = await JournalService.createJournalEntry(journalEntry);
      
      if (result.success) {
        await LedgerService.postToLedger(journalEntry);
      }

      // Update receipt status
      const receiptIndex = receipts.findIndex(r => r.id === receiptId);
      receipts[receiptIndex] = updatedReceipt;
      await AsyncStorage.setItem(this.RECEIPTS_KEY, JSON.stringify(receipts));

      return {
        success: true,
        data: {
          receipt: updatedReceipt,
          journalEntry: result
        }
      };

    } catch (error) {
      console.error('Confirm and create entry error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UTILITY FUNCTIONS
   * ═══════════════════════════════════════════════════════════════════════
   */
  
  /**
   * Convert image to base64
   */
  static async imageToBase64(imageUri) {
    // In React Native, you'd use react-native-fs or similar
    // This is a placeholder
    return 'base64_image_data';
  }

  /**
   * Get Google Vision API key
   */
  static async getGoogleVisionAPIKey() {
    try {
      const apiKey = await AsyncStorage.getItem('@mindstack_google_vision_api_key');
      return apiKey;
    } catch (error) {
      console.error('Get Google Vision API key error:', error);
      return null;
    }
  }

  /**
   * Save receipt
   */
  static async saveReceipt(receipt) {
    try {
      const receiptsData = await AsyncStorage.getItem(this.RECEIPTS_KEY);
      const receipts = receiptsData ? JSON.parse(receiptsData) : [];
      
      receipts.unshift(receipt);
      
      await AsyncStorage.setItem(this.RECEIPTS_KEY, JSON.stringify(receipts));
      
      return { success: true };
    } catch (error) {
      console.error('Save receipt error:', error);
      throw error;
    }
  }

  /**
   * Save receipt image
   */
  static async saveReceiptImage(receiptId, imageUri) {
    try {
      const imagesData = await AsyncStorage.getItem(this.RECEIPT_IMAGES_KEY);
      const images = imagesData ? JSON.parse(imagesData) : {};
      
      images[receiptId] = imageUri;
      
      await AsyncStorage.setItem(this.RECEIPT_IMAGES_KEY, JSON.stringify(images));
      
      return { success: true };
    } catch (error) {
      console.error('Save receipt image error:', error);
      throw error;
    }
  }

  /**
   * Get all receipts
   */
  static async getAllReceipts() {
    try {
      const receiptsData = await AsyncStorage.getItem(this.RECEIPTS_KEY);
      const receipts = receiptsData ? JSON.parse(receiptsData) : [];
      
      return {
        success: true,
        data: receipts
      };
    } catch (error) {
      console.error('Get all receipts error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get receipt by ID
   */
  static async getReceiptById(receiptId) {
    try {
      const receiptsData = await AsyncStorage.getItem(this.RECEIPTS_KEY);
      const receipts = receiptsData ? JSON.parse(receiptsData) : [];
      const receipt = receipts.find(r => r.id === receiptId);
      
      return {
        success: true,
        data: receipt
      };
    } catch (error) {
      console.error('Get receipt by ID error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ReceiptScanningService;