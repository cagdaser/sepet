import { Module } from '@nestjs/common';
import { TruncgilService } from './services/truncgil.service';
import { CacheService } from './services/cache.service';
import { SchedulerService } from './services/scheduler.service';
import { FinanceGateway } from './gateways/finance.gateway';
import { FinansDataController } from './finans-data.controller';

@Module({
  controllers: [FinansDataController],
  providers: [
    TruncgilService,
    CacheService,
    SchedulerService,
    FinanceGateway,
  ],
  exports: [
    TruncgilService,
    CacheService,
  ],
})
export class FinansDataModule {}
