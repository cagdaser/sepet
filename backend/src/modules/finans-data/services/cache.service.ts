import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { NormalizedFinancialData } from './truncgil.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly defaultTtl = 30; // 30 seconds default TTL

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis');
      });
      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });
    } else {
      this.logger.warn('Redis URL not configured, using in-memory cache fallback');
    }
  }

  private memoryCache = new Map<string, { data: any; expires: number }>();

  async set(key: string, value: any, ttlSeconds: number = this.defaultTtl): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        // Fallback to in-memory cache
        const expires = Date.now() + (ttlSeconds * 1000);
        this.memoryCache.set(key, { data: value, expires });
      }
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        // Fallback to in-memory cache
        const cached = this.memoryCache.get(key);
        if (cached && cached.expires > Date.now()) {
          return cached.data as T;
        } else if (cached) {
          this.memoryCache.delete(key);
        }
        return null;
      }
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      } else {
        this.memoryCache.delete(key);
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  // Financial data specific methods
  async setFinancialData(data: NormalizedFinancialData[]): Promise<void> {
    await this.set('truncgil:all', data, 30); // Cache for 30 seconds
    
    // Cache individual symbols
    for (const item of data) {
      await this.set(`truncgil:symbol:${item.symbol}`, item, 30);
    }

    // Cache by type
    const byType = data.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    }, {} as Record<string, NormalizedFinancialData[]>);

    for (const [type, items] of Object.entries(byType)) {
      await this.set(`truncgil:type:${type}`, items, 30);
    }
  }

  async getFinancialData(): Promise<NormalizedFinancialData[] | null> {
    return this.get<NormalizedFinancialData[]>('truncgil:all');
  }

  async getSymbolData(symbol: string): Promise<NormalizedFinancialData | null> {
    return this.get<NormalizedFinancialData>(`truncgil:symbol:${symbol}`);
  }

  async getDataByType(type: string): Promise<NormalizedFinancialData[] | null> {
    return this.get<NormalizedFinancialData[]>(`truncgil:type:${type}`);
  }

  async clearFinancialCache(): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys('truncgil:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      // Clear memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith('truncgil:')) {
          this.memoryCache.delete(key);
        }
      }
    }
  }
}
