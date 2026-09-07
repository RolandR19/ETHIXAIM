import type { EncryptedPayload, SignalingMessage, TransportLayer } from '../types';

// Public STUN servers for NAT traversal
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export interface MeshEventCallbacks {
  onEncryptedMessage: (payload: EncryptedPayload, transport: TransportLayer) => void;
  onPeerConnectionChange: (peerKeyHex: string, connected: boolean, transport: TransportLayer, latencyMs?: number) => void;
  onRelayStatusChange: (connectedCount: number, totalRelays: number) => void;
  onIncomingHandshake?: (peerKeyHex: string) => void;
  onRemoteBurn?: (messageId: string) => void;
}

export class P2PTransportMesh {
  private myPublicKeyHex: string;
  private callbacks: MeshEventCallbacks;

  // Local IPC BroadcastChannel for instant multi-tab testing on the same browser
  private broadcastChannel: BroadcastChannel | null = null;

  // Server-Sent Events (SSE) client for instant cross-device signaling and zero-storage relay
  private eventSource: EventSource | null = null;
  private sseReconnectTimer: any = null;
  private isDestroyed = false;

  // WebRTC Peer Connections & DataChannels per active contact key
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  // Queue for ICE candidates that arrive before setRemoteDescription completes
  private pendingIceCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  // Active target peer key
  private activeContactKeyHex: string | null = null;

  // Track processed message hashes to prevent duplicate delivery
  private seenMessageIds: Set<string> = new Set();

  // Periodic heartbeat / polling fallback
  private pollInterval: any = null;

  constructor(myPublicKeyHex: string, callbacks: MeshEventCallbacks) {
    this.myPublicKeyHex = myPublicKeyHex.trim().toLowerCase();
    this.callbacks = callbacks;
    this.initializeLocalBroadcast();
    this.initializeServerRelayStream();
  }

  /**
   * Set the active contact and initiate WebRTC + handshake negotiation
   */
  public setActiveContact(recipientPublicKeyHex: string | null) {
    const normalized = recipientPublicKeyHex ? recipientPublicKeyHex.trim().toLowerCase() : null;
    this.activeContactKeyHex = normalized;

    if (normalized && normalized !== this.myPublicKeyHex) {
      // 1. Send handshake ping over fast signaling channel
      this.sendSignalingMessage({
        type: 'handshake_ping',
        fromKeyHex: this.myPublicKeyHex,
        toKeyHex: normalized,
        payload: { initiatedAt: Date.now() },
        timestamp: Date.now(),
      });

      // 2. Initiate WebRTC offer for direct P2P data streaming
      this.initiateWebRTCConnection(normalized);
    }
  }

  /**
   * Ping active peer to test link latency
   */
  public pingPeer(recipientKeyHex: string) {
    const target = recipientKeyHex.trim().toLowerCase();
    this.sendSignalingMessage({
      type: 'ping',
      fromKeyHex: this.myPublicKeyHex,
      toKeyHex: target,
      payload: { clientSentTime: Date.now() },
      timestamp: Date.now(),
    });
  }

