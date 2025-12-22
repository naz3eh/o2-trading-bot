import { useState, useEffect } from 'react'
import { tradingEngine } from '../services/tradingEngine'
import './TradeConsole.css'

interface TradeConsoleProps {
  isTrading: boolean
}

interface ConsoleMessage {
  message: string
  type: string
  timestamp: number
}

export default function TradeConsole({ isTrading }: TradeConsoleProps) {
  const [consoleCollapsed, setConsoleCollapsed] = useState(false)
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])

  useEffect(() => {
    if (!isTrading) {
      setConsoleMessages([])
      return
    }

    // Subscribe to status updates
    const unsubscribeStatus = tradingEngine.onStatus((message, type) => {
      setConsoleMessages((prev) => {
        const newMessages = [...prev, { message, type, timestamp: Date.now() }]
        // Keep only last 20 messages
        return newMessages.slice(-20)
      })
    })

    return () => {
      unsubscribeStatus()
    }
  }, [isTrading])

  return (
    <div className={`trade-console ${consoleCollapsed ? 'collapsed' : ''}`}>
      <div 
        className="trade-console-header" 
        onClick={() => setConsoleCollapsed(!consoleCollapsed)}
      >
        <span className="console-title">Trade Execution Console</span>
        <span className={`console-status ${isTrading ? 'active' : 'inactive'}`}>
          ● {isTrading ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
      {!consoleCollapsed && (
        <div className="trade-console-content">
          {consoleMessages.length > 0 ? (
            consoleMessages.map((log, index) => (
              <div key={index} className={`console-line console-${log.type}`}>
                <span className="console-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="console-message">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="console-line console-info">
              <span className="console-timestamp">--:--:--</span>
              <span className="console-message">
                {isTrading ? 'Waiting for trade execution...' : 'Trading not active'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

