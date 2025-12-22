import { Account, Address, Provider, HashableMessage, concat } from 'fuels'
import { signMessage as wagmiSignMessage } from 'wagmi/actions'
import { parseSignature, signatureToCompactSignature, SignableMessage, ByteArray } from 'viem'
import { wagmiConfig } from './walletService'

export interface EthereumAccountAdapterConfig {
  address: Address
  provider: Provider
}

/**
 * Ethereum account adapter that allows Ethereum wallets to work with Fuel's Account interface
 * This enables Ethereum wallets (like MetaMask) to sign messages for o2 session creation
 */
export class EthereumAccountAdapter extends Account {
  readonly address: Address

  constructor(config: EthereumAccountAdapterConfig) {
    super(config.address, config.provider)
    this.address = config.address
  }

  async signMessage(message: HashableMessage): Promise<string> {
    const getMessage = (): SignableMessage => {
      if (typeof message === 'string') {
        return message
      }

      return {
        raw: message.personalSign as `0x${string}` | ByteArray,
      }
    }

    // Sign using EVM wallet (returns 65-byte signature: r + s + v)
    const signature = await wagmiSignMessage(wagmiConfig, {
      message: getMessage(),
    })

    // Keep only r + s (first 64 bytes) for FuelVM
    const compactSignature = signatureToCompactSignature(
      parseSignature(signature)
    )

    const signatureBytes = concat([compactSignature.r, compactSignature.yParityAndS])
    // Convert Uint8Array to hex string
    return `0x${Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('')}`
  }
}
