import { Market } from '../types/market'

interface MarketSelectorProps {
  markets: Market[]
}

export default function MarketSelector({ markets }: MarketSelectorProps) {
  return (
    <div className="market-selector">
      <h2>Available Markets</h2>
      <div className="markets-grid">
        {markets.map((market) => (
          <div key={market.market_id} className="market-card">
            <div className="market-header">
              <h3>{market.base.symbol}/{market.quote.symbol}</h3>
            </div>
            <div className="market-info">
              <div className="info-item">
                <span className="label">Market ID:</span>
                <span className="value">{market.market_id.slice(0, 20)}...</span>
              </div>
              <div className="info-item">
                <span className="label">Contract:</span>
                <span className="value">{market.contract_id.slice(0, 20)}...</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

