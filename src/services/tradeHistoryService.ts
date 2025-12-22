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
}

export const tradeHistoryService = new TradeHistoryService()

