import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TruncgilService, NormalizedFinancialData } from './truncgil.service';
import { FinanceGateway } from '../gateways/finance.gateway';
import { CacheService } from './cache.service';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DynamicFinancialData extends NormalizedFinancialData {
  basePrice: number;
  baseBuyPrice?: number;
  baseSellPrice?: number;
  baseChange24h?: number; // Original 24h change from API
  volatility: number;
  trend: 'up' | 'down' | 'sideways';
  lastDirection: 'up' | 'down' | 'stable';
  trendStrength: number; // 0.1 to 1.0
}

@Injectable()
export class DynamicDataService {
  private readonly logger = new Logger(DynamicDataService.name);
  private dynamicData: Map<string, DynamicFinancialData> = new Map();
  private isInitialized = false;
  private lastBaseDataUpdate = 0;
  private updateCounter = 0;
  
  constructor(
    private readonly truncgilService: TruncgilService,
    private readonly financeGateway: FinanceGateway,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
  ) {}

  // Fetch base data every 30 seconds from Truncgil
  @Cron('*/30 * * * * *', { name: 'base-data-update' })
  async updateBaseData() {
    try {
      this.logger.debug('Updating base data from Truncgil...');
      
      const rawData = await this.truncgilService.fetchAllData();
      const normalizedData = this.truncgilService.normalizeData(rawData);
      
      if (normalizedData.length === 0) {
        this.logger.warn('No base data received');
        return;
      }

      // Update base data and calculate volatility
      this.updateDynamicBaseData(normalizedData);
      this.lastBaseDataUpdate = Date.now();
      this.isInitialized = true;
      
      this.logger.log(`Updated base data for ${normalizedData.length} symbols`);
      
    } catch (error) {
      this.logger.error('Failed to update base data:', error);
    }
  }

  // Generate dynamic price movements every second
  @Cron('* * * * * *', { name: 'dynamic-price-update' })
  async generateDynamicPrices() {
    if (!this.isInitialized || this.dynamicData.size === 0) {
      return;
    }

    try {
      this.updateCounter++;
      const updatedData: NormalizedFinancialData[] = [];
      
      for (const [symbol, data] of this.dynamicData.entries()) {
        const updatedItem = this.simulatePriceMovement(data);
        this.dynamicData.set(symbol, updatedItem);
        
        // Convert back to NormalizedFinancialData format
        updatedData.push({
          symbol: updatedItem.symbol,
          type: updatedItem.type,
          price: updatedItem.price,
          buyPrice: updatedItem.buyPrice,
          sellPrice: updatedItem.sellPrice,
          change24h: updatedItem.change24h,
          priceUSD: updatedItem.priceUSD,
          timestamp: new Date().toISOString(),
          source: 'dynamic-simulation',
        });
      }

      // Update cache
      await this.cacheService.setFinancialData(updatedData);
      
      // Store snapshots every 10 seconds to avoid too much DB load
      if (this.updateCounter % 10 === 0) {
        await this.storePriceSnapshots(updatedData);
      }
      
      // Broadcast via WebSocket
      this.financeGateway.broadcastPriceUpdate(updatedData);
      
      this.logger.debug(`Generated dynamic prices for ${updatedData.length} symbols`);
      
    } catch (error) {
      this.logger.error('Failed to generate dynamic prices:', error);
    }
  }

  private updateDynamicBaseData(baseData: NormalizedFinancialData[]) {
    for (const item of baseData) {
      const existing = this.dynamicData.get(item.symbol);
      
      const volatility = this.calculateVolatility(item);
      const trend = this.determineTrend(item, existing);
      
      const dynamicItem: DynamicFinancialData = {
        ...item,
        basePrice: item.price,
        baseBuyPrice: item.buyPrice,
        baseSellPrice: item.sellPrice,
        baseChange24h: item.change24h, // Store original 24h change from API
        volatility,
        trend,
        lastDirection: 'stable',
        trendStrength: Math.random() * 0.3 + 0.2, // 0.2 to 0.5 (much more conservative)
      };
      
      this.dynamicData.set(item.symbol, dynamicItem);
    }
  }

  private calculateVolatility(item: NormalizedFinancialData): number {
    // Much more conservative base volatility - max 0.20% per second
    let baseVolatility = 0.0015; // 0.15% default
    
    switch (item.type) {
      case 'CRYPTO':
        baseVolatility = 0.002; // 0.20% for crypto (was 5%)
        break;
      case 'GOLD':
        baseVolatility = 0.001; // 0.10% for gold (was 1.5%)
        break;
      case 'CURRENCY':
        baseVolatility = 0.0008; // 0.08% for currency (was 0.8%)
        break;
      case 'INDEX':
        baseVolatility = 0.0012; // 0.12% for indices (was 2.5%)
        break;
    }
    
    // Very limited randomness to keep it predictable
    return baseVolatility * (0.8 + Math.random() * 0.4); // 80%-120% of base
  }

