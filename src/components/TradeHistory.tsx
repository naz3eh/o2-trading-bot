import { useState, useEffect, useRef } from 'react'
import { Trade } from '../types/trade'
import { tradeHistoryService } from '../services/tradeHistoryService'
import { tradingEngine } from '../services/tradingEngine'

export default function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadTrades = async () => {
    const recentTrades = await tradeHistoryService.getRecentTrades(50)
    setTrades(recentTrades)
  }

  useEffect(() => {
    // Load trades initially
    loadTrades()

    // Set up auto-refresh when trading is active
    const checkTradingStatus = () => {
      const isTrading = tradingEngine.isActive()
      
      if (isTrading) {
        // Start polling every 5 seconds when trading
        if (!refreshIntervalRef.current) {
          refreshIntervalRef.current = setInterval(() => {
            loadTrades()
          }, 5000)
        }
      } else {
        // Stop polling when not trading
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
      }
    }

    // Check initially
    checkTradingStatus()

    // Check periodically (every 2 seconds) if trading status changed
    const statusCheckInterval = setInterval(checkTradingStatus, 2000)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      clearInterval(statusCheckInterval)
    }
  }, [])

  return (
    <div className="trade-history">
      <h2>Trade History</h2>
      {trades.length === 0 ? (
        <p>No trades yet</p>
      ) : (
        <table className="trades-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Market</th>
              <th>Side</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr key={trade.id || index}>
                <td>{new Date(trade.timestamp).toLocaleString()}</td>
                <td>{trade.marketId.slice(0, 16)}...</td>
                <td>{trade.side}</td>
                <td>{trade.price}</td>
                <td>{trade.quantity}</td>
                <td className={trade.success ? 'success' : 'error'}>
                  {trade.success ? 'Success' : 'Failed'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

