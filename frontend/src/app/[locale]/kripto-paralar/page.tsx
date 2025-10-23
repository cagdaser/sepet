'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getAllCryptoData, FinancialData } from '@/lib/api/finance'

interface CurrencyToggleProps {
  currency: 'USD' | 'TRY'
  onToggle: (currency: 'USD' | 'TRY') => void
}

function CurrencyToggle({ currency, onToggle }: CurrencyToggleProps) {
  return (
    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onToggle('USD')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          currency === 'USD'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        USD
      </button>
      <button
        onClick={() => onToggle('TRY')}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          currency === 'TRY'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        TRY
      </button>
    </div>
  )
}

// Format number with K, M, B suffixes
const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '-'
  
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  
  return num.toFixed(2)
}

// Format price with appropriate decimals
const formatPrice = (price: number, currency: 'USD' | 'TRY' = 'USD'): string => {
  if (price === undefined || price === null) return '-'
  
  const symbol = currency === 'TRY' ? '₺' : '$'
  
  if (price >= 1) return `${symbol}${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
  if (price >= 0.01) return `${symbol}${price.toFixed(4)}`
  if (price >= 0.0001) return `${symbol}${price.toFixed(6)}`
  
  return `${symbol}${price.toFixed(8)}`
}

// Format percentage change
const formatPercentage = (change: number): string => {
  if (change === undefined || change === null) return '-'
  const formatted = Math.abs(change).toFixed(2)
  return `${change >= 0 ? '+' : '-'}${formatted}%`
}

// Get coin name from symbol (remove USDT/TRY suffix)
const getCoinName = (symbol: string): string => {
  return symbol.replace(/USDT|TRY$/, '').toLowerCase()
}

// Get trend icon based on percentage change
const getTrendIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
  if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
  return <Minus className="w-4 h-4 text-gray-400" />
}

interface SortConfig {
  key: keyof FinancialData | null
  direction: 'asc' | 'desc'
}

export default function KriptoParalarPage() {
  const [cryptoData, setCryptoData] = useState<FinancialData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'rank', direction: 'asc' })
  const [searchTerm, setSearchTerm] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'TRY'>('USD')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(100)

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('crypto-favorites')
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)))
    }
  }, [])

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    localStorage.setItem('crypto-favorites', JSON.stringify(Array.from(newFavorites)))
  }

  // Toggle favorite
  const toggleFavorite = (symbol: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol)
    } else {
      newFavorites.add(symbol)
    }
    setFavorites(newFavorites)
    saveFavorites(newFavorites)
  }

  // Fetch crypto data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await getAllCryptoData()
        if (response.success) {
          // Filter based on selected currency
          const suffix = currency === 'USD' ? 'USDT' : 'TRY'
          const filteredData = response.data
            .filter(item => item.symbol.endsWith(suffix))
            .map((item, index) => ({
              ...item,
              rank: item.rank || (index + 1) // Use CoinMarketCap rank or fallback to index
            }))
          setCryptoData(filteredData)
        }
        setLoading(false)
      } catch (err) {
        console.error('Error fetching crypto data:', err)
        setError('Veri yüklenirken hata oluştu')
        setLoading(false)
      }
    }

    fetchData()
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [currency])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return cryptoData

    return [...cryptoData].sort((a, b) => {
      const aVal = a[sortConfig.key!]
      const bVal = b[sortConfig.key!]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      const multiplier = sortConfig.direction === 'asc' ? 1 : -1
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * multiplier
      }
      
      return String(aVal).localeCompare(String(bVal)) * multiplier
    })
  }, [cryptoData, sortConfig])

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return sortedData
    
    return sortedData.filter(item => 
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCoinName(item.symbol).includes(searchTerm.toLowerCase())
    )
  }, [sortedData, searchTerm])

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, currency])

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  // Handle sort
  const handleSort = (key: keyof FinancialData) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Get sort indicator
  const getSortIndicator = (key: keyof FinancialData) => {
    if (sortConfig.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kripto Para Piyasaları</h1>
          <p className="text-gray-600">
            Binance üzerinde işlem gören {cryptoData.length} kripto paranın canlı fiyatları
          </p>
        </div>

        {/* Search and Currency Toggle */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <input
              type="text"
              placeholder="Kripto para ara... (örn: BTC, ETH)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <CurrencyToggle currency={currency} onToggle={setCurrency} />
          </div>
          
          {/* Pagination Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-gray-600">
            <div>
              Gösterilen: {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredData.length)} / {filteredData.length} kripto para
            </div>
            <div>
              Sayfa {currentPage} / {totalPages}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Favori
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('rank')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      # {getSortIndicator('rank')}
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('symbol')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coin {getSortIndicator('symbol')}
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fiyat {getSortIndicator('price')}
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('change24h')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24sa {getSortIndicator('change24h')}
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('marketCap')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Piyasa Değeri {getSortIndicator('marketCap')}
                    </span>
                  </th>
                  <th 
                    className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('volume24h')}
                  >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      24 Saatlik Hacim {getSortIndicator('volume24h')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((crypto) => (
                  <tr 
                    key={crypto.symbol} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* Favorite */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleFavorite(crypto.symbol)}
                        className="text-gray-400 hover:text-yellow-500 transition-colors"
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            favorites.has(crypto.symbol) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : ''
                          }`} 
                        />
                      </button>
                    </td>

                    {/* Rank */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {crypto.rank || '-'}
                      </span>
                    </td>

                    {/* Coin Name & Symbol */}
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {getCoinName(crypto.symbol).slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {getCoinName(crypto.symbol)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {crypto.symbol.replace('USDT', '')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(crypto.price, currency)}
                      </span>
                    </td>

                    {/* 24h Change */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end">
                        {getTrendIcon(crypto.change24h || 0)}
                        <span 
                          className={`ml-1 text-sm font-medium ${
                            (crypto.change24h || 0) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}
                        >
                          {formatPercentage(crypto.change24h || 0)}
                        </span>
                      </div>
                    </td>

                    {/* Market Cap */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-gray-900">
                        {crypto.marketCapFormatted || formatNumber(crypto.marketCap || 0)}
                      </span>
                    </td>

                    {/* Volume 24h */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm text-gray-900">
                        {crypto.volume24hFormatted || formatNumber(crypto.volume24h || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Önceki
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              {currentPage > 3 && (
                <>
                  <button
                    onClick={() => setCurrentPage(1)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    1
                  </button>
                  {currentPage > 4 && <span className="text-gray-500">...</span>}
                </>
              )}

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-2 border rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && <span className="text-gray-500">...</span>}
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sonraki →
            </button>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Toplam {filteredData.length} kripto para • Sayfa başına {itemsPerPage} öğe • 
            Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
          </p>
          <p className="mt-1">
            Veriler Binance&apos;ten canlı olarak alınmaktadır • 30 saniyede bir güncellenir
          </p>
        </div>
      </div>
    </div>
  )
}
