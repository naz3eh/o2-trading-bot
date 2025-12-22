import { useState, useEffect } from 'react'
import { walletService, wagmiConfig } from '../services/walletService'
import { useWalletStore } from '../stores/useWalletStore'
import { useToast } from './ToastProvider'
import './WalletConnect.css'

interface WalletConnectProps {
  onConnect: () => void
}

export default function WalletConnect({ onConnect }: WalletConnectProps) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [ethereumConnectors, setEthereumConnectors] = useState<Array<{ id: string; name: string; type: 'ethereum' }>>([])
  const { addToast } = useToast()

  useEffect(() => {
    // Get available Ethereum connectors
    const connectors = walletService.getAvailableEthereumConnectors()
    setEthereumConnectors(connectors)
  }, [])

  const handleConnectFuel = async (walletType: 'fuel' | 'fuelet' | 'bako-safe') => {
    setConnecting(walletType)
    try {
      await walletService.connectFuelWallet(walletType)
      addToast('Wallet connected successfully', 'success')
      // Store will be updated automatically by WalletConnectionWatcher
      onConnect()
    } catch (error: any) {
      addToast(`Failed to connect wallet: ${error.message}`, 'error')
    } finally {
      setConnecting(null)
    }
  }

  const handleConnectEthereum = async (connectorName?: string) => {
    setConnecting(connectorName || 'ethereum')
    try {
      await walletService.connectEthereumWallet(connectorName)
      addToast('Wallet connected successfully', 'success')
      // Store will be updated automatically by WalletConnectionWatcher
      onConnect()
    } catch (error: any) {
      addToast(`Failed to connect wallet: ${error.message}`, 'error')
    } finally {
      setConnecting(null)
    }
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-connect-container">
        <h1>o2 Trading Bot</h1>
        <p className="subtitle">Connect your wallet to start trading</p>

        <div className="wallet-options">
          <h2>Fuel Wallets</h2>
          <div className="wallet-grid">
            <button
              className="wallet-button"
              onClick={() => handleConnectFuel('fuel')}
              disabled={!!connecting}
            >
              {connecting === 'fuel' ? 'Connecting...' : 'Fuel Wallet'}
            </button>
            <button
              className="wallet-button"
              onClick={() => handleConnectFuel('fuelet')}
              disabled={!!connecting}
            >
              {connecting === 'fuelet' ? 'Connecting...' : 'Fuelet'}
            </button>
            <button
              className="wallet-button"
              onClick={() => handleConnectFuel('bako-safe')}
              disabled={!!connecting}
            >
              {connecting === 'bako-safe' ? 'Connecting...' : 'Bako Safe'}
            </button>
          </div>

          {ethereumConnectors.length > 0 && (
            <>
              <h2 style={{ marginTop: '32px' }}>Ethereum Wallets</h2>
              <div className="wallet-grid">
                {ethereumConnectors.map((connector) => (
                  <button
                    key={connector.id}
                    className="wallet-button"
                    onClick={() => handleConnectEthereum(connector.name)}
                    disabled={!!connecting}
                  >
                    {connecting === connector.name ? 'Connecting...' : connector.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

