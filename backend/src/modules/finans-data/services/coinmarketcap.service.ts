import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosInstance } from 'axios';

export interface CoinMarketCapResponse {
  data: CoinMarketCapCoin[];
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
    elapsed: number;
    credit_count: number;
    notice: string | null;
  };
}

export interface CoinMarketCapCoin {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  num_market_pairs: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  last_updated: string;
  date_added: string;
  tags: string[];
  platform: any;
  self_reported_circulating_supply: number | null;
  self_reported_market_cap: number | null;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      volume_change_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_60d: number;
      percent_change_90d: number;
      market_cap: number;
      market_cap_dominance: number;
      fully_diluted_market_cap: number;
      last_updated: string;
    };
  };
}

export interface CoinRankingData {
  symbol: string;
  rank: number;
  marketCap: number;
  volume24h: number;
  volumeChange24h: number;
  lastUpdated: string;
}

@Injectable()
export class CoinMarketCapService implements OnModuleInit {
  private readonly logger = new Logger(CoinMarketCapService.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl = 'https://pro-api.coinmarketcap.com';
  private readonly apiKey = 'b6194574a3ba4f04ac23f3a70f0dc1eb';
  
  // Cache for ranking data
  private rankingCache: Map<string, CoinRankingData> = new Map();
  private lastUpdate: Date | null = null;
  private readonly cacheValidityHours = 8;

  constructor(private configService: ConfigService) {
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'X-CMC_PRO_API_KEY': this.apiKey,
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'Accept-Encoding': 'deflate, gzip',
        'User-Agent': 'Finans-Sepet-Backend/1.0',
      },
    });
  }

  async onModuleInit() {
    // Fetch initial data on startup
    await this.fetchRankingData();
  }

  /**
   * Scheduled task to fetch ranking data every 8 hours
   */
  @Cron('0 */8 * * *', {
    name: 'coinmarketcap-ranking-update',
    timeZone: 'Europe/Istanbul',
  })
  async scheduledRankingUpdate() {
    this.logger.log('Starting scheduled CoinMarketCap ranking update');
    await this.fetchRankingData();
  }

  /**
   * Fetch top 500 coins ranking data from CoinMarketCap
   */
  async fetchRankingData(): Promise<boolean> {
    try {
      this.logger.log('Fetching CoinMarketCap ranking data for top 500 coins...');
      
      const response = await this.httpClient.get<CoinMarketCapResponse>('/v1/cryptocurrency/listings/latest', {
        params: {
          start: 1,
          limit: 500, // Top 500 coins
          convert: 'USD',
          sort: 'market_cap',
          sort_dir: 'desc',
          cryptocurrency_type: 'all',
          tag: 'all',
        },
      });

      if (response.data.status.error_code !== 0) {
        throw new Error(`CoinMarketCap API error: ${response.data.status.error_message}`);
      }

      // Clear old cache
      this.rankingCache.clear();
      
      // Process and cache the data
      let processedCount = 0;
      for (const coin of response.data.data) {
        if (coin.quote?.USD) {
          const rankingData: CoinRankingData = {
            symbol: coin.symbol,
            rank: coin.cmc_rank,
            marketCap: coin.quote.USD.market_cap,
            volume24h: coin.quote.USD.volume_24h,
            volumeChange24h: coin.quote.USD.volume_change_24h,
            lastUpdated: coin.quote.USD.last_updated,
          };
          
          this.rankingCache.set(coin.symbol, rankingData);
          processedCount++;
        }
      }

      this.lastUpdate = new Date();
      
      this.logger.log(`Successfully cached ranking data for ${processedCount} coins`);
      this.logger.log(`API Credits used: ${response.data.status.credit_count}`);
      
      return true;
    } catch (error) {
      this.logger.error('Failed to fetch CoinMarketCap ranking data', error.message);
      if (error.response?.data) {
        this.logger.error('CoinMarketCap API Response:', JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }

  /**
   * Get ranking data for a specific symbol
   */
  getRankingData(symbol: string): CoinRankingData | null {
    // Remove common suffixes to match CMC symbols (e.g., BTCUSDT -> BTC)
    const cleanSymbol = this.cleanSymbolForCMC(symbol);
    return this.rankingCache.get(cleanSymbol) || null;
  }

  /**
   * Get all cached ranking data
   */
  getAllRankingData(): Map<string, CoinRankingData> {
    return new Map(this.rankingCache);
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(): boolean {
    if (!this.lastUpdate) return false;
    
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - this.lastUpdate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate < this.cacheValidityHours;
  }

  /**
   * Force refresh ranking data
   */
  async forceRefresh(): Promise<boolean> {
    this.logger.log('Force refreshing CoinMarketCap ranking data...');
    return await this.fetchRankingData();
  }

  /**
   * Clean symbol to match CoinMarketCap format
   */
  private cleanSymbolForCMC(symbol: string): string {
    // Remove common trading pair suffixes
    return symbol
      .replace(/USDT$/, '')
      .replace(/TRY$/, '')
      .replace(/BUSD$/, '')
      .replace(/BTC$/, '')
      .replace(/ETH$/, '')
      .replace(/BNB$/, '')
      .toUpperCase();
  }

  /**
   * Format volume numbers (e.g., 1.2B, 500M, 1.5K)
   */
  static formatVolume(volume: number): string {
    if (volume === 0) return '0';
    
    const abs = Math.abs(volume);
    const sign = volume < 0 ? '-' : '';
    
    if (abs >= 1e12) {
      return `${sign}${(abs / 1e12).toFixed(1)}T`;
    } else if (abs >= 1e9) {
      return `${sign}${(abs / 1e9).toFixed(1)}B`;
    } else if (abs >= 1e6) {
      return `${sign}${(abs / 1e6).toFixed(1)}M`;
    } else if (abs >= 1e3) {
      return `${sign}${(abs / 1e3).toFixed(1)}K`;
    } else {
      return `${sign}${abs.toFixed(2)}`;
    }
  }

  /**
   * Format market cap numbers
   */
  static formatMarketCap(marketCap: number): string {
    return this.formatVolume(marketCap);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cachedCoins: this.rankingCache.size,
      lastUpdate: this.lastUpdate?.toISOString() || null,
      cacheValid: this.isCacheValid(),
      nextUpdateIn: this.lastUpdate ? 
        Math.max(0, this.cacheValidityHours * 60 * 60 * 1000 - (Date.now() - this.lastUpdate.getTime())) : 0,
    };
  }
}
