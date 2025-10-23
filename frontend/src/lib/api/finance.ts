// Finance API functions for fetching data from backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FinancialData {
  id?: string;
  symbol: string;
  type: 'CRYPTO' | 'CURRENCY' | 'GOLD' | 'INDEX';
  price: number;
  priceUSD?: number;
  change24h?: number;
  buyPrice?: number;
  sellPrice?: number;
  timestamp: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
  // Enhanced fields with CoinMarketCap data
  rank?: number;
  marketCap?: number;
  marketCapFormatted?: string;
  volume24h?: number;
  volume24hFormatted?: string;
  volumeChange24h?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  count?: number;
  error?: string;
  message?: string;
}

/**
 * Fetch all financial data
 */
export async function getAllFinancialData(): Promise<ApiResponse<FinancialData[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching all financial data:', error);
    throw error;
  }
}

/**
 * Fetch financial data by asset type
 */
export async function getFinancialDataByType(type: 'CRYPTO' | 'CURRENCY' | 'GOLD' | 'INDEX'): Promise<ApiResponse<FinancialData[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/type/${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching financial data for type ${type}:`, error);
    throw error;
  }
}

/**
 * Fetch data for a specific symbol
 */
export async function getSymbolData(symbol: string): Promise<ApiResponse<FinancialData>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/symbol/${symbol}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching data for symbol ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get historical data for a symbol
 */
export async function getHistoricalData(symbol: string, days: number = 1): Promise<ApiResponse<any[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/history/${symbol}?days=${days}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Force refresh financial data
 */
export async function refreshFinancialData(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing financial data:', error);
    throw error;
  }
}

/**
 * Get service statistics
 */
export async function getFinancialStats(): Promise<ApiResponse<any>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    throw error;
  }
}

/**
 * Get ranked crypto data (sorted by market cap)
 */
export async function getRankedCryptoData(limit: number = 25): Promise<ApiResponse<FinancialData[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/crypto/ranked?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching ranked crypto data:', error);
    throw error;
  }
}

/**
 * Get all crypto data from Binance
 */
export async function getAllCryptoData(): Promise<ApiResponse<FinancialData[]>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/finance/crypto`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    throw error;
  }
}
