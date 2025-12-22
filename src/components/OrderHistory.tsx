import { useState, useEffect, useRef } from 'react'
import { Order } from '../types/order'
import { orderService } from '../services/orderService'
import { walletService } from '../services/walletService'
import { tradingEngine } from '../services/tradingEngine'
import './OrderHistory.css'

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadOrders = async () => {
    try {
      const wallet = walletService.getConnectedWallet()
      if (!wallet) return

      const openOrders = await orderService.getAllOpenOrders(wallet.address)
      setOrders(openOrders)
    } catch (error) {
      console.error('Failed to load orders', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load orders initially
    loadOrders()

    // Set up auto-refresh when trading is active
    const checkTradingStatus = () => {
      const isTrading = tradingEngine.isActive()
      
      if (isTrading) {
        // Start polling every 5 seconds when trading
        if (!refreshIntervalRef.current) {
          refreshIntervalRef.current = setInterval(() => {
            loadOrders()
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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`
  }

  const getStatusClass = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('filled') || statusLower === 'filled') return 'filled'
    if (statusLower.includes('completed')) return 'filled'
    if (statusLower.includes('cancelled') || statusLower === 'cancelled') return 'cancelled'
    if (statusLower.includes('failed') || statusLower === 'failed') return 'cancelled'
    if (statusLower.includes('partial') || statusLower === 'partially_filled') return 'partial'
    if (statusLower === 'open' || statusLower === 'pending') return 'open'
    return 'open'
  }

  if (loading) {
    return (
      <div className="order-history">
        <h2>Open Orders</h2>
        <div className="loading">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="order-history">
      <h2>Open Orders</h2>
      {orders.length === 0 ? (
        <div className="empty-state">No open orders</div>
      ) : (
        <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Market</th>
              <th>Side</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Filled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.order_id}>
                  <td title={order.order_id}>{formatAddress(order.order_id)}</td>
                  <td title={order.market_id}>{formatAddress(order.market_id)}</td>
                  <td>
                    <span className={`side-badge ${order.side.toLowerCase()}`}>
                      {order.side}
                    </span>
                  </td>
                <td>{order.price}</td>
                <td>{order.quantity}</td>
                  <td>{order.filled_quantity || '0'}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

