import { Strategy } from '../strategies/baseStrategy'
import { MarketMakingStrategy } from '../strategies/marketMakingStrategy'
import { BalanceThresholdStrategy } from '../strategies/balanceThresholdStrategy'
import { StrategyType } from '../types/strategy'

class StrategyService {
  createStrategy(type: StrategyType): Strategy {
    switch (type) {
      case 'marketMaking':
        return new MarketMakingStrategy()
      case 'balanceThreshold':
        return new BalanceThresholdStrategy()
      default:
        throw new Error(`Unknown strategy type: ${type}`)
    }
  }

  getAvailableStrategies(): StrategyType[] {
    return ['marketMaking', 'balanceThreshold']
  }
}

export const strategyService = new StrategyService()

