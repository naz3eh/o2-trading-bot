export interface TradingSessionTrade {
  orderId: string
  side: 'Buy' | 'Sell'
  price: string // human readable
  quantity: string // human readable
  value: number // USD value
  fee: number // USD fee (0.01% of value)
  timestamp: number
  marketPair: string
  weightedAvgBuyPrice?: string // For sell orders, the weighted avg buy price used for PnL calc
  matchedQuantity?: string // For sell orders, quantity matched against buys for PnL calc
  pnlContribution?: number // P&L contribution from this trade (for debugging)
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

  // Unsold inventory tracking (for accurate P&L calculation)
  // These track only the cost basis of inventory that hasn't been sold yet
  unsoldCostBasis: number    // Total USD cost of unsold inventory
  unsoldQuantity: string     // Quantity of unsold inventory (human-readable)

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
