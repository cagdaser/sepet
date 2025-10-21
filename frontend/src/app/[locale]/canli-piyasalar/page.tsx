'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllFinancialData, type FinancialData } from '@/lib/api/finance';
import { getFinanceWebSocketService, WebSocketFinanceData } from '@/lib/api/websocket';

interface GroupedFinancialData {
  gold: FinancialData[];
  currency: FinancialData[];
  crypto: FinancialData[];
  index: FinancialData[];
}

// Format number with Turkish locale
const formatPrice = (price: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
};

// Format percentage change
const formatPercentage = (change: number): string => {
  const formatted = Math.abs(change).toFixed(2);
  return change >= 0 ? `%${formatted}` : `%${formatted}`;
};

// Get arrow icon based on change
const getArrowIcon = (change: number): string => {
  return change >= 0 ? '↗' : '↘';
};

// Get change color class
const getChangeColorClass = (change: number): string => {
  return change >= 0 ? 'text-green-500' : 'text-red-500';
};

export default function CanliPiyasalarPage() {
  const [data, setData] = useState<GroupedFinancialData>({
    gold: [],
    currency: [],
    crypto: [],
    index: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsServiceRef = useRef<ReturnType<typeof getFinanceWebSocketService> | null>(null);

  // Helper function to convert WebSocketFinanceData to FinancialData
  const convertWebSocketData = useCallback((wsData: WebSocketFinanceData[]): FinancialData[] => {
    return wsData.map((item) => ({
      id: `ws-${item.symbol}-${Date.now()}`,
      symbol: item.symbol,
      type: item.type as 'GOLD' | 'CURRENCY' | 'CRYPTO' | 'INDEX',
      price: item.price,
      buyPrice: item.buyPrice,
      sellPrice: item.sellPrice,
      change24h: item.change24h,
      priceUSD: item.priceUSD,
      timestamp: item.timestamp,
      source: 'websocket',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  // Helper function to group data by type
  const groupDataByType = useCallback((items: FinancialData[]): GroupedFinancialData => {
    const grouped: GroupedFinancialData = {
      gold: [],
      currency: [],
      crypto: [],
      index: []
    };

    items.forEach((item) => {
      switch (item.type) {
        case 'GOLD':
          grouped.gold.push(item);
          break;
        case 'CURRENCY':
          grouped.currency.push(item);
          break;
        case 'CRYPTO':
          grouped.crypto.push(item);
          break;
        case 'INDEX':
          grouped.index.push(item);
          break;
      }
    });

    return grouped;
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        wsServiceRef.current = getFinanceWebSocketService();
        
        // Set up event listeners
        wsServiceRef.current.onConnectionChange((connected) => {
          setIsConnected(connected);
          if (connected) {
            setConnectionError(null);
            console.log('WebSocket connected successfully');
          } else {
            console.log('WebSocket disconnected');
          }
        });

        wsServiceRef.current.onInitialData((wsData) => {
          console.log('Received initial data via WebSocket:', wsData.length, 'items');
          const convertedData = convertWebSocketData(wsData);
          const groupedData = groupDataByType(convertedData);
          setData(groupedData);
          setLastUpdate(new Date().toISOString());
          setLoading(false);
          setError(null);
        });

        wsServiceRef.current.onPriceUpdate((wsData) => {
          console.log('Received price update via WebSocket:', wsData.length, 'items');
          const convertedData = convertWebSocketData(wsData);
          const groupedData = groupDataByType(convertedData);
          setData(groupedData);
          setLastUpdate(new Date().toISOString());
        });

        // Connect to WebSocket
        await wsServiceRef.current.connect();
        
      } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
        setConnectionError(err instanceof Error ? err.message : 'WebSocket bağlantı hatası');
        setIsConnected(false);
        
        // Fall back to HTTP API if WebSocket fails
        fetchDataHttp();
      }
    };

    initWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
        wsServiceRef.current = null;
      }
    };
  }, [convertWebSocketData, groupDataByType]);

  // HTTP fallback function
  const fetchDataHttp = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllFinancialData();
      
      if (response.success && response.data) {
        const groupedData = groupDataByType(response.data);
        setData(groupedData);
        setLastUpdate(response.timestamp);
        setError(null);
      } else {
        throw new Error(response.message || 'Veri alınamadı');
      }
    } catch (err) {
      console.error('Error fetching financial data via HTTP:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [groupDataByType]);

  // Fallback HTTP polling if WebSocket is not connected
  useEffect(() => {
    if (!isConnected && !connectionError) {
      // Start HTTP polling as fallback after 5 seconds
      const fallbackTimer = setTimeout(() => {
        if (!isConnected) {
          console.log('Starting HTTP fallback polling');
          fetchDataHttp();
          
          const interval = setInterval(() => {
            if (!isConnected) {
              fetchDataHttp();
            }
          }, 30000);
          
          return () => clearInterval(interval);
        }
      }, 5000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [isConnected, connectionError, fetchDataHttp]);

  if (loading && data.gold.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Piyasa verileri yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-red-600">
            <p className="text-lg mb-4">Hata: {error}</p>
            <button 
              onClick={fetchDataHttp}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create ticker data from all types
  const tickerData = [
    ...data.currency.slice(0, 3),
    ...data.gold.slice(0, 2),
    ...data.crypto.slice(0, 2)
  ];

  return (
    <div className="bg-black text-white min-h-screen">
      {/* Connection Status Banner */}
      <div className={`px-4 py-2 text-sm ${
        isConnected 
          ? 'bg-green-900/50 text-green-400 border-b border-green-700' 
          : connectionError 
            ? 'bg-red-900/50 text-red-400 border-b border-red-700'
            : 'bg-yellow-900/50 text-yellow-400 border-b border-yellow-700'
      }`}>
        <div className="container mx-auto flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected 
              ? 'bg-green-400 animate-pulse' 
              : connectionError 
                ? 'bg-red-400'
                : 'bg-yellow-400 animate-pulse'
          }`}></div>
          <span>
            {isConnected 
              ? '🔴 CANLI: Veriler gerçek zamanlı güncelleniyor (Her 30 saniye)' 
              : connectionError 
                ? `Bağlantı hatası: ${connectionError} - HTTP API kullanılıyor`
                : 'Bağlanıyor... Gerçek zamanlı veri bekleniyor'}
          </span>
        </div>
      </div>

      {/* Top Ticker */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center space-x-8 overflow-x-auto scrollbar-thin">
            {tickerData.map((item, index) => (
              <div key={`${item.symbol}-${index}`} className="flex items-center space-x-2 whitespace-nowrap">
                <span className="text-gray-400">{item.symbol}</span>
                <span className="text-white font-medium">
                  {formatPrice(item.price, item.type === 'CURRENCY' ? 3 : 2)}
                </span>
                <span className={`flex items-center ${getChangeColorClass(item.change24h || 0)}`}>
                  <span className="mr-1">{getArrowIcon(item.change24h || 0)}</span>
                  {formatPercentage(item.change24h || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gold Prices */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Altın Fiyatları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-4 gap-4 py-2 border-b border-gray-600 text-gray-400 text-sm">
                  <div></div>
                  <div className="text-center">Alış</div>
                  <div className="text-center">Satış</div>
                  <div></div>
                </div>
                
                {/* Gold Data Rows */}
                {data.gold.slice(0, 6).map((item) => (
                  <div key={item.symbol} className="grid grid-cols-4 gap-4 py-3 border-b border-gray-800">
                    <div className="text-white font-medium">
                      {item.symbol}
                    </div>
                    <div className="text-center">
                      <span className={`${getChangeColorClass(item.change24h || 0)}`}>
                        {getArrowIcon(item.change24h || 0)} {formatPrice(item.buyPrice || item.price)}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`${getChangeColorClass(item.change24h || 0)}`}>
                        {getArrowIcon(item.change24h || 0)} {formatPrice(item.sellPrice || item.price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${getChangeColorClass(item.change24h || 0)}`}>
                        {formatPercentage(item.change24h || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exchange Rates */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">Sarrafiye Fiyatları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-4 gap-4 py-2 border-b border-gray-600 text-gray-400 text-sm">
                  <div></div>
                  <div className="text-center">Alış</div>
                  <div className="text-center">Satış</div>
                  <div></div>
                </div>
                
                {/* Currency Data Rows */}
                {[...data.currency, ...data.gold].filter(item => 
                  ['YENİ ÇEYREK', 'ESKİ ÇEYREK', 'YENİ YARIM', 'ESKİ YARIM', 'YENİ TAM'].includes(item.symbol) ||
                  ['USD', 'EUR', 'GBP'].includes(item.symbol)
                ).slice(0, 6).map((item) => (
                  <div key={item.symbol} className="grid grid-cols-4 gap-4 py-3 border-b border-gray-800">
                    <div className="text-white font-medium">
                      {item.symbol.includes('ÇEYREK') || item.symbol.includes('YARIM') || item.symbol.includes('TAM') 
                        ? item.symbol 
                        : `${item.symbol} KURU`
                      }
                    </div>
                    <div className="text-center">
                      <span className={`${getChangeColorClass(item.change24h || 0)}`}>
                        {getArrowIcon(item.change24h || 0)} {formatPrice(item.buyPrice || item.price)}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className={`${getChangeColorClass(item.change24h || 0)}`}>
                        {getArrowIcon(item.change24h || 0)} {formatPrice(item.sellPrice || item.price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${getChangeColorClass(item.change24h || 0)}`}>
                        {formatPercentage(item.change24h || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last Update Info */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          Son güncelleme: {new Date(lastUpdate).toLocaleString('tr-TR')}
        </div>
      </div>
    </div>
  );
}
