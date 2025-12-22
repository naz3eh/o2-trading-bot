/**
 * Encryption utilities using Web Crypto API
 * Uses AES-GCM for encryption and PBKDF2 for key derivation
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits for GCM
const SALT_LENGTH = 16
const PBKDF2_ITERATIONS = 100000

/**
 * Derive a key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  )

  // Create a new Uint8Array with ArrayBuffer backing to satisfy type requirements
  const saltBuffer = new Uint8Array(salt.buffer as ArrayBuffer)
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

/**
 * Generate a random IV
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

/**
 * Encrypt data with a password
 */
export async function encrypt(
  data: string,
  password: string,
): Promise<{ encryptedData: string; salt: string; iv: string }> {
  const salt = generateSalt()
  const iv = generateIV()
  const key = await deriveKey(password, salt)

  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: new Uint8Array(iv.buffer as ArrayBuffer),
    },
    key,
    dataBuffer,
  )

  // Convert to base64 for storage
  const encryptedData = arrayBufferToBase64(encryptedBuffer)
  const saltBase64 = arrayBufferToBase64(salt.buffer as ArrayBuffer)
  const ivBase64 = arrayBufferToBase64(iv.buffer as ArrayBuffer)

  return {
    encryptedData,
    salt: saltBase64,
    iv: ivBase64,
  }
}

/**
 * Decrypt data with a password
 */
export async function decrypt(
  encryptedData: string,
  password: string,
  salt: string,
  iv: string,
): Promise<string> {
  const saltBuffer = base64ToArrayBuffer(salt)
  const ivBuffer = base64ToArrayBuffer(iv)
  const encryptedBuffer = base64ToArrayBuffer(encryptedData)

  const key = await deriveKey(password, new Uint8Array(saltBuffer))

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: new Uint8Array(ivBuffer),
    },
    key,
    encryptedBuffer,
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

