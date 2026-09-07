/**
 * Core TypeScript definitions for Ephemeral P2P Messenger.
 */

export type Language = 'fr' | 'en' | 'es';

export type MediaType = 'text' | 'audio' | 'image' | 'video';

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  publicKeyHex: string;
  fingerprint: string;
}

export interface EncryptedPayload {
  version: 1;
  ephemeralPublicKeyHex: string; // 32 bytes hex for Perfect Forward Secrecy
  nonceHex: string;              // 24 bytes hex
  ciphertextHex: string;         // Encrypted message payload
  senderPublicKeyHex: string;    // Sender's permanent contact public key
  recipientPublicKeyHex?: string;// Recipient's target public key
  timestamp: number;
}

export interface EphemeralMessageContent {
  id: string;
  type: MediaType;
  text?: string;
  mediaBase64?: string; // volatile in-memory base64 or object URL
  mediaMimeType?: string;
  mediaDuration?: number; // seconds (for audio/video)
  mediaFileName?: string;
  createdAt: number;
}

export type MessageStatus = 
  | 'sending'
  | 'sent'
  | 'received_sealed'   // Unopened, waiting for recipient to tap to decrypt
  | 'opened_counting'   // Plaintext revealed, 60-second countdown in progress
  | 'burned_purged';    // Scrubbed from RAM, cleared from DOM

export interface MessageRecord {
  id: string;
  senderKeyHex: string;
  recipientKeyHex: string;
  isOutgoing: boolean;
  status: MessageStatus;
  timestamp: number;
  // Raw encrypted payload (can be stored in volatile RAM until destructed)
  encryptedPayload?: EncryptedPayload;
  // Volatile decrypted payload (wiped with zeroes when timer reaches 0)
  decryptedContent?: EphemeralMessageContent | null;
  // Countdown remaining in seconds (starts at 60)
  remainingSeconds: number;
  openedAt?: number;
  burnProgress: number; // 0 to 1
}

export type TransportLayer = 'webrtc' | 'mesh_relay' | 'nostr_relay' | 'local_broadcast';

export interface ActivePeer {
  publicKeyHex: string;
  fingerprint: string;
  nickname?: string;
  connected: boolean;
  activeTransport: TransportLayer;
  lastSeen?: number;
  latencyMs?: number;
}

export interface SignalingMessage {
  type: 
    | 'webrtc_offer' 
    | 'webrtc_answer' 
    | 'ice_candidate' 
    | 'handshake_ping' 
    | 'handshake_ack' 
    | 'direct_message' 
    | 'remote_burn' 
    | 'ping' 
    | 'pong';
  fromKeyHex: string;
  toKeyHex: string;
  payload: any;
  timestamp: number;
}
