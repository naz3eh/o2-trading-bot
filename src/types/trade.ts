export interface Trade {
  id?: number
  timestamp: number
  marketId: string
  orderId: string
  sessionId?: string
  side: 'Buy' | 'Sell'
  price: string
  quantity: string
  valueUsd?: number
  feeUsd?: number
  baseBalance?: string
  quoteBalance?: string
  success: boolean
  error?: string
}

export interface TradeExecution {
  trade: Trade
  orderId: string
  marketId: string
}

