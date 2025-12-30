import { Trade } from '../types/trade'
import { db } from './dbService'

class TradeHistoryService {
  async addTrade(trade: Trade): Promise<void> {
    await db.trades.add(trade)
  }

  async getTrades(marketId?: string, limit: number = 100): Promise<Trade[]> {
    let query = db.trades.orderBy('timestamp').reverse()
    
    if (marketId) {
      query = query.filter((trade) => trade.marketId === marketId)
    }
    
    return await query.limit(limit).toArray()
  }

  async getTradesBySession(sessionId: string): Promise<Trade[]> {
    return await db.trades
      .where('sessionId')
      .equals(sessionId)
      .reverse()
      .toArray()
  }

  async getRecentTrades(count: number = 20): Promise<Trade[]> {
    return await db.trades
      .orderBy('timestamp')
      .reverse()
      .limit(count)
      .toArray()
  }

  async getTradeStats(marketId?: string): Promise<{
    totalTrades: number
    successfulTrades: number
    failedTrades: number
    totalVolumeUsd: number
  }> {
    let trades = await this.getTrades(marketId, 10000) // Get all trades

    const stats = {
      totalTrades: trades.length,
      successfulTrades: trades.filter((t) => t.success).length,
      failedTrades: trades.filter((t) => !t.success).length,
      totalVolumeUsd: trades.reduce((sum, t) => sum + (t.valueUsd || 0), 0),
    }

    return stats
  }

  async getTradeByOrderId(orderId: string): Promise<Trade | undefined> {
    const trades = await db.trades.where('orderId').equals(orderId).toArray()
    return trades[0]
  }

  async updateTradeByOrderId(orderId: string, updates: Partial<Trade>): Promise<void> {
    const trades = await db.trades.where('orderId').equals(orderId).toArray()
    console.log(`[TradeHistoryService] updateTradeByOrderId: orderId=${orderId}, found=${trades.length} trades`)
    if (trades.length > 0 && trades[0].id !== undefined) {
      console.log(`[TradeHistoryService] Updating trade id=${trades[0].id} with:`, updates)
      await db.trades.update(trades[0].id, updates)
    } else {
      console.warn(`[TradeHistoryService] Could not update trade: orderId=${orderId}, trades found=${trades.length}, id=${trades[0]?.id}`)
    }
  }
}

export const tradeHistoryService = new TradeHistoryService()

