import { TradingAccountBalances, Balance } from '../types/tradingAccount'

interface BalancesProps {
  balances: TradingAccountBalances | null
  loading?: boolean
}

export default function Balances({ balances, loading }: BalancesProps) {
  if (loading) {
    return (
      <div className="balances">
        <h2>Balances</h2>
        <p>Loading balances...</p>
      </div>
    )
  }

  if (!balances || balances.balances.length === 0) {
    return (
      <div className="balances">
        <h2>Balances</h2>
        <p>No balances found</p>
      </div>
    )
  }

  const formatBalance = (value: string, decimals: number): string => {
    try {
      // Use BigInt to handle large numbers safely
      const valueBigInt = BigInt(value || '0')
      const divisor = BigInt(10 ** decimals)
      
      // Calculate integer and fractional parts
      const integerPart = valueBigInt / divisor
      const fractionalPart = valueBigInt % divisor
      
      // Format fractional part with leading zeros
      const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
      
      // Remove trailing zeros from fractional part
      const fractionalTrimmed = fractionalStr.replace(/0+$/, '')
      
      // Combine integer and fractional parts
      if (fractionalTrimmed === '') {
        return integerPart.toString()
      }
      
      return `${integerPart}.${fractionalTrimmed}`
    } catch (error) {
      console.error('Error formatting balance:', error, value)
      return '0'
    }
  }

  return (
    <div className="balances">
      <h2>Balances</h2>
      <table className="balances-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Total Balance</th>
            <th>Available</th>
            <th>Locked</th>
          </tr>
        </thead>
        <tbody>
          {balances.balances.map((balance: Balance) => (
            <tr key={balance.assetId}>
              <td>{balance.assetSymbol}</td>
              <td className="tabular-nums">{formatBalance(balance.total, balance.decimals)}</td>
              <td className="tabular-nums">{formatBalance(balance.unlocked, balance.decimals)}</td>
              <td className="tabular-nums">{formatBalance(balance.locked, balance.decimals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
