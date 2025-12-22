import { useState, useEffect } from 'react'
import { Market } from '../types/market'
import { StrategyConfigStore } from '../types/strategy'
import { db } from '../services/dbService'
import { strategyService } from '../services/strategyService'
import { useToast } from './ToastProvider'

interface StrategyConfigProps {
  markets: Market[]
}

export default function StrategyConfig({ markets }: StrategyConfigProps) {
  const [configs, setConfigs] = useState<StrategyConfigStore[]>([])
  const [selectedMarket, setSelectedMarket] = useState<string>('')
  const [strategyType, setStrategyType] = useState<'marketMaking' | 'balanceThreshold'>('marketMaking')
  const { addToast } = useToast()

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    const all = await db.strategyConfigs.toArray()
    setConfigs(all)
  }

  const handleSave = async () => {
    if (!selectedMarket) {
      addToast('Please select a market', 'error')
      return
    }

    const strategy = strategyService.createStrategy(strategyType)
    const defaultConfig = strategy.getDefaultConfig()
    defaultConfig.marketId = selectedMarket

    const configStore: StrategyConfigStore = {
      id: selectedMarket,
      marketId: selectedMarket,
      strategyType,
      config: defaultConfig,
      isActive: true,
      createdAt: Date.now(),
    }

    await db.strategyConfigs.put(configStore)
    await loadConfigs()
    addToast('Strategy configuration saved', 'success')
  }

  return (
    <div className="strategy-config">
      <h2>Strategy Configuration</h2>
      
      <div className="config-form">
        <div className="form-group">
          <label>Market</label>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            <option value="">Select a market</option>
            {markets.map((market) => (
              <option key={market.market_id} value={market.market_id}>
                {market.base.symbol}/{market.quote.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Strategy Type</label>
          <select
            value={strategyType}
            onChange={(e) => setStrategyType(e.target.value as any)}
          >
            <option value="marketMaking">Market Making</option>
            <option value="balanceThreshold">Balance Threshold</option>
          </select>
        </div>

        <button onClick={handleSave} className="save-button">
          Save Configuration
        </button>
      </div>

      <div className="configs-list">
        <h3>Active Configurations</h3>
        {configs.filter((c) => c.isActive).map((config) => (
          <div key={config.id} className="config-item">
            <span>{config.marketId}</span>
            <span>{config.strategyType}</span>
            <span className={config.isActive ? 'active' : 'inactive'}>
              {config.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

