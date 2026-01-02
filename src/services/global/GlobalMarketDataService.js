/**
 * GLOBAL MARKET DATA SERVICE
 * 
 * Features:
 * - Real-time stock prices
 * - Forex rates
 * - Commodity prices (Gold, Silver, Oil)
 * - Crypto prices
 * - Market indices (NSE, BSE, S&P 500, NASDAQ, etc.)
 * - Historical data
 * - Market news
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class GlobalMarketDataService {
  static API_ENDPOINTS = {
    STOCKS: 'https://query1.finance.yahoo.com/v8/finance/chart/',
    FOREX: 'https://api.exchangerate-api.com/v4/latest/',
    CRYPTO: 'https://api.coingecko.com/api/v3/',
    COMMODITIES: 'https://api.metals.live/v1/spot',
    NEWS: 'https://newsapi.org/v2/everything'
  };

  static MARKET_INDICES = {
    // Indian Markets
    NIFTY50: { symbol: '^NSEI', name: 'NIFTY 50', exchange: 'NSE' },
    SENSEX: { symbol: '^BSESN', name: 'BSE SENSEX', exchange: 'BSE' },
    BANKNIFTY: { symbol: '^NSEBANK', name: 'BANK NIFTY', exchange: 'NSE' },
    
    // US Markets
    SP500: { symbol: '^GSPC', name: 'S&P 500', exchange: 'NYSE' },
    NASDAQ: { symbol: '^IXIC', name: 'NASDAQ', exchange: 'NASDAQ' },
    DOW: { symbol: '^DJI', name: 'Dow Jones', exchange: 'NYSE' },
    
    // European Markets
    FTSE: { symbol: '^FTSE', name: 'FTSE 100', exchange: 'LSE' },
    DAX: { symbol: '^GDAXI', name: 'DAX', exchange: 'XETRA' },
    CAC: { symbol: '^FCHI', name: 'CAC 40', exchange: 'EURONEXT' },
    
    // Asian Markets
    NIKKEI: { symbol: '^N225', name: 'Nikkei 225', exchange: 'TSE' },
    HANGSENG: { symbol: '^HSI', name: 'Hang Seng', exchange: 'HKEX' },
    SHANGHAI: { symbol: '000001.SS', name: 'Shanghai Composite', exchange: 'SSE' }
  };

  static POPULAR_STOCKS = {
    // Indian Stocks
    RELIANCE: { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
    TCS: { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    INFY: { symbol: 'INFY.NS', name: 'Infosys' },
    HDFCBANK: { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
    ICICIBANK: { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
    
    // US Stocks
    AAPL: { symbol: 'AAPL', name: 'Apple Inc.' },
    MSFT: { symbol: 'MSFT', name: 'Microsoft Corporation' },
    GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    AMZN: { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    TSLA: { symbol: 'TSLA', name: 'Tesla Inc.' },
    META: { symbol: 'META', name: 'Meta Platforms Inc.' },
    NVDA: { symbol: 'NVDA', name: 'NVIDIA Corporation' }
  };

  static COMMODITIES = {
    GOLD: { symbol: 'XAU', name: 'Gold', unit: 'oz' },
    SILVER: { symbol: 'XAG', name: 'Silver', unit: 'oz' },
    CRUDE_OIL: { symbol: 'CL', name: 'Crude Oil', unit: 'barrel' },
    NATURAL_GAS: { symbol: 'NG', name: 'Natural Gas', unit: 'MMBtu' },
    COPPER: { symbol: 'HG', name: 'Copper', unit: 'lb' }
  };

  static CRYPTOCURRENCIES = {
    BTC: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    ETH: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    BNB: { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin' },
    XRP: { id: 'ripple', symbol: 'XRP', name: 'Ripple' },
    ADA: { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    SOL: { id: 'solana', symbol: 'SOL', name: 'Solana' },
    DOGE: { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' }
  };

  /**
   * Get stock price
   */
  static async getStockPrice(symbol) {
    try {
      const response = await fetch(
        `${this.API_ENDPOINTS.STOCKS}${symbol}?interval=1d&range=1d`
      );
      const data = await response.json();

      if (data.chart && data.chart.result && data.chart.result[0]) {
        const result = data.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];

        return {
          success: true,
          symbol,
          price: meta.regularMarketPrice,
          previousClose: meta.previousClose,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          open: quote.open[quote.open.length - 1],
          high: meta.regularMarketDayHigh,
          low: meta.regularMarketDayLow,
          volume: meta.regularMarketVolume,
          currency: meta.currency,
          timestamp: new Date(meta.regularMarketTime * 1000)
        };
      }

      throw new Error('Invalid response from stock API');
    } catch (error) {
      console.error('Get stock price error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get multiple stock prices
   */
  static async getMultipleStocks(symbols) {
    try {
      const promises = symbols.map(symbol => this.getStockPrice(symbol));
      const results = await Promise.all(promises);
      
      return {
        success: true,
        stocks: results.filter(r => r.success)
      };
    } catch (error) {
      console.error('Get multiple stocks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get market indices
   */
  static async getMarketIndices(region = 'ALL') {
    try {
      let indices = [];

      if (region === 'ALL' || region === 'INDIA') {
        indices.push(
          this.MARKET_INDICES.NIFTY50,
          this.MARKET_INDICES.SENSEX,
          this.MARKET_INDICES.BANKNIFTY
        );
      }

      if (region === 'ALL' || region === 'US') {
        indices.push(
          this.MARKET_INDICES.SP500,
          this.MARKET_INDICES.NASDAQ,
          this.MARKET_INDICES.DOW
        );
      }

      if (region === 'ALL' || region === 'EUROPE') {
        indices.push(
          this.MARKET_INDICES.FTSE,
          this.MARKET_INDICES.DAX,
          this.MARKET_INDICES.CAC
        );
      }

      if (region === 'ALL' || region === 'ASIA') {
        indices.push(
          this.MARKET_INDICES.NIKKEI,
          this.MARKET_INDICES.HANGSENG,
          this.MARKET_INDICES.SHANGHAI
        );
      }

      const symbols = indices.map(idx => idx.symbol);
      const result = await this.getMultipleStocks(symbols);

      if (result.success) {
        return {
          success: true,
          indices: result.stocks.map((stock, index) => ({
            ...indices[index],
            ...stock
          }))
        };
      }

      throw new Error('Failed to fetch market indices');
    } catch (error) {
      console.error('Get market indices error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get forex rates
   */
  static async getForexRates(baseCurrency = 'USD') {
    try {
      const response = await fetch(`${this.API_ENDPOINTS.FOREX}${baseCurrency}`);
      const data = await response.json();

      if (data && data.rates) {
        return {
          success: true,
          baseCurrency,
          rates: data.rates,
          date: data.date,
          timestamp: new Date(data.time_last_updated * 1000)
        };
      }

      throw new Error('Invalid response from forex API');
    } catch (error) {
      console.error('Get forex rates error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get commodity prices
   */
  static async getCommodityPrices() {
    try {
      const response = await fetch(this.API_ENDPOINTS.COMMODITIES);
      const data = await response.json();

      return {
        success: true,
        commodities: {
          gold: {
            name: 'Gold',
            price: data.gold,
            unit: 'USD/oz',
            timestamp: new Date(data.timestamp)
          },
          silver: {
            name: 'Silver',
            price: data.silver,
            unit: 'USD/oz',
            timestamp: new Date(data.timestamp)
          }
        }
      };
    } catch (error) {
      console.error('Get commodity prices error:', error);
      
      // Fallback to cached data
      const cached = await AsyncStorage.getItem('commodity_prices');
      if (cached) {
        return { success: true, ...JSON.parse(cached), cached: true };
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cryptocurrency prices
   */
  static async getCryptoPrices(cryptoIds = ['bitcoin', 'ethereum', 'binancecoin']) {
    try {
      const ids = cryptoIds.join(',');
      const response = await fetch(
        `${this.API_ENDPOINTS.CRYPTO}simple/price?ids=${ids}&vs_currencies=usd,inr&include_24hr_change=true&include_market_cap=true`
      );
      const data = await response.json();

      const cryptos = [];
      for (const [id, prices] of Object.entries(data)) {
        const crypto = Object.values(this.CRYPTOCURRENCIES).find(c => c.id === id);
        if (crypto) {
          cryptos.push({
            id,
            symbol: crypto.symbol,
            name: crypto.name,
            priceUSD: prices.usd,
            priceINR: prices.inr,
            change24h: prices.usd_24h_change,
            marketCap: prices.usd_market_cap
          });
        }
      }

      return {
        success: true,
        cryptos,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Get crypto prices error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get market overview
   */
  static async getMarketOverview() {
    try {
      const [indices, forex, commodities, crypto] = await Promise.all([
        this.getMarketIndices('INDIA'),
        this.getForexRates('USD'),
        this.getCommodityPrices(),
        this.getCryptoPrices(['bitcoin', 'ethereum'])
      ]);

      return {
        success: true,
        overview: {
          indices: indices.success ? indices.indices : [],
          forex: forex.success ? forex.rates : {},
          commodities: commodities.success ? commodities.commodities : {},
          crypto: crypto.success ? crypto.cryptos : []
        },
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Get market overview error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search stocks
   */
  static async searchStocks(query) {
    try {
      // Search in popular stocks
      const results = Object.values(this.POPULAR_STOCKS).filter(stock =>
        stock.name.toLowerCase().includes(query.toLowerCase()) ||
        stock.symbol.toLowerCase().includes(query.toLowerCase())
      );

      return {
        success: true,
        results
      };
    } catch (error) {
      console.error('Search stocks error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get historical data
   */
  static async getHistoricalData(symbol, range = '1mo') {
    try {
      const response = await fetch(
        `${this.API_ENDPOINTS.STOCKS}${symbol}?interval=1d&range=${range}`
      );
      const data = await response.json();

      if (data.chart && data.chart.result && data.chart.result[0]) {
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];

        const history = timestamps.map((ts, index) => ({
          date: new Date(ts * 1000),
          open: quote.open[index],
          high: quote.high[index],
          low: quote.low[index],
          close: quote.close[index],
          volume: quote.volume[index]
        }));

        return {
          success: true,
          symbol,
          history,
          range
        };
      }

      throw new Error('Invalid response from API');
    } catch (error) {
      console.error('Get historical data error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get market news
   */
  static async getMarketNews(category = 'business', country = 'in') {
    try {
      // Note: Requires API key from newsapi.org
      const apiKey = 'YOUR_NEWS_API_KEY'; // Replace with actual key
      
      const response = await fetch(
        `${this.API_ENDPOINTS.NEWS}?q=${category}&country=${country}&apiKey=${apiKey}`
      );
      const data = await response.json();

      if (data.status === 'ok') {
        return {
          success: true,
          articles: data.articles.slice(0, 10).map(article => ({
            title: article.title,
            description: article.description,
            url: article.url,
            source: article.source.name,
            publishedAt: new Date(article.publishedAt),
            image: article.urlToImage
          }))
        };
      }

      throw new Error('Failed to fetch news');
    } catch (error) {
      console.error('Get market news error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add to watchlist
   */
  static async addToWatchlist(symbol, name) {
    try {
      const watchlist = await this.getWatchlist();
      
      if (!watchlist.find(item => item.symbol === symbol)) {
        watchlist.push({ symbol, name, addedAt: new Date().toISOString() });
        await AsyncStorage.setItem('market_watchlist', JSON.stringify(watchlist));
      }

      return { success: true, watchlist };
    } catch (error) {
      console.error('Add to watchlist error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get watchlist
   */
  static async getWatchlist() {
    try {
      const data = await AsyncStorage.getItem('market_watchlist');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Get watchlist error:', error);
      return [];
    }
  }

  /**
   * Remove from watchlist
   */
  static async removeFromWatchlist(symbol) {
    try {
      const watchlist = await this.getWatchlist();
      const filtered = watchlist.filter(item => item.symbol !== symbol);
      await AsyncStorage.setItem('market_watchlist', JSON.stringify(filtered));

      return { success: true, watchlist: filtered };
    } catch (error) {
      console.error('Remove from watchlist error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get watchlist with prices
   */
  static async getWatchlistWithPrices() {
    try {
      const watchlist = await this.getWatchlist();
      
      if (watchlist.length === 0) {
        return { success: true, watchlist: [] };
      }

      const symbols = watchlist.map(item => item.symbol);
      const result = await this.getMultipleStocks(symbols);

      if (result.success) {
        const enriched = watchlist.map(item => {
          const stock = result.stocks.find(s => s.symbol === item.symbol);
          return { ...item, ...stock };
        });

        return { success: true, watchlist: enriched };
      }

      return { success: true, watchlist };
    } catch (error) {
      console.error('Get watchlist with prices error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cache market data
   */
  static async cacheMarketData(key, data) {
    try {
      await AsyncStorage.setItem(`market_${key}`, JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Cache market data error:', error);
    }
  }

  /**
   * Get cached market data
   */
  static async getCachedMarketData(key, maxAge = 300000) { // 5 minutes default
    try {
      const cached = await AsyncStorage.getItem(`market_${key}`);
      if (cached) {
        const { data, cachedAt } = JSON.parse(cached);
        const age = Date.now() - new Date(cachedAt).getTime();
        
        if (age < maxAge) {
          return { success: true, data, cached: true };
        }
      }
      return { success: false };
    } catch (error) {
      console.error('Get cached market data error:', error);
      return { success: false };
    }
  }
}

export default GlobalMarketDataService;
