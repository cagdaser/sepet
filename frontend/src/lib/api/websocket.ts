'use client';

import { io, Socket } from 'socket.io-client';

export interface WebSocketFinanceData {
  symbol: string;
  type: string;
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  change24h?: number;
  priceUSD?: number;
  timestamp: string;
}

export class FinanceWebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseUrl: string;
  
  // Event callbacks
  private onPriceUpdateCallback?: (data: WebSocketFinanceData[]) => void;
  private onConnectionChangeCallback?: (connected: boolean) => void;
  private onInitialDataCallback?: (data: WebSocketFinanceData[]) => void;
  private onSymbolUpdateCallback?: (data: WebSocketFinanceData) => void;
  private onTypeUpdateCallback?: (type: string, data: WebSocketFinanceData[]) => void;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket?.connected) {
          resolve();
          return;
        }

        this.socket = io(`${this.baseUrl}/finance`, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.onConnectionChangeCallback?.(true);
          
          // Request all data when connected
          this.socket?.emit('get-all-data');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnected = false;
          this.onConnectionChangeCallback?.(false);
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnected = false;
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`));
          }
        });

        // Listen for price updates
        this.socket.on('price-update', (data: WebSocketFinanceData[]) => {
          console.log('Price update received:', data.length, 'items');
          this.onPriceUpdateCallback?.(data);
        });

        // Listen for initial data
        this.socket.on('initial-data', (data: WebSocketFinanceData[]) => {
          console.log('Initial data received:', data.length, 'items');
          this.onInitialDataCallback?.(data);
        });

        // Listen for all data response
        this.socket.on('all-data', (data: WebSocketFinanceData[]) => {
          console.log('All data received:', data.length, 'items');
          this.onInitialDataCallback?.(data);
        });

        // Listen for symbol updates
        this.socket.on('symbol-update', (data: WebSocketFinanceData) => {
          this.onSymbolUpdateCallback?.(data);
        });

        // Listen for type updates
        this.socket.on('type-update', ({ type, data }: { type: string, data: WebSocketFinanceData[] }) => {
          this.onTypeUpdateCallback?.(type, data);
        });

        // Listen for subscription confirmations
        this.socket.on('subscription-confirmed', (data) => {
          console.log('Subscription confirmed:', data);
        });

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  subscribeToSymbols(symbols: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { symbols });
    }
  }

  subscribeToTypes(types: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { types });
    }
  }

  unsubscribeFromSymbols(symbols: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { symbols });
    }
  }

  unsubscribeFromTypes(types: string[]) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { types });
    }
  }

  requestAllData() {
    if (this.socket?.connected) {
      this.socket.emit('get-all-data');
    }
  }

  requestSymbolData(symbol: string) {
    if (this.socket?.connected) {
      this.socket.emit('get-symbol', { symbol });
    }
  }

  // Event listeners
  onPriceUpdate(callback: (data: WebSocketFinanceData[]) => void) {
    this.onPriceUpdateCallback = callback;
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.onConnectionChangeCallback = callback;
  }

  onInitialData(callback: (data: WebSocketFinanceData[]) => void) {
    this.onInitialDataCallback = callback;
  }

  onSymbolUpdate(callback: (data: WebSocketFinanceData) => void) {
    this.onSymbolUpdateCallback = callback;
  }

  onTypeUpdate(callback: (type: string, data: WebSocketFinanceData[]) => void) {
    this.onTypeUpdateCallback = callback;
  }

  // Getters
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Singleton instance
let financeWebSocketService: FinanceWebSocketService | null = null;

export const getFinanceWebSocketService = (): FinanceWebSocketService => {
  if (!financeWebSocketService) {
    financeWebSocketService = new FinanceWebSocketService();
  }
  return financeWebSocketService;
};

export default FinanceWebSocketService;
