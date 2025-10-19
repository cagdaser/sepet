import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FinansDataModule } from './modules/finans-data/finans-data.module';
import { auth } from './auth';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Schedule module for cron jobs (price updates)
    ScheduleModule.forRoot(),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    
    // Better Auth integration
    AuthModule.forRoot({ auth }),
    
    // Database module (global)
    PrismaModule,
    
    // Financial data module
    FinansDataModule,
    
    // TODO: Add modules when created
    // PortfolioModule,
    // NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
