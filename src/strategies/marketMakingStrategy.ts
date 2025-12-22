import Decimal from 'decimal.js'
import { Strategy } from './baseStrategy'
import { StrategyConfig, StrategyExecutionResult, OrderExecution } from '../types/strategy'
import { Market } from '../types/market'
import { marketService } from '../services/marketService'
import { orderService } from '../services/orderService'
import { balanceService } from '../services/balanceService'
import { OrderSide, OrderType } from '../types/order'

/**
 * Rounds down a quantity to 3 decimal places
 * @param quantity - Quantity in human-readable format (Decimal)
 * @returns Rounded down quantity with max 3 decimal places
 */
function roundDownTo3Decimals(quantity: Decimal): Decimal {
  const multiplier = new Decimal(1000)
  return quantity.mul(multiplier).floor().div(multiplier)
}

/**
 * Scales up a Decimal by a given number of decimals and truncates it
 * according to the maximum precision.
 * @param amount - The Decimal to scale and truncate
 * @param decimals - The total number of decimals for the asset
 * @param maxPrecision - The maximum allowed precision
 * @returns A Decimal instance representing the scaled and truncated value
 */
function scaleUpAndTruncateToInt(amount: Decimal, decimals: number, maxPrecision: number): Decimal {
  const priceInt = amount.mul(new Decimal(10).pow(decimals))
  const truncateFactor = new Decimal(10).pow(decimals - maxPrecision)
  return priceInt.div(truncateFactor).floor().mul(truncateFactor)
}

export class MarketMakingStrategy extends Strategy {
  getName(): string {
    return 'Market Making'
  }

  getDescription(): string {
    return 'Places buy and sell orders around the current market price to capture the spread. Maintains inventory balance by rebalancing when orders fill.'
  }

  getDefaultConfig(): StrategyConfig {
    return {
      type: 'marketMaking',
      marketId: '',
      spreadPercent: 1.0, // 1% spread (deprecated, kept for backward compatibility)
      orderSizeUsd: 100, // $100 per order
      rebalanceThreshold: 0.2, // Rebalance when inventory exceeds 20% of order size
      buyPriceAdjustmentPercent: 0.1, // Buy 0.1% above market for quick fills
      sellPriceAdjustmentPercent: 0.1, // Sell 0.1% below market for quick fills
      cycleIntervalMinMs: 3000, // 3 seconds
      cycleIntervalMaxMs: 5000, // 5 seconds
    }
  }

