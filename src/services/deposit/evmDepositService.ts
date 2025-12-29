import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
  getBalance,
  switchChain,
  getChainId,
  estimateGas,
  getGasPrice,
} from 'wagmi/actions'
import { base, mainnet, sepolia, baseSepolia } from 'wagmi/chains'
import { wagmiConfig } from '../walletService'
import { messengerAbi } from '../../abi/messengerAbi'
import { erc20Abi } from '../../abi/erc20PermitAbi'
import { signPermit, supportsPermit } from '../../utils/signPermit'
import {
  NATIVE_ETH,
  GAS_ESTIMATE_MULTIPLIER,
  GAS_PRICE_MULTIPLIER,
  PERMIT_DEADLINE_SECONDS,
} from '../../constants/depositConstants'
import type {
  CheckAllowanceParams,
  ApproveTokenParams,
  PermitSignature,
  EvmDepositParams,
} from '../../types/deposit'

// Valid chain IDs from wagmi config
type ValidChainId = typeof mainnet.id | typeof base.id | typeof sepolia.id | typeof baseSepolia.id

// Type assertion helper for chain IDs
function asChainId(chainId: number): ValidChainId {
  return chainId as ValidChainId
}

class EvmDepositService {
  // Check if the messenger contract is paused
  async checkContractPaused(
    chainId: number,
    messengerAddress: `0x${string}`
  ): Promise<boolean> {
    const paused = await readContract(wagmiConfig, {
      address: messengerAddress,
      abi: messengerAbi,
      functionName: 'paused',
      chainId: asChainId(chainId),
    })
    return paused as boolean
  }

  // Get ETH balance
  async getEthBalance(chainId: number, account: `0x${string}`): Promise<bigint> {
    const balance = await getBalance(wagmiConfig, {
      address: account,
      chainId: asChainId(chainId),
    })
    return balance.value
  }

