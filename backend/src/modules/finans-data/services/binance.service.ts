import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as WebSocket from 'ws';
import * as fs from 'fs';
import * as path from 'path';

export interface BinanceTickerResponse {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
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

interface BinanceSymbols {
  symbols: string[];
  usdt_count: number;
  try_count: number;
  total_count: number;
}

@Injectable()
export class BinanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BinanceService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'https://api.binance.com';
  private readonly wsUrl = 'wss://stream.binance.com:9443/ws';
  private webSocket: WebSocket | null = null;
  private priceCache: Map<string, BinanceTickerResponse> = new Map();
  private symbols: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  constructor(private configService: ConfigService) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'Finans-Sepet-Backend/1.0',
      },
    });
    this.loadSymbols();
  }

  async onModuleInit() {
    await this.initializeData();
    this.connectWebSocket();
  }

  onModuleDestroy() {
    this.disconnectWebSocket();
  }

  private loadSymbols() {
    try {
      const symbolsPath = path.join(process.cwd(), 'backend/data/binance.json');
      const symbolsData: BinanceSymbols = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));
      
      // Filter only USDT and TRY symbols
      this.symbols = symbolsData.symbols.filter(symbol => 
        symbol.endsWith('USDT') || symbol.endsWith('TRY')
      );
      
      this.logger.log(`Loaded ${this.symbols.length} symbols (USDT: ${symbolsData.usdt_count}, TRY: ${symbolsData.try_count})`);
    } catch (error) {
      this.logger.error('Failed to load symbols from binance.json', error.message);
      this.symbols = ['BTCUSDT', 'ETHUSDT', 'BTCTRY', 'ETHTRY']; // fallback
    }
  }

  private async initializeData() {
    this.logger.log('Initializing Binance data...');
    try {
      // Fetch initial data for all symbols
      const promises = this.symbols.map(symbol => this.fetchSymbolData(symbol));
      const results = await Promise.allSettled(promises);
      
      let successCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          this.priceCache.set(this.symbols[index], result.value);
          successCount++;
        } else {
          this.logger.warn(`Failed to initialize data for ${this.symbols[index]}`);
        }
      });
      
      this.logger.log(`Initialized ${successCount}/${this.symbols.length} symbols`);
    } catch (error) {
      this.logger.error('Failed to initialize Binance data', error.message);
    }
  }

  private connectWebSocket() {
    if (this.webSocket) {
      this.disconnectWebSocket();
    }

    try {
      // Create streams for all symbols
      const streams = this.symbols.map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
      const wsUrl = `${this.wsUrl}/${streams}`;
      
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.on('open', () => {
        this.logger.log('WebSocket connected to Binance');
        this.reconnectAttempts = 0;
      });

      this.webSocket.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.stream && message.data) {
            const tickerData = message.data as BinanceTickerResponse;
            this.priceCache.set(tickerData.symbol, tickerData);
            
            this.logger.debug(`Updated price for ${tickerData.symbol}: ${tickerData.lastPrice}`);
          }
        } catch (error) {
          this.logger.error('Error processing WebSocket message', error.message);
        }
      });

      this.webSocket.on('error', (error) => {
        this.logger.error('WebSocket error', error.message);
      });

      this.webSocket.on('close', () => {
        this.logger.warn('WebSocket connection closed');
        this.scheduleReconnect();
      });

    } catch (error) {
      this.logger.error('Failed to connect to WebSocket', error.message);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.logger.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectDelay);
  }

  private disconnectWebSocket() {
    if (this.webSocket) {
      this.webSocket.removeAllListeners();
      this.webSocket.close();
      this.webSocket = null;
    }
  }

  async fetchSymbolData(symbol: string): Promise<BinanceTickerResponse | null> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
        params: { symbol }
      });
      
      if (response.status === 200 && response.data) {
        return response.data as BinanceTickerResponse;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to fetch data for ${symbol}`, error.message);
      return null;
    }
  }

  async fetchAllData(): Promise<BinanceTickerResponse[]> {
    try {
      this.logger.log('Fetching all data from Binance API');
      
      // If we have cached data, return it
      if (this.priceCache.size > 0) {
        return Array.from(this.priceCache.values());
      }

      // Otherwise, fetch fresh data
      const promises = this.symbols.map(symbol => this.fetchSymbolData(symbol));
      const results = await Promise.allSettled(promises);
      
      const successfulResults: BinanceTickerResponse[] = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          successfulResults.push(result.value);
          this.priceCache.set(result.value.symbol, result.value);
        }
      });

      this.logger.log(`Successfully fetched ${successfulResults.length}/${this.symbols.length} symbols`);
      return successfulResults;
      
    } catch (error) {
      this.logger.error('Failed to fetch data from Binance API', error.message);
      throw error;
    }
  }

  normalizeData(rawData: BinanceTickerResponse[]): NormalizedFinancialData[] {
    const normalized: NormalizedFinancialData[] = [];
    const timestamp = new Date().toISOString();

    for (const data of rawData) {
      if (!data || !data.symbol) {
        continue;
      }

      const symbol = data.symbol;
      const price = parseFloat(data.lastPrice);
      const priceChange = parseFloat(data.priceChange);
      const priceChangePercent = parseFloat(data.priceChangePercent);
      const bidPrice = parseFloat(data.bidPrice);
      const askPrice = parseFloat(data.askPrice);

      if (price > 0) {
        const normalizedData: NormalizedFinancialData = {
          symbol,
          type: 'CRYPTO',
          price,
          priceUSD: symbol.endsWith('USDT') ? price : undefined,
          change24h: priceChangePercent,
          buyPrice: bidPrice,
          sellPrice: askPrice,
          timestamp,
          source: 'binance',
        };

        normalized.push(normalizedData);
      }
    }

    this.logger.log(`Normalized ${normalized.length} crypto symbols`);
    return normalized;
  }

  async getSymbolData(symbol: string): Promise<NormalizedFinancialData | null> {
    try {
      // First check cache
      let symbolData = this.priceCache.get(symbol);
      
      if (!symbolData) {
        // If not in cache, fetch from API
        symbolData = await this.fetchSymbolData(symbol);
        if (symbolData) {
          this.priceCache.set(symbol, symbolData);
        }
      }
      
      if (!symbolData) {
        return null;
      }

      const normalized = this.normalizeData([symbolData]);
      return normalized[0] || null;
    } catch (error) {
      this.logger.error(`Failed to get data for symbol ${symbol}`, error.message);
      return null;
    }
  }

  async getCryptoData(): Promise<NormalizedFinancialData[]> {
    try {
      const allData = await this.fetchAllData();
      return this.normalizeData(allData);
    } catch (error) {
      this.logger.error('Failed to get crypto data', error.message);
      return [];
    }
  }

  async getUSDTPairs(): Promise<NormalizedFinancialData[]> {
    try {
      const allData = await this.fetchAllData();
      const usdtPairs = allData.filter(data => data.symbol.endsWith('USDT'));
      return this.normalizeData(usdtPairs);
    } catch (error) {
      this.logger.error('Failed to get USDT pairs', error.message);
      return [];
    }
  }

  async getTRYPairs(): Promise<NormalizedFinancialData[]> {
    try {
      const allData = await this.fetchAllData();
      const tryPairs = allData.filter(data => data.symbol.endsWith('TRY'));
      return this.normalizeData(tryPairs);
    } catch (error) {
      this.logger.error('Failed to get TRY pairs', error.message);
      return [];
    }
  }

  getWebSocketStatus(): boolean {
    return this.webSocket?.readyState === WebSocket.OPEN;
  }

  getCachedSymbolsCount(): number {
    return this.priceCache.size;
  }

  getLoadedSymbolsCount(): number {
    return this.symbols.length;
  }
}
