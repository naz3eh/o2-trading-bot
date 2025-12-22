import Decimal from 'decimal.js'
import { Strategy } from './baseStrategy'
import { StrategyConfig, StrategyExecutionResult, OrderExecution } from '../types/strategy'
import { Market } from '../types/market'
import { marketService } from '../services/marketService'
import { orderService } from '../services/orderService'
import { balanceService } from '../services/balanceService'
import { OrderSide, OrderType } from '../types/order'

export class BalanceThresholdStrategy extends Strategy {
  getName(): string {
    return 'Balance Threshold'
  }

  getDescription(): string {
    return 'Places orders when balance exceeds configured thresholds. If base balance > threshold, places sell order. If quote balance > threshold, places buy order.'
  }

  getDefaultConfig(): StrategyConfig {
    return {
      marketId: '',
      name: 'Balance Threshold Strategy',
      baseThreshold: 1000, // Base token units (after decimals)
      quoteThreshold: 100, // Quote token units (after decimals)
      orderConfig: {
        orderType: 'Spot',
        priceMode: 'market',
        priceOffsetPercent: 0,
        maxSpreadPercent: 2.0,
        side: 'Both',
      },
      positionSizing: {
        sizeMode: 'percentageOfBalance',
        balancePercentage: 100,
        balanceType: 'both',
        minOrderSizeUsd: 5,
      },
      orderManagement: {
        trackFillPrices: false,
        onlySellAboveBuyPrice: false,
        maxOpenOrders: 2,
        cancelAndReplace: false,
      },
      riskManagement: {},
      timing: {
        cycleIntervalMinMs: 5000,
        cycleIntervalMaxMs: 10000,
      },
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  async execute(
    market: Market,
    config: StrategyConfig,
    ownerAddress: string,
    tradingAccountId: string
  ): Promise<StrategyExecutionResult> {
    const orders: OrderExecution[] = []

    try {
      // Get current balances
      const balances = await balanceService.getMarketBalances(
        market,
        tradingAccountId,
        ownerAddress
      )

      const baseBalance = new Decimal(balances.base.unlocked)
        .div(10 ** market.base.decimals)
      const quoteBalance = new Decimal(balances.quote.unlocked)
        .div(10 ** market.quote.decimals)

      const baseThreshold = config.baseThreshold ?? 0
      const quoteThreshold = config.quoteThreshold ?? 0

      // Get current market price
      const ticker = await marketService.getTicker(market.market_id)
      if (!ticker) {
        return {
          executed: false,
          orders: [],
        }
      }

      const marketPrice = new Decimal(ticker.last_price)

      // Check base threshold - if exceeded, place sell order
      if (baseBalance.gt(baseThreshold)) {
        const excessBase = baseBalance.minus(baseThreshold)
        const sellQuantity = excessBase.mul(10 ** market.base.decimals).toFixed(0)
        const sellPrice = marketPrice.mul(0.99).mul(10 ** market.quote.decimals).toFixed(0) // 1% below market

        try {
          const order = await orderService.placeOrder(
            market,
            OrderSide.Sell,
            OrderType.Spot,
            sellPrice,
            sellQuantity,
            ownerAddress
          )

          orders.push({
            orderId: order.order_id,
            side: 'Sell',
            success: true,
            price: sellPrice,
            quantity: sellQuantity,
          })
        } catch (error: any) {
          orders.push({
            orderId: '',
            side: 'Sell',
            success: false,
            error: error.message,
          })
        }
      }

      // Check quote threshold - if exceeded, place buy order
      if (quoteBalance.gt(quoteThreshold)) {
        const excessQuote = quoteBalance.minus(quoteThreshold)
        const buyValue = excessQuote
        const buyQuantity = buyValue.div(marketPrice).mul(10 ** market.base.decimals).toFixed(0)
        const buyPrice = marketPrice.mul(1.01).mul(10 ** market.quote.decimals).toFixed(0) // 1% above market

        try {
          const order = await orderService.placeOrder(
            market,
            OrderSide.Buy,
            OrderType.Spot,
            buyPrice,
            buyQuantity,
            ownerAddress
          )

          orders.push({
            orderId: order.order_id,
            side: 'Buy',
            success: true,
            price: buyPrice,
            quantity: buyQuantity,
          })
        } catch (error: any) {
          orders.push({
            orderId: '',
            side: 'Buy',
            success: false,
            error: error.message,
          })
        }
      }

      // Calculate next run time
      const minInterval = config.timing.cycleIntervalMinMs || 5000
      const maxInterval = config.timing.cycleIntervalMaxMs || 10000
      const nextRunAt = Date.now() + (minInterval + Math.random() * (maxInterval - minInterval))

      return {
        executed: orders.length > 0,
        orders,
        nextRunAt,
      }
    } catch (error: any) {
      console.error('Balance threshold strategy error', error)
      return {
        executed: false,
        orders: [
          {
            orderId: '',
            side: 'Buy',
            success: false,
            error: error.message,
          },
        ],
      }
    }
  }
}

