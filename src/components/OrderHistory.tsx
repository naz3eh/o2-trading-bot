import { useState, useEffect, useRef } from 'react'
import { Order } from '../types/order'
import { orderService } from '../services/orderService'
import { walletService } from '../services/walletService'
import { tradingEngine } from '../services/tradingEngine'

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

  if (loading) {
    return <div>Loading orders...</div>
  }

  return (
    <div className="order-history">
      <h2>Open Orders</h2>
      {orders.length === 0 ? (
        <p>No open orders</p>
      ) : (
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
                <td>{order.order_id.slice(0, 16)}...</td>
                <td>{order.market_id.slice(0, 16)}...</td>
                <td>{order.side}</td>
                <td>{order.price}</td>
                <td>{order.quantity}</td>
                <td>{order.filled_quantity}</td>
                <td>{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

