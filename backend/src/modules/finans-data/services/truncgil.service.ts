import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TruncgilApiResponse {
  [key: string]: {
    Type?: string;
    Change?: number;
    Name?: string;
    Buying?: number;
    Selling?: number;
    time?: string;
  };
}

export interface NormalizedFinancialData {
  symbol: string;
  type: 'CRYPTO' | 'GOLD' | 'CURRENCY' | 'INDEX';
  price: number;
  priceUSD?: number;
  change24h?: number;
  buyPrice?: number;
  sellPrice?: number;
  timestamp: string;
  source: string;
}

@Injectable()
export class TruncgilService {
  private readonly logger = new Logger(TruncgilService.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('TRUNCGIL_API_URL');
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Finans-Sepet-Backend/1.0',
      },
    });
  }

  async fetchAllData(): Promise<TruncgilApiResponse> {
    try {
      this.logger.log('Fetching data from Truncgil API');
      const response = await this.httpClient.get(this.apiUrl);
      
      if (response.status === 200 && response.data) {
        this.logger.log(`Successfully fetched ${Object.keys(response.data).length} symbols`);
        return response.data;
      }
      
      throw new Error(`API returned status: ${response.status}`);
    } catch (error) {
      this.logger.error('Failed to fetch data from Truncgil API', error.message);
      throw error;
    }
  }

  normalizeData(rawData: TruncgilApiResponse): NormalizedFinancialData[] {
    const normalized: NormalizedFinancialData[] = [];
    const timestamp = new Date().toISOString();

    const entries = Object.entries(rawData);

    for (const [symbol, data] of entries) {
      if (!data || typeof data !== 'object') {
        continue;
      }

      // Determine asset type based on symbol
      const type = this.getAssetType(symbol);
      
      // Extract price information using the correct API field names
      const buyPrice = data.Buying || 0;
      const sellPrice = data.Selling || 0;
      const price = sellPrice || buyPrice || 0; // Use selling price as primary, fall back to buying
      const change24h = data.Change || undefined;

      if (price > 0) {
        normalized.push({
          symbol,
          type,
          price,
          priceUSD: type === 'CRYPTO' ? price : undefined, // Crypto prices are usually in USD
          change24h,
          buyPrice,
          sellPrice,
          timestamp: data.time || timestamp,
          source: 'truncgil',
        });
      }
    }

    this.logger.log(`Normalized ${normalized.length} out of ${entries.length} symbols`);
    return normalized;
  }

  private getAssetType(symbol: string): 'CRYPTO' | 'GOLD' | 'CURRENCY' | 'INDEX' {
    // Crypto currencies
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'USDT', 'ADA', 'SOL', 'DOT', 'AVAX', 'MATIC', 'LTC'];
    if (cryptoSymbols.some(crypto => symbol.includes(crypto))) {
      return 'CRYPTO';
    }

    // Gold symbols
    const goldSymbols = ['GRA', 'HAS', 'CEYREKALTIN', 'CUMHURIYETALTINI', 'YARIALTIN', 'TAMALTIN'];
    if (goldSymbols.some(gold => symbol.includes(gold))) {
      return 'GOLD';
    }

    // Currency symbols
    const currencySymbols = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];
    if (currencySymbols.some(currency => symbol.includes(currency))) {
      return 'CURRENCY';
    }

    // Index symbols
    const indexSymbols = ['XU100', 'XU030', 'BRENT', 'WTI'];
    if (indexSymbols.some(index => symbol.includes(index))) {
      return 'INDEX';
    }

    // Default fallback
    return 'CURRENCY';
  }

  async getSymbolData(symbol: string): Promise<NormalizedFinancialData | null> {
    try {
      const allData = await this.fetchAllData();
      const symbolData = allData[symbol];
      
      if (!symbolData) {
        return null;
      }

      const normalized = this.normalizeData({ [symbol]: symbolData });
      return normalized[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get data for symbol ${symbol}`, error.message);
      return null;
    }
  }

  async getSymbolsByType(type: 'CRYPTO' | 'GOLD' | 'CURRENCY' | 'INDEX'): Promise<NormalizedFinancialData[]> {
    try {
      const allData = await this.fetchAllData();
      const normalized = this.normalizeData(allData);
      
      return normalized.filter(item => item.type === type);
    } catch (error) {
      this.logger.error(`Failed to get data for type ${type}`, error.message);
      return [];
    }
  }
}