  // Get ERC20 token balance
  async getTokenBalance(
    chainId: number,
    tokenAddress: `0x${string}`,
    account: `0x${string}`
  ): Promise<bigint> {
    const balance = await readContract(wagmiConfig, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account],
      chainId: asChainId(chainId),
    })
    return balance as bigint
  }

  // Check token allowance
  async checkAllowance(params: CheckAllowanceParams): Promise<bigint> {
    const { chainId, tokenAddress, ownerAddress, spenderAddress } = params

    const allowance = await readContract(wagmiConfig, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ownerAddress, spenderAddress],
      chainId: asChainId(chainId),
    })

    return allowance as bigint
  }

  // Approve token spending
  async approveToken(
    params: ApproveTokenParams
  ): Promise<{ txHash: `0x${string}`; allowance: bigint }> {
    const { chainId, tokenAddress, spenderAddress, amount } = params

    // Use max uint256 for unlimited approval
    const approvalAmount =
      amount > 0n
        ? amount
        : BigInt(
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
          )

    const txHash = await writeContract(wagmiConfig, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress, approvalAmount],
      chainId: asChainId(chainId),
    })

    // Wait for confirmation
    await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      chainId: asChainId(chainId),
    })

    return { txHash, allowance: approvalAmount }
  }

  // Sign permit (EIP-2612)
  async signPermitSignature(
    chainId: number,
    tokenAddress: `0x${string}`,
    ownerAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
  ): Promise<PermitSignature> {
    const deadline = BigInt(Math.floor(Date.now() / 1000)) + PERMIT_DEADLINE_SECONDS

    return signPermit({
      chainId,
      tokenAddress,
      ownerAddress,
      spenderAddress,
      amount,
      deadline,
    })
  }

  // Check if token supports permit
  async tokenSupportsPermit(
    chainId: number,
    tokenAddress: `0x${string}`
  ): Promise<boolean> {
    return supportsPermit(chainId, tokenAddress)
  }

  // Switch to the correct network
  async switchNetwork(chainId: number): Promise<void> {
    const currentChainId = await getChainId(wagmiConfig)
    if (currentChainId !== chainId) {
      await switchChain(wagmiConfig, { chainId: asChainId(chainId) })
    }
  }

  // Estimate gas for ETH deposit
  async estimateDepositEthGas(
    messengerAddress: `0x${string}`,
    recipient: `0x${string}`,
    amount: bigint,
    chainId: number
  ): Promise<bigint> {
    const gasEstimate = await estimateGas(wagmiConfig, {
      to: messengerAddress,
      value: amount,
      data: '0x', // Will be filled by contract call
      chainId: asChainId(chainId),
    })

    const gasPrice = await getGasPrice(wagmiConfig, { chainId: asChainId(chainId) })
    const scaledGasEstimate = gasEstimate * GAS_ESTIMATE_MULTIPLIER
    const scaledGasPrice = BigInt(Math.floor(Number(gasPrice) * GAS_PRICE_MULTIPLIER))

    return scaledGasEstimate * scaledGasPrice
  }

  // Deposit native ETH
  async depositEth(params: EvmDepositParams): Promise<`0x${string}`> {
    const { chainId, messengerAddress, recipient, amount } = params

    const txHash = await writeContract(wagmiConfig, {
      address: messengerAddress,
      abi: messengerAbi,
      functionName: 'depositETH',
      args: [recipient, true], // recipientIsContract = true for trading account
      value: amount,
      chainId: asChainId(chainId),
    })

    return txHash
  }

  // Deposit token with regular approval
  async depositToken(params: EvmDepositParams): Promise<`0x${string}`> {
    const { chainId, messengerAddress, recipient, tokenAddress, amount } = params

    const txHash = await writeContract(wagmiConfig, {
      address: messengerAddress,
      abi: messengerAbi,
      functionName: 'deposit',
      args: [recipient, tokenAddress, amount, true], // recipientIsContract = true
      chainId: asChainId(chainId),
    })

    return txHash
  }

  // Deposit token with permit (gasless approval)
  async depositWithPermit(
    params: EvmDepositParams & { permitSignature: PermitSignature }
  ): Promise<`0x${string}`> {
    const {
      chainId,
      messengerAddress,
      recipient,
      tokenAddress,
      amount,
      permitSignature,
    } = params

    const txHash = await writeContract(wagmiConfig, {
      address: messengerAddress,
      abi: messengerAbi,
      functionName: 'depositWithPermit',
      args: [
        recipient,
        tokenAddress,
        amount,
        permitSignature.deadline,
        permitSignature.v,
        permitSignature.r,
        permitSignature.s,
        true, // recipientIsContract
      ],
      chainId: asChainId(chainId),
    })

    return txHash
  }

  // Wait for transaction confirmation
  async waitForTransaction(
    txHash: `0x${string}`,
    chainId: number
  ): Promise<void> {
    await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      chainId: asChainId(chainId),
    })
  }

  // Get balance based on whether it's native ETH or a token
  async getBalance(
    chainId: number,
    tokenAddress: `0x${string}`,
    account: `0x${string}`
  ): Promise<bigint> {
    if (tokenAddress.toLowerCase() === NATIVE_ETH.toLowerCase()) {
      return this.getEthBalance(chainId, account)
    }
    return this.getTokenBalance(chainId, tokenAddress, account)
  }

  // Check if needs approval (returns true if allowance < amount)
  async needsApproval(
    chainId: number,
    tokenAddress: `0x${string}`,
    ownerAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: bigint
  ): Promise<boolean> {
    // Native ETH doesn't need approval
    if (tokenAddress.toLowerCase() === NATIVE_ETH.toLowerCase()) {
      return false
    }

    const allowance = await this.checkAllowance({
      chainId,
      tokenAddress,
      ownerAddress,
      spenderAddress,
    })

    return allowance < amount
  }
}

export const evmDepositService = new EvmDepositService()
