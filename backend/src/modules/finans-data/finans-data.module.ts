import { Module } from '@nestjs/common';
import { TruncgilService } from './services/truncgil.service';
import { CacheService } from './services/cache.service';
import { DynamicDataService } from './services/dynamic-data.service';
import { FinanceGateway } from './gateways/finance.gateway';
import { FinansDataController } from './finans-data.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinansDataController],
  providers: [
    TruncgilService,
    CacheService,
    DynamicDataService,
    FinanceGateway,
  ],
  exports: [
    TruncgilService,
    CacheService,
    DynamicDataService,
  ],
})
export class FinansDataModule {}
