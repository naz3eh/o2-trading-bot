import { signTypedData, readContract } from 'wagmi/actions'
import { base, mainnet, sepolia, baseSepolia } from 'wagmi/chains'
import { wagmiConfig } from '../services/walletService'
import { erc20Abi } from '../abi/erc20PermitAbi'
import type { PermitSignature, SignPermitParams } from '../types/deposit'

// Valid chain IDs from wagmi config
type ValidChainId = typeof mainnet.id | typeof base.id | typeof sepolia.id | typeof baseSepolia.id

// Type assertion helper for chain IDs
function asChainId(chainId: number): ValidChainId {
  return chainId as ValidChainId
}

interface PermitDomain {
  name: string
  version: string
  chainId: number
  verifyingContract: `0x${string}`
}

// Sign an EIP-2612 permit for token approval
export async function signPermit(
  params: SignPermitParams
): Promise<PermitSignature> {
  const { chainId, tokenAddress, ownerAddress, spenderAddress, amount, deadline } =
    params

  // Get token name for domain
  const tokenName = await readContract(wagmiConfig, {
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'name',
    chainId: asChainId(chainId),
  })

  // Get nonce for owner
  const nonce = await readContract(wagmiConfig, {
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'nonces',
    args: [ownerAddress],
    chainId: asChainId(chainId),
  })

  // Construct the domain
  const domain: PermitDomain = {
    name: tokenName as string,
    version: '1',
    chainId,
    verifyingContract: tokenAddress,
  }

  // Construct the permit message
  const message = {
    owner: ownerAddress,
    spender: spenderAddress,
    value: amount,
    nonce: nonce as bigint,
    deadline,
  }

  // Sign the typed data
  const signature = await signTypedData(wagmiConfig, {
    domain,
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message,
  })

  // Parse the signature into r, s, v components
  const r = `0x${signature.slice(2, 66)}` as `0x${string}`
  const s = `0x${signature.slice(66, 130)}` as `0x${string}`
  const v = parseInt(signature.slice(130, 132), 16)

  return {
    r,
    s,
    v,
    deadline,
  }
}

// Check if a token supports EIP-2612 permit
export async function supportsPermit(
  chainId: number,
  tokenAddress: `0x${string}`
): Promise<boolean> {
  try {
    // Try to call DOMAIN_SEPARATOR - if it exists, token likely supports permit
    await readContract(wagmiConfig, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'DOMAIN_SEPARATOR',
      chainId: asChainId(chainId),
    })
    return true
  } catch {
    return false
  }
}
