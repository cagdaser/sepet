import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TruncgilService } from './truncgil.service';
import { CacheService } from './cache.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { FinanceGateway } from '../gateways/finance.gateway';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly truncgilService: TruncgilService,
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly financeGateway: FinanceGateway,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds
  async updatePriceData() {
    try {
      this.logger.log('Starting scheduled price update');
      
      // Fetch fresh data from Truncgil API
      const rawData = await this.truncgilService.fetchAllData();
      const normalizedData = this.truncgilService.normalizeData(rawData);
      
      if (normalizedData.length === 0) {
        this.logger.warn('No data received from API');
        return;
      }

      // Update cache
      await this.cacheService.setFinancialData(normalizedData);
      
      // Store snapshots in database
      await this.storePriceSnapshots(normalizedData);
      
      // Broadcast updates via WebSocket
      this.financeGateway.broadcastPriceUpdate(normalizedData);
      
      this.logger.log(`Updated ${normalizedData.length} symbols`);
    } catch (error) {
      this.logger.error('Failed to update price data:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldPriceSnapshots() {
    try {
      // Keep only last 7 days of price snapshots
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.prismaService.priceSnapshot.deleteMany({
        where: {
          timestamp: {
            lt: sevenDaysAgo,
          },
        },
      });

      this.logger.log(`Cleaned up ${result.count} old price snapshots`);
    } catch (error) {
      this.logger.error('Failed to cleanup old price snapshots:', error);
    }
  }

  private async storePriceSnapshots(data: any[]) {
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

      // Store in database
      await this.prismaService.priceSnapshot.createMany({
        data: snapshots,
        skipDuplicates: true,
      });

    } catch (error) {
      this.logger.error('Failed to store price snapshots:', error);
    }
  }

  // Manual trigger for testing
  async forceUpdate() {
    this.logger.log('Force updating price data');
    await this.updatePriceData();
  }
}