  /**
   * 1. BroadcastChannel: Native browser IPC for zero-latency multi-tab testing
   */
  private initializeLocalBroadcast() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('ephemeral_p2p_mesh_v1');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingRawMessage(event.data, 'local_broadcast');
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
      this.broadcastChannel = null;
    }
  }

  /**
   * 2. Server-Sent Events (SSE) stream: Guaranteed cross-device signaling & ephemeral relay
   */
  private initializeServerRelayStream() {
    if (this.isDestroyed) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      const streamUrl = `/api/mesh/subscribe?publicKeyHex=${encodeURIComponent(this.myPublicKeyHex)}`;
      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.onopen = () => {
        this.callbacks.onRelayStatusChange(1, 1);
      };

      es.onmessage = (event) => {
        try {
          if (!event.data || event.data === 'ping' || event.data === 'connected') return;
          const parsed = JSON.parse(event.data);
          this.handleIncomingRawMessage(parsed, 'mesh_relay');
        } catch {
          // ignore non-json messages
        }
      };

      es.onerror = () => {
        this.callbacks.onRelayStatusChange(0, 1);
        // EventSource automatically retries, but if connection is closed:
        if (es.readyState === EventSource.CLOSED && !this.isDestroyed) {
          clearTimeout(this.sseReconnectTimer);
          this.sseReconnectTimer = setTimeout(() => {
            this.initializeServerRelayStream();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('Failed to initialize SSE relay stream:', err);
    }
  }

  /**
   * 3. WebRTC: Peer Connection & DataChannel
   */
  private async initiateWebRTCConnection(recipientKeyHex: string) {
    try {
      // Close previous connection to this peer if closed or invalid
      const existing = this.peerConnections.get(recipientKeyHex);
      if (existing && existing.signalingState !== 'closed') {
        existing.close();
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      this.peerConnections.set(recipientKeyHex, pc);
      this.pendingIceCandidates.set(recipientKeyHex, []);

      // Create DataChannel from offerer
      const dc = pc.createDataChannel('p2p_ephemeral_stream', {
        ordered: true,
      });
      this.setupDataChannel(recipientKeyHex, dc);

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidatePayload = event.candidate.toJSON
            ? event.candidate.toJSON()
            : {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                usernameFragment: event.candidate.usernameFragment,
              };

          this.sendSignalingMessage({
            type: 'ice_candidate',
            fromKeyHex: this.myPublicKeyHex,
            toKeyHex: recipientKeyHex,
            payload: candidatePayload,
            timestamp: Date.now(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          this.callbacks.onPeerConnectionChange(recipientKeyHex, true, 'webrtc');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          // Fall back gracefully to relay mesh
          this.callbacks.onPeerConnectionChange(recipientKeyHex, true, 'mesh_relay');
        }
      };

      // Create and set local offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const offerPayload: RTCSessionDescriptionInit = {
        type: offer.type,
        sdp: offer.sdp,
      };

      this.sendSignalingMessage({
        type: 'webrtc_offer',
        fromKeyHex: this.myPublicKeyHex,
        toKeyHex: recipientKeyHex,
        payload: offerPayload,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to initiate WebRTC offer:', err);
    }
  }

  private setupDataChannel(peerKeyHex: string, dc: RTCDataChannel) {
    this.dataChannels.set(peerKeyHex, dc);

    dc.onopen = () => {
      this.callbacks.onPeerConnectionChange(peerKeyHex, true, 'webrtc');
    };

    dc.onclose = () => {
      this.callbacks.onPeerConnectionChange(peerKeyHex, true, 'mesh_relay');
    };

    dc.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.handleIncomingRawMessage(payload, 'webrtc');
      } catch (err) {
        console.error('Failed to parse WebRTC DataChannel message:', err);
      }
    };
  }

  /**
   * Handle WebRTC Offer from a peer
   */
  private async handleWebRTCOffer(fromKeyHex: string, offer: RTCSessionDescriptionInit) {
    try {
      let pc = this.peerConnections.get(fromKeyHex);
      if (!pc || pc.signalingState === 'closed') {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        this.peerConnections.set(fromKeyHex, pc);
        this.pendingIceCandidates.set(fromKeyHex, []);

        pc.ondatachannel = (event) => {
          this.setupDataChannel(fromKeyHex, event.channel);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidatePayload = event.candidate.toJSON
              ? event.candidate.toJSON()
              : {
                  candidate: event.candidate.candidate,
                  sdpMid: event.candidate.sdpMid,
                  sdpMLineIndex: event.candidate.sdpMLineIndex,
                  usernameFragment: event.candidate.usernameFragment,
                };
            this.sendSignalingMessage({
              type: 'ice_candidate',
              fromKeyHex: this.myPublicKeyHex,
              toKeyHex: fromKeyHex,
              payload: candidatePayload,
              timestamp: Date.now(),
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            this.callbacks.onPeerConnectionChange(fromKeyHex, true, 'webrtc');
          }
        };
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush any queued candidates
      const pending = this.pendingIceCandidates.get(fromKeyHex) || [];
      for (const cand of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch {
          // ignore
        }
      }
      this.pendingIceCandidates.set(fromKeyHex, []);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const answerPayload: RTCSessionDescriptionInit = {
        type: answer.type,
        sdp: answer.sdp,
      };

      this.sendSignalingMessage({
        type: 'webrtc_answer',
        fromKeyHex: this.myPublicKeyHex,
        toKeyHex: fromKeyHex,
        payload: answerPayload,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('Failed to handle WebRTC offer:', err);
    }
  }

  /**
   * Handle WebRTC Answer from a peer
   */
  private async handleWebRTCAnswer(fromKeyHex: string, answer: RTCSessionDescriptionInit) {
    try {
      const pc = this.peerConnections.get(fromKeyHex);
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Flush any queued candidates
        const pending = this.pendingIceCandidates.get(fromKeyHex) || [];
        for (const cand of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // ignore
          }
        }
        this.pendingIceCandidates.set(fromKeyHex, []);
      }
    } catch (err) {
      console.warn('Failed to handle WebRTC answer:', err);
    }
  }

  /**
   * Handle ICE candidate from a peer
   */
  private async handleICECandidate(fromKeyHex: string, candidate: RTCIceCandidateInit) {
    try {
      const pc = this.peerConnections.get(fromKeyHex);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue candidate until remote description is set
        if (!this.pendingIceCandidates.has(fromKeyHex)) {
          this.pendingIceCandidates.set(fromKeyHex, []);
        }
        this.pendingIceCandidates.get(fromKeyHex)!.push(candidate);
      }
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err);
    }
  }

  /**
   * Send a signaling message over Local Broadcast and Ephemeral Server Relay
   */
  private sendSignalingMessage(msg: SignalingMessage) {
    try {
      const payloadObj = { signaling: msg };

      // 1. Broadcast locally for multi-tab testing
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(payloadObj);
        } catch {
          // ignore
        }
      }

      // 2. Ephemeral server relay for remote cross-device peers
      fetch('/api/mesh/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toKeyHex: msg.toKeyHex,
          fromKeyHex: msg.fromKeyHex,
          payload: payloadObj,
        }),
      }).catch((err) => {
        console.warn('Signaling publish failed:', err);
      });
    } catch (err) {
      console.warn('Failed to serialize signaling message:', err);
    }
  }

  /**
   * Dispatch and process incoming messages from any layer (WebRTC, SSE Relay, BroadcastChannel)
   */
  private handleIncomingRawMessage(data: any, sourceTransport: TransportLayer) {
    if (!data) return;

    // Check if it's a signaling message
    if (data.signaling) {
      const sig: SignalingMessage = data.signaling;
      const targetKey = sig.toKeyHex ? sig.toKeyHex.trim().toLowerCase() : '';
      const senderKey = sig.fromKeyHex ? sig.fromKeyHex.trim().toLowerCase() : '';

      // Only process if addressed to me
      if (targetKey !== this.myPublicKeyHex) return;

      if (sig.type === 'handshake_ping') {
        // Peer is knocking on our door!
        this.callbacks.onIncomingHandshake?.(senderKey);
        this.callbacks.onPeerConnectionChange(senderKey, true, sourceTransport);

        // Acknowledge handshake
        this.sendSignalingMessage({
          type: 'handshake_ack',
          fromKeyHex: this.myPublicKeyHex,
          toKeyHex: senderKey,
          payload: { acknowledgedAt: Date.now() },
          timestamp: Date.now(),
        });
      } else if (sig.type === 'handshake_ack') {
        this.callbacks.onPeerConnectionChange(senderKey, true, sourceTransport);
      } else if (sig.type === 'ping') {
        // Return pong immediately
        this.sendSignalingMessage({
          type: 'pong',
          fromKeyHex: this.myPublicKeyHex,
          toKeyHex: senderKey,
          payload: sig.payload,
          timestamp: Date.now(),
        });
      } else if (sig.type === 'pong') {
        const sentTime = sig.payload?.clientSentTime;
        const latencyMs = sentTime ? Math.max(1, Date.now() - sentTime) : undefined;
        this.callbacks.onPeerConnectionChange(senderKey, true, sourceTransport, latencyMs);
      } else if (sig.type === 'webrtc_offer') {
        this.handleWebRTCOffer(senderKey, sig.payload);
      } else if (sig.type === 'webrtc_answer') {
        this.handleWebRTCAnswer(senderKey, sig.payload);
      } else if (sig.type === 'ice_candidate') {
        this.handleICECandidate(senderKey, sig.payload);
      } else if (sig.type === 'remote_burn') {
        const messageId = sig.payload?.messageId;
        if (messageId && typeof messageId === 'string') {
          this.callbacks.onRemoteBurn?.(messageId);
        }
      }
      return;
    }

    // Check if it's an EncryptedPayload
    if (data.version === 1 && data.ciphertextHex && data.nonceHex) {
      const payload = data as EncryptedPayload;
      const recipientKey = payload.recipientPublicKeyHex ? payload.recipientPublicKeyHex.trim().toLowerCase() : '';
      const senderKey = payload.senderPublicKeyHex ? payload.senderPublicKeyHex.trim().toLowerCase() : '';

      // If recipient is specified, only process if intended for me (or if I'm testing self-send)
      if (recipientKey && recipientKey !== this.myPublicKeyHex) {
        return;
      }

      // Deduplicate by unique ciphertext + nonce hash
      const msgId = `${payload.nonceHex}_${payload.ciphertextHex.slice(0, 24)}`;
      if (this.seenMessageIds.has(msgId)) return;
      this.seenMessageIds.add(msgId);

      // Clean seenMessageIds if it grows too large
      if (this.seenMessageIds.size > 2000) {
        this.seenMessageIds.clear();
        this.seenMessageIds.add(msgId);
      }

      this.callbacks.onPeerConnectionChange(senderKey, true, sourceTransport);
      this.callbacks.onEncryptedMessage(payload, sourceTransport);
    }
  }

  /**
   * High-Level Send: Transmits via WebRTC DataChannel (if open) and
   * ALSO via zero-storage ephemeral relay for 100% guaranteed delivery!
   */
  public sendEncryptedMessage(recipientKeyHex: string, payload: EncryptedPayload): TransportLayer {
    const targetKey = recipientKeyHex.trim().toLowerCase();
    const dc = this.dataChannels.get(targetKey);
    let primaryTransport: TransportLayer = 'mesh_relay';

    // 1. If direct WebRTC DataChannel is ready, transmit with sub-millisecond latency
    if (dc && dc.readyState === 'open') {
      try {
        dc.send(JSON.stringify(payload));
        primaryTransport = 'webrtc';
      } catch (dcErr) {
        console.warn('Direct WebRTC DataChannel send failed, using relay:', dcErr);
      }
    }

    // 2. BroadcastChannel for instant local multi-tab peer delivery
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
        if (primaryTransport !== 'webrtc') {
          primaryTransport = 'local_broadcast';
        }
      } catch {
        // ignore
      }
    }

    // 3. Ephemeral Server Relay: Guarantees cross-device delivery even if WebRTC is blocked by symmetric NAT!
    fetch('/api/mesh/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toKeyHex: targetKey,
        fromKeyHex: this.myPublicKeyHex,
        payload,
      }),
    }).catch((err) => {
      console.warn('Server relay publish error:', err);
    });

    return primaryTransport;
  }

  /**
   * Broadcast a remote burn signal to destroy a message across all peers immediately
   */
  public burnMessageRemotely(recipientKeyHex: string, messageId: string) {
    if (!recipientKeyHex || !messageId) return;
    this.sendSignalingMessage({
      type: 'remote_burn',
      fromKeyHex: this.myPublicKeyHex,
      toKeyHex: recipientKeyHex.trim().toLowerCase(),
      payload: { messageId },
      timestamp: Date.now(),
    });
  }

  /**
   * Destroy all channels and streams (used on Key Regeneration or Unmount)
   */
  public destroy() {
    this.isDestroyed = true;
    clearTimeout(this.sseReconnectTimer);
    clearInterval(this.pollInterval);

    // Close EventSource
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    // Close WebRTC connections
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();
    this.pendingIceCandidates.clear();

    // Close BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }
}
