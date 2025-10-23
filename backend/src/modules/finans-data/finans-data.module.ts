import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TruncgilService } from './services/truncgil.service';
import { BinanceService } from './services/binance.service';
import { CoinMarketCapService } from './services/coinmarketcap.service';
import { CacheService } from './services/cache.service';
import { DynamicDataService } from './services/dynamic-data.service';
import { FinanceGateway } from './gateways/finance.gateway';
import { FinansDataController } from './finans-data.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [FinansDataController],
  providers: [
    TruncgilService,
    BinanceService,
    CoinMarketCapService,
    CacheService,
    DynamicDataService,
    FinanceGateway,
  ],
  exports: [
    TruncgilService,
    BinanceService,
    CoinMarketCapService,
    CacheService,
    DynamicDataService,
  ],
})
export class FinansDataModule {}
