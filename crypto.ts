import nacl from 'tweetnacl';
import type { KeyPair, EncryptedPayload, EphemeralMessageContent } from '../types';

/**
 * Utility: Convert Uint8Array to Hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Utility: Convert Hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.trim().replace(/^0x/i, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Utility: String to UTF-8 Uint8Array
 */
export function stringToUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Utility: UTF-8 Uint8Array to String
 */
export function uint8ToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Derive a human-readable 16-character cryptographic fingerprint from a public key.
 * Format: XXXX-XXXX-XXXX-XXXX
 */
export function deriveFingerprint(publicKeyHex: string): string {
  const clean = publicKeyHex.replace(/^0x/i, '').toUpperCase();
  if (clean.length < 16) return clean;
  const p1 = clean.substring(0, 4);
  const p2 = clean.substring(4, 8);
  const p3 = clean.substring(8, 12);
  const p4 = clean.substring(12, 16);
  return `${p1}-${p2}-${p3}-${p4}`;
}

/**
 * Generate a new X25519 asymmetric keypair locally in memory.
 */
export function generateKeyPair(): KeyPair {
  const boxKeyPair = nacl.box.keyPair();
  const publicKeyHex = uint8ArrayToHex(boxKeyPair.publicKey);
  const fingerprint = deriveFingerprint(publicKeyHex);

  return {
    publicKey: boxKeyPair.publicKey,
    secretKey: boxKeyPair.secretKey,
    publicKeyHex,
    fingerprint,
  };
}

/**
 * Validates whether a given string is a valid 32-byte (64 hex characters) public key.
 */
export function isValidPublicKey(hexKey: string): boolean {
  if (!hexKey) return false;
  const clean = hexKey.trim().replace(/^0x/i, '');
  return /^[0-9a-fA-F]{64}$/.test(clean);
}

/**
 * Asymmetric Encryption using Curve25519 (X25519) and XSalsa20-Poly1305.
 * Employs Perfect Forward Secrecy (PFS): creates a fresh one-time ephemeral keypair
 * for each message so that even if persistent keys are later compromised,
 * previously recorded messages cannot be decrypted.
 */
export function encryptMessage(
  content: EphemeralMessageContent,
  recipientPublicKeyHex: string,
  senderPermanentPublicKeyHex: string
): EncryptedPayload {
  const recipientPubKey = hexToUint8Array(recipientPublicKeyHex);
  if (recipientPubKey.length !== 32) {
    throw new Error('Recipient public key must be 32 bytes (64 hex characters)');
  }

  // 1. Generate one-time ephemeral keypair for forward secrecy
  const ephemeralPair = nacl.box.keyPair();

  // 2. Generate random 24-byte nonce
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  // 3. Serialize message content to JSON and encode to bytes
  const serialized = JSON.stringify(content);
  const messageBytes = stringToUint8(serialized);

  // 4. Encrypt with ephemeral secret key and recipient's public key
  const ciphertext = nacl.box(messageBytes, nonce, recipientPubKey, ephemeralPair.secretKey);

  // 5. Zero out the ephemeral secret key from memory immediately
  ephemeralPair.secretKey.fill(0);

  return {
    version: 1,
    ephemeralPublicKeyHex: uint8ArrayToHex(ephemeralPair.publicKey),
    nonceHex: uint8ArrayToHex(nonce),
    ciphertextHex: uint8ArrayToHex(ciphertext),
    senderPublicKeyHex: senderPermanentPublicKeyHex.toLowerCase(),
    recipientPublicKeyHex: recipientPublicKeyHex.toLowerCase(),
    timestamp: Date.now(),
  };
}

/**
 * Decrypts an incoming message using recipient's private key and the message's ephemeral public key.
 */
export function decryptMessage(
  payload: EncryptedPayload,
  mySecretKey: Uint8Array
): EphemeralMessageContent {
  const ephemeralPubKey = hexToUint8Array(payload.ephemeralPublicKeyHex);
  const nonce = hexToUint8Array(payload.nonceHex);
  const ciphertext = hexToUint8Array(payload.ciphertextHex);

  const decryptedBytes = nacl.box.open(ciphertext, nonce, ephemeralPubKey, mySecretKey);

  if (!decryptedBytes) {
    throw new Error('Decryption failed: Message is corrupted, forged, or encrypted for a different key.');
  }

  const jsonString = uint8ToString(decryptedBytes);
  
  // Wipe decrypted temporary bytes immediately after decoding
  decryptedBytes.fill(0);

  const content: EphemeralMessageContent = JSON.parse(jsonString);
  return content;
}

/**
 * Securely overwrites volatile memory for strings or Uint8Arrays.
 */
export function secureScrub(data: Uint8Array | null | undefined): void {
  if (!data) return;
  try {
    data.fill(0);
  } catch {
    // Ignore if non-writable
  }
}

/**
 * Safely extracts a 64-character hexadecimal public key from scanned QR code data,
 * handling raw hex strings, URLs with key queries or hashes, or JSON payloads.
 */
export function extractPublicKeyFromText(rawText: string): string | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // 1. Direct 64-char hex string (with or without 0x prefix)
  const stripped = trimmed.replace(/^0x/i, '');
  if (isValidPublicKey(stripped)) {
    return stripped.toLowerCase();
  }

  // 2. Try JSON payload
  try {
    const parsed = JSON.parse(trimmed);
    const candidate = parsed.publicKeyHex || parsed.publicKey || parsed.key;
    if (typeof candidate === 'string') {
      const cleanCandidate = candidate.trim().replace(/^0x/i, '');
      if (isValidPublicKey(cleanCandidate)) {
        return cleanCandidate.toLowerCase();
      }
    }
  } catch {
    // Not JSON
  }

  // 3. Search for 64-character hex sequence in URL/URI format
  const hexMatch = trimmed.match(/[0-9a-fA-F]{64}/);
  if (hexMatch && isValidPublicKey(hexMatch[0])) {
    return hexMatch[0].toLowerCase();
  }

  return null;
}
