import { useState } from 'react'
import { Market } from '../types/market'
import { useToast } from './ToastProvider'

interface MarketSelectorProps {
  markets: Market[]
}

export default function MarketSelector({ markets }: MarketSelectorProps) {
  const { addToast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = async (text: string, marketId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(marketId)
      addToast('Copied to clipboard', 'success')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      addToast('Failed to copy', 'error')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="market-selector">
      <div className="markets-grid">
        {markets.map((market) => (
          <div key={market.market_id} className="market-card">
            <div className="market-pair">
              <span className="base-symbol">{market.base.symbol}</span>
              <span className="separator">/</span>
              <span className="quote-symbol">{market.quote.symbol}</span>
            </div>
            <div className="market-details">
              <div 
                className="address-chip clickable"
                onClick={() => copyToClipboard(market.market_id, market.market_id)}
                title="Click to copy Market ID"
              >
                <span className="chip-label">Market ID</span>
                <span className="chip-value">{formatAddress(market.market_id)}</span>
                <svg className="chip-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {copiedId === market.market_id ? (
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </>
                  )}
                </svg>
              </div>
              <div 
                className="address-chip clickable"
                onClick={() => copyToClipboard(market.contract_id, `contract-${market.market_id}`)}
                title="Click to copy Contract ID"
              >
                <span className="chip-label">Contract</span>
                <span className="chip-value">{formatAddress(market.contract_id)}</span>
                <svg className="chip-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {copiedId === `contract-${market.market_id}` ? (
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  ) : (
                    <>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

