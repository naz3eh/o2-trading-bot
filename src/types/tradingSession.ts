export interface TradingSessionTrade {
  orderId: string
  side: 'Buy' | 'Sell'
  price: string // human readable
  quantity: string // human readable
  value: number // USD value
  fee: number // USD fee (0.01% of value)
  timestamp: number
  marketPair: string
}

export interface TradingSession {
  id: string
  ownerAddress: string
  marketId: string
  marketPair: string
  status: 'active' | 'paused' | 'ended'

  // Metrics
  totalVolume: number // USD
  totalFees: number // USD
  realizedPnL: number // USD
  tradeCount: number
  buyCount: number
  sellCount: number

  // For PnL calculation
  averageBuyPrice: string
  totalBoughtQuantity: string
  totalSoldQuantity: string
  totalBuyValue: number
  totalSellValue: number

  // Trade history within session
  trades: TradingSessionTrade[]

  // Console messages
  consoleMessages: Array<{
    message: string
    type: string
    timestamp: number
  }>

  // Context snapshot
  lastContext: {
    pair: string
    currentPrice: string
    baseBalance: string
    quoteBalance: string
    lastBuyPrice?: string
  } | null

  // Starting balance snapshot (captured when session starts)
  startingBaseBalance?: string   // e.g., "0.5" (human readable)
  startingQuoteBalance?: string  // e.g., "100.00" (human readable)

  // Strategy info
  strategyName?: string  // e.g., "Simple Mode", "Volume Maximizing"

  createdAt: number
  updatedAt: number
  endedAt?: number
}

export const FEE_RATE = 0.0001 // 0.01%
