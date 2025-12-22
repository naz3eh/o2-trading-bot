import { Market } from './market'

export type StrategyType = 'marketMaking' | 'balanceThreshold'

export interface StrategyConfig {
  type: StrategyType
  marketId: string
  // Market Making Strategy
  spreadPercent?: number // Spread percentage (e.g., 1 for 1%) - deprecated, use buyPriceAdjustmentPercent/sellPriceAdjustmentPercent
  orderSizeUsd?: number // Order size in USD
  rebalanceThreshold?: number // Rebalance when inventory exceeds this
  buyPriceAdjustmentPercent?: number // Percentage above market for buy orders (default: 0.1) - aggressive pricing for quick fills
  sellPriceAdjustmentPercent?: number // Percentage below market for sell orders (default: 0.1) - aggressive pricing for quick fills
  // Balance Threshold Strategy
  baseThreshold?: number // Trigger when base balance exceeds this
  quoteThreshold?: number // Trigger when quote balance exceeds this
  // Common
  cycleIntervalMinMs?: number
  cycleIntervalMaxMs?: number
  maxPriceImpact?: number
}

export interface StrategyConfigStore {
  id: string
  marketId: string
  strategyType: StrategyType
  config: StrategyConfig
  isActive: boolean
  createdAt: number
}

export interface OrderExecution {
  orderId: string
  side: 'Buy' | 'Sell'
  success: boolean
  price?: string
  quantity?: string
  filledQuantity?: string
  error?: string
}

export interface StrategyExecutionResult {
  executed: boolean
  orders: OrderExecution[]
  nextRunAt?: number
}

export interface BaseStrategy {
  execute(market: Market, config: StrategyConfig, ownerAddress: string, tradingAccountId: string): Promise<StrategyExecutionResult>
  getName(): string
  getDescription(): string
}

