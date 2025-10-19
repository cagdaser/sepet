import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { NormalizedFinancialData } from '../services/truncgil.service';
import { CacheService } from '../services/cache.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/finance',
})
export class FinanceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FinanceGateway.name);
  private connectedClients = new Map<string, Socket>();
  private subscriptions = new Map<string, Set<string>>(); // clientId -> Set of symbols

  constructor(private readonly cacheService: CacheService) {}

  afterInit(server: Server) {
    this.logger.log('Finance WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
    this.subscriptions.set(client.id, new Set());

    // Send initial data to new client
    this.sendInitialData(client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
    this.subscriptions.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  async handleSubscription(
    @MessageBody() data: { symbols?: string[], types?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const clientSubscriptions = this.subscriptions.get(client.id) || new Set();

    // Subscribe to specific symbols
    if (data.symbols) {
      for (const symbol of data.symbols) {
        clientSubscriptions.add(`symbol:${symbol}`);
        
        // Send current data for subscribed symbol
        const symbolData = await this.cacheService.getSymbolData(symbol);
        if (symbolData) {
          client.emit('symbol-update', symbolData);
        }
      }
    }

    // Subscribe to asset types
    if (data.types) {
      for (const type of data.types) {
        clientSubscriptions.add(`type:${type}`);
        
        // Send current data for subscribed type
        const typeData = await this.cacheService.getDataByType(type);
        if (typeData) {
          client.emit('type-update', { type, data: typeData });
        }
      }
    }

    this.subscriptions.set(client.id, clientSubscriptions);
    client.emit('subscription-confirmed', { symbols: data.symbols, types: data.types });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscription(
    @MessageBody() data: { symbols?: string[], types?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const clientSubscriptions = this.subscriptions.get(client.id);
    if (!clientSubscriptions) return;

    if (data.symbols) {
      for (const symbol of data.symbols) {
        clientSubscriptions.delete(`symbol:${symbol}`);
      }
    }

    if (data.types) {
      for (const type of data.types) {
        clientSubscriptions.delete(`type:${type}`);
      }
    }

    client.emit('unsubscription-confirmed', { symbols: data.symbols, types: data.types });
  }

  @SubscribeMessage('get-all-data')
  async handleGetAllData(@ConnectedSocket() client: Socket) {
    const allData = await this.cacheService.getFinancialData();
    client.emit('all-data', allData || []);
  }

  @SubscribeMessage('get-symbol')
  async handleGetSymbol(
    @MessageBody() data: { symbol: string },
    @ConnectedSocket() client: Socket,
  ) {
    const symbolData = await this.cacheService.getSymbolData(data.symbol);
    client.emit('symbol-data', { symbol: data.symbol, data: symbolData });
  }

  // Method called by scheduler to broadcast updates
  broadcastPriceUpdate(data: NormalizedFinancialData[]) {
    // Broadcast to all clients subscribed to all data
    this.server.emit('price-update', data);

    // Send specific updates to subscribed clients
    for (const [clientId, subscriptions] of this.subscriptions.entries()) {
      const client = this.connectedClients.get(clientId);
      if (!client) continue;

      for (const subscription of subscriptions) {
        if (subscription.startsWith('symbol:')) {
          const symbol = subscription.replace('symbol:', '');
          const symbolData = data.find(item => item.symbol === symbol);
          if (symbolData) {
            client.emit('symbol-update', symbolData);
          }
        } else if (subscription.startsWith('type:')) {
          const type = subscription.replace('type:', '');
          const typeData = data.filter(item => item.type === type);
          if (typeData.length > 0) {
            client.emit('type-update', { type, data: typeData });
          }
        }
      }
    }
  }

  // Send initial data when client connects
  private async sendInitialData(client: Socket) {
    try {
      const allData = await this.cacheService.getFinancialData();
      if (allData && allData.length > 0) {
        client.emit('initial-data', allData);
      }
    } catch (error) {
      this.logger.error('Failed to send initial data to client:', error);
    }
  }

  // Utility methods for broadcasting specific events
  broadcastSymbolUpdate(symbolData: NormalizedFinancialData) {
    this.server.emit('symbol-update', symbolData);
  }

  broadcastTypeUpdate(type: string, data: NormalizedFinancialData[]) {
    this.server.emit('type-update', { type, data });
  }

  // Get connection stats
  getConnectionStats() {
    return {
      connectedClients: this.connectedClients.size,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((total, subs) => total + subs.size, 0),
    };
  }
}
