import { Controller, Get, Query, Param, Post, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { TruncgilService } from './services/truncgil.service';
import { BinanceService } from './services/binance.service';
import { CacheService } from './services/cache.service';
import { DynamicDataService } from './services/dynamic-data.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceGateway } from './gateways/finance.gateway';

@ApiTags('Financial Data')
@Controller('api/finance')
@AllowAnonymous() // Allow anonymous access to financial data
export class FinansDataController {
  constructor(
    private readonly truncgilService: TruncgilService,
    private readonly binanceService: BinanceService,
    private readonly cacheService: CacheService,
    private readonly dynamicDataService: DynamicDataService,
    private readonly prismaService: PrismaService,
    private readonly financeGateway: FinanceGateway,
  ) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all financial data' })
  @ApiResponse({ status: 200, description: 'Returns all current financial data' })
  async getAllData() {
    try {
      // Try to get from cache first
      let data = await this.cacheService.getFinancialData();
      
      if (!data || data.length === 0) {
        // If no cache, fetch from API
        const rawData = await this.truncgilService.fetchAllData();
        data = this.truncgilService.normalizeData(rawData);
        
        // Cache the fresh data
        await this.cacheService.setFinancialData(data);
      }
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
        count: data.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch financial data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('symbol/:symbol')
  @ApiOperation({ summary: 'Get data for a specific symbol' })
  @ApiParam({ name: 'symbol', description: 'Financial symbol (e.g., BTC, USD, GRA)' })
  @ApiResponse({ status: 200, description: 'Returns data for the specified symbol' })
  @ApiResponse({ status: 404, description: 'Symbol not found' })
  async getSymbolData(@Param('symbol') symbol: string) {
    try {
      // Try cache first
      let data = await this.cacheService.getSymbolData(symbol.toUpperCase());
      
      if (!data) {
        // If not in cache, fetch from API
        data = await this.truncgilService.getSymbolData(symbol.toUpperCase());
        
        if (!data) {
          throw new HttpException(
            {
              success: false,
              message: `Symbol ${symbol} not found`,
            },
            HttpStatus.NOT_FOUND,
          );
        }
      }
      
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch data for symbol ${symbol}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get data by asset type' })
  @ApiParam({ 
    name: 'type', 
    description: 'Asset type',
    enum: ['CRYPTO', 'GOLD', 'CURRENCY', 'INDEX']
  })
  @ApiResponse({ status: 200, description: 'Returns data for the specified asset type' })
  async getDataByType(@Param('type') type: string) {
    try {
      const assetType = type.toUpperCase() as 'CRYPTO' | 'GOLD' | 'CURRENCY' | 'INDEX';
      
      if (!['CRYPTO', 'GOLD', 'CURRENCY', 'INDEX'].includes(assetType)) {
        throw new HttpException(
          {
            success: false,
            message: 'Invalid asset type. Must be one of: CRYPTO, GOLD, CURRENCY, INDEX',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Try cache first
      let data = await this.cacheService.getDataByType(assetType);
      
      if (!data || data.length === 0) {
        // If not in cache, fetch from API
        data = await this.truncgilService.getSymbolsByType(assetType);
      }
      
      return {
        success: true,
        data,
        type: assetType,
        timestamp: new Date().toISOString(),
        count: data.length,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch data for type ${type}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history/:symbol')
  @ApiOperation({ summary: 'Get historical price data for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Financial symbol' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back (default: 1)' })
  @ApiResponse({ status: 200, description: 'Returns historical price data' })
  async getHistoricalData(
    @Param('symbol') symbol: string,
    @Query('days') days?: string,
  ) {
    try {
      const daysBack = parseInt(days || '1', 10);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const historicalData = await this.prismaService.priceSnapshot.findMany({
        where: {
          symbol: symbol.toUpperCase(),
          timestamp: {
            gte: startDate,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      return {
        success: true,
        data: historicalData,
        symbol: symbol.toUpperCase(),
        period: `${daysBack} days`,
        count: historicalData.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch historical data for ${symbol}`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Force refresh financial data' })
  @ApiResponse({ status: 200, description: 'Data refresh triggered successfully' })
  async forceRefresh() {
    try {
      await this.dynamicDataService.forceBaseUpdate();
      
      return {
        success: true,
        message: 'Dynamic data refresh triggered successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to refresh data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('crypto')
  @ApiOperation({ summary: 'Get all crypto data from Binance' })
  @ApiResponse({ status: 200, description: 'Returns all crypto currency data from Binance' })
  async getAllCryptoData() {
    try {
      const data = await this.binanceService.getCryptoData();
      
      return {
        success: true,
        data,
        source: 'binance',
        timestamp: new Date().toISOString(),
        count: data.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch crypto data from Binance',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('crypto/usdt')
  @ApiOperation({ summary: 'Get USDT pairs from Binance' })
  @ApiResponse({ status: 200, description: 'Returns USDT trading pairs from Binance' })
  async getUSDTPairs() {
    try {
      const data = await this.binanceService.getUSDTPairs();
      
      return {
        success: true,
        data,
        source: 'binance',
        pair: 'USDT',
        timestamp: new Date().toISOString(),
        count: data.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch USDT pairs from Binance',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('crypto/try')
  @ApiOperation({ summary: 'Get TRY pairs from Binance' })
  @ApiResponse({ status: 200, description: 'Returns TRY trading pairs from Binance' })
  async getTRYPairs() {
    try {
      const data = await this.binanceService.getTRYPairs();
      
      return {
        success: true,
        data,
        source: 'binance',
        pair: 'TRY',
        timestamp: new Date().toISOString(),
        count: data.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch TRY pairs from Binance',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('crypto/:symbol')
  @ApiOperation({ summary: 'Get specific crypto symbol from Binance' })
  @ApiParam({ name: 'symbol', description: 'Crypto symbol (e.g., BTCUSDT, ETHUSDT, BTCTRY)' })
  @ApiResponse({ status: 200, description: 'Returns data for the specified crypto symbol' })
  @ApiResponse({ status: 404, description: 'Crypto symbol not found' })
  async getCryptoSymbol(@Param('symbol') symbol: string) {
    try {
      const data = await this.binanceService.getSymbolData(symbol.toUpperCase());
      
      if (!data) {
        throw new HttpException(
          {
            success: false,
            message: `Crypto symbol ${symbol} not found on Binance`,
          },
          HttpStatus.NOT_FOUND,
        );
      }
      
      return {
        success: true,
        data,
        source: 'binance',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: `Failed to fetch crypto symbol ${symbol} from Binance`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get service statistics' })
  @ApiResponse({ status: 200, description: 'Returns service statistics' })
  async getStats() {
    try {
      const cachedData = await this.cacheService.getFinancialData();
      const connectionStats = this.financeGateway.getConnectionStats();
      
      // Get latest snapshot timestamp
      const latestSnapshot = await this.prismaService.priceSnapshot.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      });

      // Get Binance service statistics
      const binanceStats = {
        webSocketConnected: this.binanceService.getWebSocketStatus(),
        cachedSymbols: this.binanceService.getCachedSymbolsCount(),
        loadedSymbols: this.binanceService.getLoadedSymbolsCount(),
      };

      return {
        success: true,
        stats: {
          truncgil: {
            cachedSymbols: cachedData?.length || 0,
          },
          binance: binanceStats,
          lastUpdate: latestSnapshot?.timestamp || null,
          websocket: connectionStats,
          uptime: process.uptime(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