  async execute(
    market: Market,
    config: StrategyConfig,
    ownerAddress: string,
    tradingAccountId: string
  ): Promise<StrategyExecutionResult> {
    const orders: OrderExecution[] = []
    
    // Calculate next run time at the start, before any async operations
    // This ensures the interval represents time between execution starts, not execution ends
    const minInterval = config.cycleIntervalMinMs || 3000
    const maxInterval = config.cycleIntervalMaxMs || 5000
    const executionStartTime = Date.now()
    const nextRunAt = executionStartTime + (minInterval + Math.random() * (maxInterval - minInterval))
    
    try {
      console.log('[MarketMakingStrategy] Starting execution for market:', market.market_id)
      
      // Get current market price from ticker
      const ticker = await marketService.getTicker(market.market_id)
      if (!ticker) {
        console.warn('[MarketMakingStrategy] No ticker data available')
        return {
          executed: false,
          orders: [],
        }
      }

      console.log('[MarketMakingStrategy] Ticker price:', ticker.last_price)

      // Clear balance cache to ensure we get fresh data
      balanceService.clearCache()

      // Get current balances FIRST (before calculating orders)
      const balances = await balanceService.getMarketBalances(
        market,
        tradingAccountId,
        ownerAddress
      )

      // Log detailed balance information for debugging
      const baseBalanceApi = await balanceService.getBalance(
        market.base.asset,
        tradingAccountId,
        ownerAddress
      )
      const quoteBalanceApi = await balanceService.getBalance(
        market.quote.asset,
        tradingAccountId,
        ownerAddress
      )
      
      console.log('[MarketMakingStrategy] Balance details:', {
        base: {
          unlocked: balances.base.unlocked,
          locked: balances.base.locked,
          total: balances.base.total,
          trading_account_balance: baseBalanceApi.trading_account_balance,
          total_unlocked: baseBalanceApi.total_unlocked,
        },
        quote: {
          unlocked: balances.quote.unlocked,
          locked: balances.quote.locked,
          total: balances.quote.total,
          trading_account_balance: quoteBalanceApi.trading_account_balance,
          total_unlocked: quoteBalanceApi.total_unlocked,
        }
      })

      // Ticker last_price is already scaled (integer with decimals)
      // Convert to human-readable price first
      const tickerPriceScaled = new Decimal(ticker.last_price)
      const midPriceHuman = tickerPriceScaled.div(10 ** market.quote.decimals)
      
      const buyPriceAdjustmentPercent = config.buyPriceAdjustmentPercent ?? 0.1 // Default 0.1% above market for quick fills
      const sellPriceAdjustmentPercent = config.sellPriceAdjustmentPercent ?? 0.1 // Default 0.1% below market for quick fills
      const minOrderSizeUsd = 5.0  // O2 minimum order size

      // Calculate buy and sell prices in human-readable format
      // Buy price: Above market (aggressive - pays premium for quick fill)
      const buyPriceHuman = midPriceHuman.mul(1 + buyPriceAdjustmentPercent / 100)
      // Sell price: Below market (aggressive - accepts discount for quick fill)
      const sellPriceHuman = midPriceHuman.mul(1 - sellPriceAdjustmentPercent / 100)

      // Truncate prices according to max_precision before scaling
      // This ensures prices meet the orderbook contract's precision requirements
      const buyPriceTruncated = scaleUpAndTruncateToInt(
        buyPriceHuman,
        market.quote.decimals,
        market.quote.max_precision
      )
      const sellPriceTruncated = scaleUpAndTruncateToInt(
        sellPriceHuman,
        market.quote.decimals,
        market.quote.max_precision
      )

      // Convert truncated prices back to human-readable for calculations
      const buyPriceHumanTruncated = buyPriceTruncated.div(10 ** market.quote.decimals)
      const sellPriceHumanTruncated = sellPriceTruncated.div(10 ** market.quote.decimals)

      // Use truncated prices for scaled calculations
      const buyPriceScaled = buyPriceTruncated.toFixed(0)
      const buyPriceScaledDecimal = new Decimal(buyPriceScaled)

      // Convert balances to human-readable for calculations
      const quoteBalanceHuman = new Decimal(balances.quote.unlocked).div(10 ** market.quote.decimals)
      const baseBalanceHuman = new Decimal(balances.base.unlocked).div(10 ** market.base.decimals)

      // Calculate buy order from available quote balance
      // For a buy order, we need quote currency to pay for: price * quantity
      // Available quote balance (already in scaled format from API)
      const availableQuoteScaled = new Decimal(balances.quote.unlocked)
      
      // Calculate max quantity we can buy with available quote
      // Required quote for order = price * quantity / 10^base_decimals (since price is scaled)
      // So: quantity = (available_quote * 10^base_decimals) / price
      
      // Max quantity we can buy = (available_quote * 10^base_decimals) / price
      // This ensures price * quantity / 10^base_decimals <= available_quote
      const maxBuyQuantityScaled = availableQuoteScaled
        .mul(10 ** market.base.decimals)
        .div(buyPriceScaledDecimal)
        .toFixed(0)
      
      // Calculate order value in USD (before rounding)
      const buyQuantityHuman = new Decimal(maxBuyQuantityScaled).div(10 ** market.base.decimals)
      
      // Round down to 3 decimal places to comply with O2 UI requirements
      const buyQuantityHumanRounded = roundDownTo3Decimals(buyQuantityHuman)
      const roundedBuyQuantityScaled = buyQuantityHumanRounded
        .mul(10 ** market.base.decimals)
        .toFixed(0)
      
      // Recalculate order value with rounded quantity using truncated price
      const buyOrderValueUsdRounded = buyQuantityHumanRounded.mul(buyPriceHumanTruncated).toNumber()
      
      // Check if rounded quantity still meets minimum order size
      if (buyOrderValueUsdRounded >= minOrderSizeUsd && new Decimal(roundedBuyQuantityScaled).gt(0)) {
        // Verify the required quote amount with rounded quantity
        // For buy orders, forward amount = (price * quantity) / 10^base_decimals
        const requiredQuoteAmount = new Decimal(buyPriceScaled)
          .mul(roundedBuyQuantityScaled)
          .div(10 ** market.base.decimals)
          .toFixed(0)
        
        // Ensure we have enough balance (with small buffer for rounding)
        if (new Decimal(requiredQuoteAmount).gt(availableQuoteScaled)) {
          console.warn('[MarketMakingStrategy] Calculated order requires more quote than available:', {
            required: requiredQuoteAmount,
            available: balances.quote.unlocked
          })
        }
        
        console.log('[MarketMakingStrategy] Placing buy order:', {
          valueUsd: buyOrderValueUsdRounded.toFixed(2),
          price: buyPriceScaled,
          quantity: roundedBuyQuantityScaled,
          quantityHuman: buyQuantityHumanRounded.toString(),
          quoteRequired: requiredQuoteAmount,
          availableQuote: balances.quote.unlocked
        })

        try {
          const order = await orderService.placeOrder(
            market,
            OrderSide.Buy,
            OrderType.Market,
            buyPriceScaled,
            roundedBuyQuantityScaled,
            ownerAddress
          )

          console.log('[MarketMakingStrategy] Buy order placed:', order.order_id)
          orders.push({
            orderId: order.order_id,
            side: 'Buy',
            success: true,
            price: buyPriceScaled,
            quantity: roundedBuyQuantityScaled,
          })
        } catch (error: any) {
          console.error('[MarketMakingStrategy] Buy order failed:', error)
          orders.push({
            orderId: '',
            side: 'Buy',
            success: false,
            error: error.message,
          })
        }
      } else {
        console.log(`[MarketMakingStrategy] Buy order skipped: rounded value $${buyOrderValueUsdRounded.toFixed(2)} below minimum $${minOrderSizeUsd} or quantity is zero`)
      }

      // Calculate sell order from available base balance
      // Round down base balance to 3 decimal places to comply with O2 UI requirements
      const baseBalanceHumanRounded = roundDownTo3Decimals(baseBalanceHuman)
      const roundedSellQuantityScaled = baseBalanceHumanRounded
        .mul(10 ** market.base.decimals)
        .toFixed(0)
      
      // Recalculate order value with rounded quantity using truncated price
      const sellOrderValueUsdRounded = baseBalanceHumanRounded.mul(sellPriceHumanTruncated).toNumber()
      
      // Check if rounded quantity still meets minimum order size
      if (sellOrderValueUsdRounded >= minOrderSizeUsd && new Decimal(roundedSellQuantityScaled).gt(0)) {
        const sellPriceScaled = sellPriceTruncated.toFixed(0)

        console.log('[MarketMakingStrategy] Placing sell order:', {
          valueUsd: sellOrderValueUsdRounded.toFixed(2),
          price: sellPriceScaled,
          quantity: roundedSellQuantityScaled,
          quantityHuman: baseBalanceHumanRounded.toString(),
          availableBase: balances.base.unlocked
        })

        try {
          const order = await orderService.placeOrder(
            market,
            OrderSide.Sell,
            OrderType.Market,
            sellPriceScaled,
            roundedSellQuantityScaled,
            ownerAddress
          )

          console.log('[MarketMakingStrategy] Sell order placed:', order.order_id)
          orders.push({
            orderId: order.order_id,
            side: 'Sell',
            success: true,
            price: sellPriceScaled,
            quantity: roundedSellQuantityScaled,
          })
        } catch (error: any) {
          console.error('[MarketMakingStrategy] Sell order failed:', error)
          orders.push({
            orderId: '',
            side: 'Sell',
            success: false,
            error: error.message,
          })
        }
      } else {
        console.log(`[MarketMakingStrategy] Sell order skipped: rounded value $${sellOrderValueUsdRounded.toFixed(2)} below minimum $${minOrderSizeUsd} or quantity is zero`)
      }

      // nextRunAt was already calculated at the start of execution
      console.log('[MarketMakingStrategy] Execution complete:', {
        executed: orders.length > 0,
        ordersCount: orders.length,
        nextRunAt: new Date(nextRunAt).toLocaleTimeString()
      })

      return {
        executed: orders.length > 0,
        orders,
        nextRunAt, // Use the value calculated at the start
      }
    } catch (error: any) {
      console.error('[MarketMakingStrategy] Error:', error)
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

