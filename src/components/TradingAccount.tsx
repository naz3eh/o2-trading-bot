import { TradingAccount as TradingAccountType } from '../types/tradingAccount'

interface TradingAccountProps {
  account: TradingAccountType | null
}

export default function TradingAccount({ account }: TradingAccountProps) {
  if (!account) {
    return (
      <div className="trading-account">
        <h2>Trading Account</h2>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="trading-account">
      <h2>Trading Account</h2>
      <div className="account-info">
        <div className="info-row">
          <span className="label">Account ID:</span>
          <span className="value">{account.id.slice(0, 20)}...</span>
        </div>
        <div className="info-row">
          <span className="label">Owner:</span>
          <span className="value">{account.ownerAddress.slice(0, 20)}...</span>
        </div>
        <div className="info-row">
          <span className="label">Nonce:</span>
          <span className="value">{account.nonce}</span>
        </div>
        <a
          href={`https://o2.app`}
          target="_blank"
          rel="noopener noreferrer"
          className="deposit-link"
        >
          Deposit Funds on o2.app →
        </a>
      </div>
    </div>
  )
}

