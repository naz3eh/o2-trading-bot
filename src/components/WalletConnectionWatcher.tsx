import { useEffect } from 'react'
import { useWalletStore } from '../stores/useWalletStore'
import { walletService, fuel } from '../services/walletService'
import { useAccount, useAccountEffect } from 'wagmi'

/**
 * Watches wallet connections and automatically updates the store
 * Similar to o2's ConnectorsSync component
 */
export function WalletConnectionWatcher() {
  const setConnectedWallet = useWalletStore((state) => state.setConnectedWallet)
  const clearWallet = useWalletStore((state) => state.clearWallet)

  // Watch Fuel wallet connection
  useEffect(() => {
    const checkFuelConnection = async () => {
      try {
        const account = await fuel.currentAccount()
        if (account && typeof account !== 'string' && (account as any).address) {
          const address = (account as any).address.toB256()
          const connector = await fuel.currentConnector()
          
          if (connector) {
            const walletType = connector.name === 'Fuel Wallet' ? 'fuel' 
              : connector.name === 'Fuelet' ? 'fuelet'
              : connector.name === 'Bako Safe' ? 'bako-safe'
              : 'fuel'
            
            setConnectedWallet({
              type: walletType,
              address,
              isFuel: true,
              connector,
            })
          }
        } else {
          // No Fuel wallet - check if Ethereum wallet is connected
          // Only log if no wallet is connected at all
          const currentWallet = useWalletStore.getState().connectedWallet
          if (!currentWallet) {
            // No wallet connected at all - this is expected during initial load
            // Don't log repeatedly
          }
        }
      } catch (error) {
        // Check if any wallet is connected before logging
        const currentWallet = useWalletStore.getState().connectedWallet
        if (!currentWallet) {
          // No wallet connected - silently skip (wallet might not be connected yet)
          // Removed console.debug to prevent spam
        }
      }
    }

    // Check on mount
    checkFuelConnection()

    // Listen for Fuel wallet events
    const handleFuelEvent = async () => {
      await checkFuelConnection()
    }

    // Poll for changes (Fuel SDK doesn't have event listeners)
    const interval = setInterval(checkFuelConnection, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [setConnectedWallet])

  // Watch Ethereum wallet connection via wagmi
  const { address: evmAddress, isConnected: isEvmConnected, connector: evmConnector } = useAccount()

  useAccountEffect({
    onConnect({ address, connector }) {
      if (address && connector) {
        setConnectedWallet({
          type: connector.name as any,
          address: address.toLowerCase(),
          isFuel: false,
          connector,
        })
      }
    },
    onDisconnect() {
      // Only clear if it was an Ethereum wallet
      const current = useWalletStore.getState().connectedWallet
      if (current && !current.isFuel) {
        clearWallet()
      }
    },
  })

  // Handle Ethereum account changes
  useEffect(() => {
    if (isEvmConnected && evmAddress && evmConnector) {
      setConnectedWallet({
        type: evmConnector.name as any,
        address: evmAddress.toLowerCase(),
        isFuel: false,
        connector: evmConnector,
      })
    } else if (!isEvmConnected) {
      // Only clear if it was an Ethereum wallet
      const current = useWalletStore.getState().connectedWallet
      if (current && !current.isFuel) {
        clearWallet()
      }
    }
  }, [isEvmConnected, evmAddress, evmConnector, setConnectedWallet, clearWallet])

  return null
}
