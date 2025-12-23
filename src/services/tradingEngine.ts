import { Market } from '../types/market'
import { StrategyConfig, StrategyExecutionResult } from '../types/strategy'
import { unifiedStrategyExecutor } from './unifiedStrategyExecutor'
import { marketService } from './marketService'
import { orderService } from './orderService'
import { tradeHistoryService } from './tradeHistoryService'
import { orderFulfillmentService } from './orderFulfillmentService'
import { orderFulfillmentPolling } from './orderFulfillmentPolling'
import { db } from './dbService'
import { Trade } from '../types/trade'

type TradeCallback = () => void
type StatusCallback = (message: string, type: 'info' | 'success' | 'error' | 'warning') => void

interface MarketConfig {
  market: Market
  config: StrategyConfig
  nextRunAt: number
  intervalId?: number
}

class TradingEngine {
  private isRunning: boolean = false
  private marketConfigs: Map<string, MarketConfig> = new Map()
  private sessionTradeCycles: number = 0
  private ownerAddress: string | null = null
  private tradingAccountId: string | null = null
  private onTradeCompleteCallbacks: TradeCallback[] = []
  private onStatusCallbacks: StatusCallback[] = []
  private transactionLock: boolean = false

  private emitStatus(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
    this.onStatusCallbacks.forEach((callback) => {
      try {
        callback(message, type)
      } catch (error) {
        console.error('Error in status callback:', error)
      }
    })
  }

  getNextRunTime(): number | null {
    let earliest: number | null = null
    for (const marketConfig of this.marketConfigs.values()) {
      if (marketConfig.nextRunAt && (!earliest || marketConfig.nextRunAt < earliest)) {
        earliest = marketConfig.nextRunAt
      }
    }
    return earliest
  }

  initialize(ownerAddress: string, tradingAccountId: string): void {
    // Normalize address
    this.ownerAddress = ownerAddress.toLowerCase()
    this.tradingAccountId = tradingAccountId
  }

  async start(): Promise<void> {
    console.log('[TradingEngine] start() called')
    
    if (this.isRunning) {
      console.log('[TradingEngine] Already running, skipping')
      return
    }

    if (!this.ownerAddress || !this.tradingAccountId) {
      throw new Error('Trading engine not initialized. Please set owner address and trading account ID.')
    }

    this.isRunning = true
    this.sessionTradeCycles = 0

    // Get active strategy configs from database
    console.log('[TradingEngine] Querying active strategy configs...')
    const allConfigs = await db.strategyConfigs.toArray()
    const activeConfigs = allConfigs.filter((config) => config.isActive === true)
    
    console.log(`[TradingEngine] Found ${activeConfigs.length} active strategy config(s) out of ${allConfigs.length} total`)
    
    if (activeConfigs.length === 0) {
      console.warn('[TradingEngine] No active strategy configs found! Please configure a strategy in the Strategies tab.')
      this.emitStatus('No active strategies configured. Please set up a strategy first.', 'warning')
      // Still set isRunning to true so UI shows as active, but no trading will occur
      return
    }

    // Initialize market configs
    for (const storedConfig of activeConfigs) {
      console.log(`[TradingEngine] Initializing config for market: ${storedConfig.marketId}`)
      const market = await marketService.getMarket(storedConfig.marketId)
      if (!market) {
        console.warn(`[TradingEngine] Market ${storedConfig.marketId} not found, skipping`)
        continue
      }

      const marketConfig: MarketConfig = {
        market,
        config: storedConfig.config,
        nextRunAt: Date.now() + this.getJitteredDelay(storedConfig.config),
      }

      this.marketConfigs.set(storedConfig.marketId, marketConfig)
      console.log(`[TradingEngine] Market config initialized: ${storedConfig.marketId}`)
    }

    console.log(`[TradingEngine] Starting trading loops for ${this.marketConfigs.size} market(s)...`)
    
    // Start trading loops for each market
    for (const [marketId, marketConfig] of this.marketConfigs) {
      // Set nextRunAt to now for immediate execution (better UX)
      marketConfig.nextRunAt = Date.now()
      this.startMarketTrading(marketId, marketConfig)
      
      // Start order fulfillment polling if fill tracking is enabled
      if (marketConfig.config.orderManagement.trackFillPrices && this.ownerAddress) {
        orderFulfillmentPolling.startPolling(marketId, this.ownerAddress)
      }
    }
    
    console.log('[TradingEngine] Trading engine started successfully')
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.transactionLock = false

    // Stop all order fulfillment polling
    orderFulfillmentPolling.stopAll()

    // Clear all intervals
    for (const marketConfig of this.marketConfigs.values()) {
      if (marketConfig.intervalId) {
        clearTimeout(marketConfig.intervalId)
      }
    }

    this.marketConfigs.clear()
  }