  private determineTrend(item: NormalizedFinancialData, existing?: DynamicFinancialData): 'up' | 'down' | 'sideways' {
    if (existing && existing.basePrice) {
      const priceChange = (item.price - existing.basePrice) / existing.basePrice;
      if (priceChange > 0.001) return 'up';
      if (priceChange < -0.001) return 'down';
    }
    
    // Use change24h if available
    if (item.change24h) {
      if (item.change24h > 0.1) return 'up';
      if (item.change24h < -0.1) return 'down';
    }
    
    // Random trend for new items
    const rand = Math.random();
    if (rand < 0.4) return 'up';
    if (rand < 0.8) return 'down';
    return 'sideways';
  }

  private simulatePriceMovement(data: DynamicFinancialData): DynamicFinancialData {
    const timeSinceBase = Date.now() - this.lastBaseDataUpdate;
    const cycleFactor = Math.sin(timeSinceBase / 5000) * 0.3; // 5-second cycle
    
    // Generate movement based on trend and volatility
    let movement = 0;
    
    switch (data.trend) {
      case 'up':
        movement = (Math.random() * 0.7 + 0.3) * data.volatility * data.trendStrength;
        break;
      case 'down':
        movement = -(Math.random() * 0.7 + 0.3) * data.volatility * data.trendStrength;
        break;
      case 'sideways':
        movement = (Math.random() - 0.5) * data.volatility * 0.5;
        break;
    }
    
    // Add cycle factor for more realistic movement
    movement += cycleFactor * data.volatility * 0.3;
    
    // Very conservative movement limits - max 0.20% per second
    movement = Math.max(-0.002, Math.min(0.002, movement));
    
    // Apply movement to prices
    const newPrice = data.basePrice * (1 + movement);
    const newBuyPrice = data.baseBuyPrice ? data.baseBuyPrice * (1 + movement) : undefined;
    const newSellPrice = data.baseSellPrice ? data.baseSellPrice * (1 + movement) : undefined;
    
    // Determine direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(movement) > 0.0001) {
      direction = movement > 0 ? 'up' : 'down';
    }
    
    // Keep the original 24h change from API instead of calculating cumulative change
    // This ensures users see the real 24-hour market performance, not simulation artifacts
    const real24hChange = data.baseChange24h || 0;
    
    return {
      ...data,
      price: Number(newPrice.toFixed(data.type === 'CURRENCY' ? 4 : 2)),
      buyPrice: newBuyPrice ? Number(newBuyPrice.toFixed(data.type === 'CURRENCY' ? 4 : 2)) : undefined,
      sellPrice: newSellPrice ? Number(newSellPrice.toFixed(data.type === 'CURRENCY' ? 4 : 2)) : undefined,
      change24h: Number(real24hChange.toFixed(3)), // Use original 24h change from API
      lastDirection: direction,
      timestamp: new Date().toISOString(),
    };
  }

  private async storePriceSnapshots(data: NormalizedFinancialData[]) {
    try {
      const snapshots = data.map(item => ({
        symbol: item.symbol,
        type: item.type,
        price: item.price,
        priceUSD: item.priceUSD || null,
        change24h: item.change24h || null,
        timestamp: new Date(),
        source: item.source,
      }));

      await this.prismaService.priceSnapshot.createMany({
        data: snapshots,
        skipDuplicates: true,
      });

    } catch (error) {
      this.logger.error('Failed to store dynamic price snapshots:', error);
    }
  }

  // Manual force update
  async forceBaseUpdate() {
    this.logger.log('Force updating base data');
    await this.updateBaseData();
  }

  // Get service statistics
  getStats() {
    return {
      isInitialized: this.isInitialized,
      dynamicDataCount: this.dynamicData.size,
      lastBaseDataUpdate: this.lastBaseDataUpdate,
      updateCounter: this.updateCounter,
      timeSinceLastBase: Date.now() - this.lastBaseDataUpdate,
    };
  }

  // Cleanup old snapshots
  @Cron('0 */10 * * * *') // Every 10 minutes
  async cleanupOldSnapshots() {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const result = await this.prismaService.priceSnapshot.deleteMany({
        where: {
          source: 'dynamic-simulation',
          timestamp: {
            lt: oneHourAgo,
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old dynamic snapshots`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old dynamic snapshots:', error);
    }
  }
}