  isActive(): boolean {
    return this.isRunning
  }

  getSessionTradeCycles(): number {
    return this.sessionTradeCycles
  }

  onTradeComplete(callback: TradeCallback): () => void {
    this.onTradeCompleteCallbacks.push(callback)
    return () => {
      const index = this.onTradeCompleteCallbacks.indexOf(callback)
      if (index > -1) {
        this.onTradeCompleteCallbacks.splice(index, 1)
      }
    }
  }

  onStatus(callback: StatusCallback): () => void {
    this.onStatusCallbacks.push(callback)
    return () => {
      const index = this.onStatusCallbacks.indexOf(callback)
      if (index > -1) {
        this.onStatusCallbacks.splice(index, 1)
      }
    }
  }

  private notifyTradeComplete(): void {
    this.onTradeCompleteCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error('Error in trade complete callback:', error)
      }
    })
  }

  private async initializeMarketConfig(marketId: string): Promise<void> {
    const storedConfig = await db.strategyConfigs.get(marketId)
    if (!storedConfig || !storedConfig.isActive) {
      return
    }

    const market = await marketService.getMarket(marketId)
    if (!market) {
      return
    }

    const marketConfig: MarketConfig = {
      market,
      config: storedConfig.config,
      nextRunAt: Date.now() + this.getJitteredDelay(storedConfig.config),
    }

    this.marketConfigs.set(marketId, marketConfig)
  }

  private startMarketTrading(marketId: string, marketConfig: MarketConfig): void {
    const executeTrade = async () => {
      if (!this.isRunning || !this.ownerAddress || !this.tradingAccountId) {
        console.log('[TradingEngine] Not running or not initialized, stopping')
        return
      }

      if (this.transactionLock) {
        if (this.isRunning) {
          const delay = 2500
          marketConfig.nextRunAt = Date.now() + delay
          marketConfig.intervalId = window.setTimeout(executeTrade, delay)
        }
        return
      }

      this.transactionLock = true

      try {
        console.log(`[TradingEngine] Executing strategy for ${marketConfig.market.market_id}`)
        const pair = `${marketConfig.market.base.symbol}/${marketConfig.market.quote.symbol}`
        this.emitStatus(`${pair}: Executing strategy...`, 'info')

        // Track order fills before executing new strategy
        if (marketConfig.config.orderManagement.trackFillPrices) {
          await this.trackOrderFills(marketConfig.market.market_id, this.ownerAddress!)
        }

        // Execute unified strategy executor
        const result = await unifiedStrategyExecutor.execute(
          marketConfig.market,
          marketConfig.config,
          this.ownerAddress!,
          this.tradingAccountId!
        )

        console.log(`[TradingEngine] Strategy result:`, result)

        if (!result) {
          console.warn(`[TradingEngine] Strategy returned no result for ${marketId}`)
          const pair = `${marketConfig.market.base.symbol}/${marketConfig.market.quote.symbol}`
          this.emitStatus(`${pair}: Strategy returned no result`, 'warning')
          // Reschedule
          marketConfig.nextRunAt = Date.now() + 10000
          if (this.isRunning) {
            marketConfig.intervalId = window.setTimeout(executeTrade, 10000)
          }
          return
        }

        if (result.executed && result.orders) {
          this.sessionTradeCycles++

          // Record trades
          for (const orderExec of result.orders) {
            if (orderExec.success && orderExec.orderId) {
              console.log(`[TradingEngine] Order placed: ${orderExec.side} ${orderExec.orderId}`)
              const trade: Trade = {
                timestamp: Date.now(),
                marketId: marketConfig.market.market_id,
                orderId: orderExec.orderId,
                side: orderExec.side,
                price: orderExec.price || '0',
                quantity: orderExec.quantity || '0',
                success: true,
              }

              await tradeHistoryService.addTrade(trade)
              
              // Format success message with human-readable values
              const pair = orderExec.marketPair || `${marketConfig.market.base.symbol}/${marketConfig.market.quote.symbol}`
              const amount = orderExec.quantityHuman || 'N/A'
              const asset = marketConfig.market.base.symbol
              const price = orderExec.priceHuman ? `$${orderExec.priceHuman}` : 'N/A'
              this.emitStatus(
                `${pair}: ${orderExec.side} ${amount} ${asset} @ ${price}`,
                'success'
              )
            } else {
              console.error(`[TradingEngine] Order failed: ${orderExec.side} - ${orderExec.error}`)
              
              // Format error message with market pair
              const pair = orderExec.marketPair || `${marketConfig.market.base.symbol}/${marketConfig.market.quote.symbol}`
              const errorMsg = orderExec.error || 'Unknown error'
              this.emitStatus(
                `${pair}: ${orderExec.side} order failed - ${errorMsg}`,
                'error'
              )
            }
          }

          this.notifyTradeComplete()
        } else {
          console.log(`[TradingEngine] Strategy executed but no orders placed (executed: ${result.executed}, orders: ${result.orders?.length || 0})`)
          const pair = `${marketConfig.market.base.symbol}/${marketConfig.market.quote.symbol}`
          this.emitStatus(`${pair}: No orders placed (check balances)`, 'info')
        }

        // Update config in database if fill prices were tracked
        if (marketConfig.config.orderManagement.trackFillPrices && result.executed) {
          await db.strategyConfigs.update(marketConfig.market.market_id, {
            config: marketConfig.config,
            updatedAt: Date.now(),
          })
        }

        // Schedule next execution
        const nextRunAt = result.nextRunAt || Date.now() + this.getJitteredDelay(marketConfig.config)
        marketConfig.nextRunAt = nextRunAt

        if (this.isRunning) {
          const delay = Math.max(0, nextRunAt - Date.now())
          console.log(`[TradingEngine] Next execution in ${delay}ms`)
          marketConfig.intervalId = window.setTimeout(executeTrade, delay)
        }
      } catch (error: any) {
        console.error(`[TradingEngine] Error executing strategy for ${marketId}:`, error)
        this.emitStatus(`[${marketConfig.market.market_id}] Error: ${error.message}`, 'error')

        // Reschedule with delay on error
        marketConfig.nextRunAt = Date.now() + 10000
        if (this.isRunning) {
          marketConfig.intervalId = window.setTimeout(executeTrade, 10000)
        }
      } finally {
        this.transactionLock = false
      }
    }

    // Start first execution
    const delay = Math.max(0, marketConfig.nextRunAt - Date.now())
    console.log(`[TradingEngine] Starting trading for ${marketId}, first execution in ${delay}ms`)
    marketConfig.intervalId = window.setTimeout(executeTrade, delay)
  }

  private getJitteredDelay(config: StrategyConfig): number {
    const min = config.timing.cycleIntervalMinMs
    const max = config.timing.cycleIntervalMaxMs
    return min + Math.floor(Math.random() * (max - min + 1))
  }

  /**
   * Track order fills and update config
   */
  private async trackOrderFills(marketId: string, ownerAddress: string): Promise<void> {
    try {
      const fills = await orderFulfillmentService.trackOrderFills(marketId, ownerAddress)
      
      if (fills.size > 0) {
        const storedConfig = await db.strategyConfigs.get(marketId)
        if (storedConfig) {
          let updatedConfig = storedConfig.config
          
          const market = await marketService.getMarket(marketId)
          if (market) {
            for (const [orderId, { order, previousFilledQuantity }] of fills) {
              updatedConfig = await orderFulfillmentService.updateFillPrices(
                updatedConfig,
                order,
                market,
                previousFilledQuantity
              )
            }
          }
          
          // Update config in database
          await db.strategyConfigs.update(marketId, {
            config: updatedConfig,
            updatedAt: Date.now(),
          })
          
          // Update in-memory config
          const marketConfig = this.marketConfigs.get(marketId)
          if (marketConfig) {
            marketConfig.config = updatedConfig
          }
        }
      }
    } catch (error) {
      console.error('[TradingEngine] Error tracking order fills:', error)
    }
  }
}

export const tradingEngine = new TradingEngine()

