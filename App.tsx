import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Lock, 
  Flame, 
  ExternalLink, 
  QrCode,
  Sparkles,
  Info,
  Radio,
  HelpCircle
} from 'lucide-react';
import type { KeyPair, ActivePeer, MessageRecord, MediaType, EncryptedPayload, TransportLayer, Language } from './types';
import { generateKeyPair, encryptMessage, decryptMessage, deriveFingerprint, secureScrub } from './lib/crypto';
import { P2PTransportMesh } from './lib/transport';
import { playSendSound, playReceiveSound, playBurnSound } from './lib/sounds';
import { KeyManagerModal } from './components/KeyManagerModal';
import { AddContactModal } from './components/AddContactModal';
import { MediaRecorderModal } from './components/MediaRecorderModal';
import { EphemeralMessageItem } from './components/EphemeralMessageItem';
import { ActiveContactHeader } from './components/ActiveContactHeader';
import { MessageComposer } from './components/MessageComposer';
import { GuideModal } from './components/GuideModal';

export default function App() {
  // 0. Selected Language: English ('en') by default, French ('fr'), or Spanish ('es')
  const [lang, setLang] = useState<Language>('en');

  // 1. Ephemeral In-Memory Identity (Never written to LocalStorage / IndexedDB)
  const [keyPair, setKeyPair] = useState<KeyPair>(() => generateKeyPair());
  const keyPairRef = useRef<KeyPair>(keyPair);
  keyPairRef.current = keyPair;

  // 2. Active Contact Chamber (Strictly 1-on-1 isolated)
  const [activePeer, setActivePeer] = useState<ActivePeer | null>(null);
  const activePeerRef = useRef<ActivePeer | null>(null);
  activePeerRef.current = activePeer;

  // 3. Volatile Messages in RAM
  const [messages, setMessages] = useState<MessageRecord[]>([]);

  // 4. Transport Mesh State
  const transportRef = useRef<P2PTransportMesh | null>(null);
  const burnMessageCallbackRef = useRef<(messageId: string, broadcast?: boolean) => void>(() => {});
  const [relayStatus, setRelayStatus] = useState<{ connected: number; total: number }>({
    connected: 0,
    total: 3,
  });

  // Modals state
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [addContactModal, setAddContactModal] = useState<{
    isOpen: boolean;
    tab: 'scan' | 'paste';
  }>({
    isOpen: false,
    tab: 'scan',
  });
  const [mediaModalState, setMediaModalState] = useState<{
    isOpen: boolean;
    mode: 'audio' | 'camera' | 'upload';
  }>({
    isOpen: false,
    mode: 'audio',
  });

  const [topKeyCopied, setTopKeyCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // -------------------------------------------------------------------
  // Initialize Transport Layer
  // -------------------------------------------------------------------
  const initializeTransport = useCallback((currentKeyPair: KeyPair) => {
    if (transportRef.current) {
      transportRef.current.destroy();
    }

    const mesh = new P2PTransportMesh(currentKeyPair.publicKeyHex, {
      onEncryptedMessage: (payload: EncryptedPayload, transport: TransportLayer) => {
        playReceiveSound();
        const senderKey = payload.senderPublicKeyHex.toLowerCase();

        // Auto-open or verify active peer
        const currentActive = activePeerRef.current;
        if (!currentActive) {
          // Open chamber with sender
          setActivePeer({
            publicKeyHex: senderKey,
            fingerprint: deriveFingerprint(senderKey),
            connected: true,
            activeTransport: transport,
          });
        } else if (currentActive.publicKeyHex.toLowerCase() === senderKey) {
          setActivePeer((prev) => (prev ? { ...prev, connected: true, activeTransport: transport } : null));
        }

        // Add sealed message
        const newMsg: MessageRecord = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          senderKeyHex: senderKey,
          recipientKeyHex: currentKeyPair.publicKeyHex.toLowerCase(),
          isOutgoing: false,
          status: 'received_sealed',
          timestamp: payload.timestamp || Date.now(),
          encryptedPayload: payload,
          remainingSeconds: 60,
          burnProgress: 0,
        };

        setMessages((prev) => [...prev, newMsg]);
      },

      onIncomingHandshake: (peerKeyHex: string) => {
        playReceiveSound();
        const senderKey = peerKeyHex.toLowerCase();
        const currentActive = activePeerRef.current;
        if (!currentActive) {
          setActivePeer({
            publicKeyHex: senderKey,
            fingerprint: deriveFingerprint(senderKey),
            connected: true,
            activeTransport: 'mesh_relay',
          });
        } else if (currentActive.publicKeyHex.toLowerCase() === senderKey) {
          setActivePeer((prev) => (prev ? { ...prev, connected: true } : null));
        }
      },

      onPeerConnectionChange: (peerKeyHex: string, connected: boolean, transport: TransportLayer, latencyMs?: number) => {
        const target = peerKeyHex.toLowerCase();
        if (activePeerRef.current?.publicKeyHex.toLowerCase() === target) {
          setActivePeer((prev) => (prev ? { 
            ...prev, 
            connected, 
            activeTransport: transport,
            latencyMs: latencyMs !== undefined ? latencyMs : prev.latencyMs,
            lastSeen: Date.now(),
          } : null));
        }
      },

      onRelayStatusChange: (connectedCount: number, totalRelays: number) => {
        setRelayStatus({ connected: connectedCount, total: totalRelays });
      },

      onRemoteBurn: (messageId: string) => {
        burnMessageCallbackRef.current(messageId, false);
      },
    });

    transportRef.current = mesh;
  }, []);

  // Initialize transport on mount
  useEffect(() => {
    initializeTransport(keyPair);
    return () => {
      transportRef.current?.destroy();
    };
  }, [initializeTransport, keyPair]);

  // -------------------------------------------------------------------
  // Regenerate Key Handler (Instantly destroys prior identity)
  // -------------------------------------------------------------------
  const handleRegenerateKey = () => {
    // 1. Scrub existing volatile keypair from RAM
    secureScrub(keyPairRef.current.secretKey);

    // 2. Wipe volatile messages and close active chamber
    setMessages([]);
    setActivePeer(null);

    // 3. Generate brand new X25519 keypair
    const newPair = generateKeyPair();
    setKeyPair(newPair);
    initializeTransport(newPair);
    playBurnSound();
  };

  // -------------------------------------------------------------------
  // Establish Single Contact Chamber via "+"
  // -------------------------------------------------------------------
  const handleConnectPeer = (recipientKeyHex: string, nickname?: string) => {
    const cleanKey = recipientKeyHex.trim().toLowerCase();
    const peer: ActivePeer = {
      publicKeyHex: cleanKey,
      fingerprint: deriveFingerprint(cleanKey),
      nickname,
      connected: true,
      activeTransport: 'mesh_relay',
    };

    setActivePeer(peer);
    transportRef.current?.setActiveContact(cleanKey);
    setTimeout(() => {
      transportRef.current?.pingPeer(cleanKey);
    }, 400);
  };

  const handleDisconnectPeer = () => {
    setActivePeer(null);
    transportRef.current?.setActiveContact(null);
  };

  const handlePingPeer = () => {
    if (activePeer && transportRef.current) {
      transportRef.current.pingPeer(activePeer.publicKeyHex);
    }
  };

  // -------------------------------------------------------------------
  // Sending Messages
  // -------------------------------------------------------------------
  const handleSendMessage = (content: {
    type: MediaType;
    text?: string;
    mediaBase64?: string;
    mediaMimeType?: string;
    mediaDuration?: number;
  }) => {
    if (!activePeer) return;

    const messageContent = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: content.type,
      text: content.text,
      mediaBase64: content.mediaBase64,
      mediaMimeType: content.mediaMimeType,
      mediaDuration: content.mediaDuration,
      createdAt: Date.now(),
    };

    // Asymmetric PFS Encryption with X25519 / XSalsa20-Poly1305
    const encryptedPayload = encryptMessage(
      messageContent,
      activePeer.publicKeyHex,
      keyPair.publicKeyHex
    );

    // Dispatch over WebRTC / Ephemeral Mesh Relay
    transportRef.current?.sendEncryptedMessage(
      activePeer.publicKeyHex,
      encryptedPayload
    );

    playSendSound();

    // Append outgoing record in memory with immediate 60-second auto-destruct countdown
    const outgoingRecord: MessageRecord = {
      id: messageContent.id,
      senderKeyHex: keyPair.publicKeyHex,
      recipientKeyHex: activePeer.publicKeyHex,
      isOutgoing: true,
      status: 'opened_counting',
      timestamp: Date.now(),
      decryptedContent: messageContent,
      openedAt: Date.now(),
      remainingSeconds: 60,
      burnProgress: 0,
    };

    setMessages((prev) => [...prev, outgoingRecord]);
  };

  // -------------------------------------------------------------------
  // Decrypt & Start 60-Second Auto-Destruct Countdown
  // -------------------------------------------------------------------
  const handleOpenMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.encryptedPayload) return msg;

        try {
          const decrypted = decryptMessage(msg.encryptedPayload, keyPair.secretKey);
          return {
            ...msg,
            status: 'opened_counting',
            decryptedContent: decrypted,
            openedAt: Date.now(),
            remainingSeconds: 60,
          };
        } catch (err) {
          console.error('Decryption failed:', err);
          return msg;
        }
      })
    );
  };

  // -------------------------------------------------------------------
  // 60-Second Auto-Destruct: Scrub RAM & Purge DOM (Sender & Recipient)
  // -------------------------------------------------------------------
  const handleBurnMessage = useCallback((messageId: string, broadcastRemote: boolean = true) => {
    // Notify peer to burn remotely as well so both screens stay in sync
    if (broadcastRemote && activePeerRef.current && transportRef.current) {
      transportRef.current.burnMessageRemotely(activePeerRef.current.publicKeyHex, messageId);
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        // Revoke any blob URL and zero-out references
        if (msg.decryptedContent?.mediaBase64?.startsWith('blob:')) {
          URL.revokeObjectURL(msg.decryptedContent.mediaBase64);
        }

        return {
          ...msg,
          status: 'burned_purged',
          decryptedContent: null, // Scrubbed from volatile memory
          encryptedPayload: undefined,
          remainingSeconds: 0,
          burnProgress: 1,
        };
      })
    );
  }, []);

  // Keep callback ref updated
  burnMessageCallbackRef.current = handleBurnMessage;

  // Quick helper to test self-destructing capsule
  const handleSendTestSelfMessage = () => {
    const testText = lang === 'fr'
      ? '🔒 Ceci est une capsule éphémère ultra-confidentielle. Une fois déchiffrée, vous avez exactement 60 secondes pour la consulter avant qu’elle ne soit définitivement écrasée dans la RAM et purgée de l’écran.'
      : lang === 'es'
      ? '🔒 Esta es una cápsula efímera ultra-confidencial. Una vez descifrada, tienes exactamente 60 segundos para consultarla antes de que sea destruida en la RAM y purgada de la pantalla.'
      : '🔒 This is an ultra-private ephemeral capsule. Once decrypted, you have exactly 60 seconds to read it before it is completely scrubbed from browser RAM and permanently purged from the DOM.';

    const testContent = {
      id: `test_${Date.now()}`,
      type: 'text' as MediaType,
      text: testText,
      createdAt: Date.now(),
    };

    const payload = encryptMessage(testContent, keyPair.publicKeyHex, keyPair.publicKeyHex);
    
    // Simulate incoming sealed capsule
    const newMsg: MessageRecord = {
      id: `msg_test_${Date.now()}`,
      senderKeyHex: keyPair.publicKeyHex,
      recipientKeyHex: keyPair.publicKeyHex,
      isOutgoing: false,
      status: 'received_sealed',
      timestamp: Date.now(),
      encryptedPayload: payload,
      remainingSeconds: 60,
      burnProgress: 0,
    };

    if (!activePeer) {
      setActivePeer({
        publicKeyHex: keyPair.publicKeyHex,
        fingerprint: keyPair.fingerprint,
        nickname: lang === 'fr' ? 'Chambre Test' : lang === 'es' ? 'Cámara de Prueba' : 'Self-Test Chamber',
        connected: true,
        activeTransport: 'local_broadcast',
      });
    }

    setMessages((prev) => [...prev, newMsg]);
    playReceiveSound();
  };

  const copyTopKey = () => {
    navigator.clipboard.writeText(keyPair.publicKeyHex);
    setTopKeyCopied(true);
    setTimeout(() => setTopKeyCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#09090B] text-[#A1A1AA] font-sans overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR (Elegant Dark Style) */}
      {/* ------------------------------------------------------------- */}
      <header 
        id="app-header"
        className="flex items-center justify-between px-3 sm:px-6 py-3.5 bg-[#0C0C0E] border-b border-[#1F1F23] shrink-0 select-none"
      >
        {/* Logo & Protocol Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-wider text-xs sm:text-sm text-white flex items-center gap-1 font-mono-code">
                EPHEMERAL<span className="text-indigo-400">P2P</span>
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#71717A] font-semibold">
                {lang === 'fr' && 'RAM Pure • Zéro Backend'}
                {lang === 'en' && 'Pure RAM • Zero Backend'}
                {lang === 'es' && 'RAM Pura • Cero Backend'}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[#1F1F23]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] uppercase font-semibold tracking-tighter text-[#A1A1AA]">
                {lang === 'fr' && `Mesh Actif (${relayStatus.connected}/${relayStatus.total} Relais)`}
                {lang === 'en' && `Mesh Active (${relayStatus.connected}/${relayStatus.total} Relays)`}
                {lang === 'es' && `Mesh Activa (${relayStatus.connected}/${relayStatus.total} Relés)`}
              </span>
            </div>
          </div>
        </div>

        {/* User's Unique Contact Key & Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Key Pill with One-Click Copy */}
          <div className="hidden sm:flex items-center bg-[#18181B] border border-[#27272A] rounded-lg pl-3 pr-1.5 py-1 text-xs">
            <div className="flex items-center gap-1.5 mr-2">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[#71717A] hidden md:inline text-xs">
                {lang === 'fr' ? 'Identité :' : lang === 'es' ? 'Identidad :' : 'Identity:'}
              </span>
              <span className="font-mono-code text-indigo-400 font-medium text-xs">
                {keyPair.fingerprint}
              </span>
            </div>

            <button
              id="top-copy-key-btn"
              onClick={copyTopKey}
              title={lang === 'fr' ? 'Copier la clé publique' : lang === 'es' ? 'Copiar clave pública' : 'Copy Full Public Key'}
              className="p-1.5 text-[#A1A1AA] hover:text-white rounded-md hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              {topKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              id="top-key-details-btn"
              onClick={() => setIsKeyModalOpen(true)}
              title={lang === 'fr' ? 'Afficher QR & détails de clé' : lang === 'es' ? 'Ver QR y detalles' : 'Show QR & Key Details'}
              className="p-1.5 text-[#A1A1AA] hover:text-indigo-400 rounded-md hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Regenerate Key Action */}
          <button
            id="top-regen-key-btn"
            onClick={handleRegenerateKey}
            title={lang === 'fr' ? 'Détruire la clé et couper les canaux' : lang === 'es' ? 'Destruir clave y cortar canales' : 'Destroy Key & Sever All Prior Channels'}
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-lg border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-[#71717A]" />
            <span className="hidden lg:inline">
              {lang === 'fr' ? 'Régénérer' : lang === 'es' ? 'Regenerar' : 'Regenerate'}
            </span>
          </button>

          {/* Dedicated Scan QR Button */}
          <button
            id="top-scan-qr-btn"
            onClick={() => setAddContactModal({ isOpen: true, tab: 'scan' })}
            title={lang === 'fr' ? 'Scanner le QR code d’un contact' : lang === 'es' ? 'Escanear código QR' : 'Scan Peer QR Code'}
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl border border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold transition-all cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {lang === 'fr' ? 'Scanner QR' : lang === 'es' ? 'Escanear QR' : 'Scan QR'}
            </span>
          </button>

          {/* Guide / Mode d'Emploi Button */}
          <button
            id="top-guide-btn"
            onClick={() => setIsGuideModalOpen(true)}
            title={lang === 'fr' ? "Guide d'utilisation" : lang === 'es' ? 'Guía de uso' : 'User Guide'}
            className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl border border-[#27272A] hover:border-indigo-500/40 bg-[#18181B] hover:bg-[#202024] text-[#A1A1AA] hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {lang === 'fr' ? 'Guide' : lang === 'es' ? 'Guía' : 'Guide'}
            </span>
          </button>

          {/* SINGLE CONTACT HANDSHAKE VIA "+" BUTTON */}
          <button
            id="initiate-contact-plus-btn"
            onClick={() => setAddContactModal({ isOpen: true, tab: 'scan' })}
            title={lang === 'fr' ? 'Initier une liaison de contact (+)' : lang === 'es' ? 'Iniciar enlace de contacto (+)' : 'Initiate Contact Handshake (+)'}
            className="flex items-center gap-1.5 sm:gap-2 py-1.5 px-3 sm:px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">
              {lang === 'fr' ? 'Contact' : lang === 'es' ? 'Contacto' : 'New Handshake'}
            </span>
          </button>

          {/* Language Selector Switcher */}
          <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-xl p-0.5 text-xs ml-1">
            <button
              type="button"
              id="lang-fr-btn"
              onClick={() => setLang('fr')}
              className={`px-2 py-1 rounded-lg font-mono-code text-[11px] font-bold transition-all cursor-pointer ${
                lang === 'fr' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              id="lang-en-btn"
              onClick={() => setLang('en')}
              className={`px-2 py-1 rounded-lg font-mono-code text-[11px] font-bold transition-all cursor-pointer ${
                lang === 'en' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              id="lang-es-btn"
              onClick={() => setLang('es')}
              className={`px-2 py-1 rounded-lg font-mono-code text-[11px] font-bold transition-all cursor-pointer ${
                lang === 'es' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-[#71717A] hover:text-white'
              }`}
            >
              ES
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {activePeer ? (
          /* ACTIVE 1-ON-1 ISOLATED CHAMBER */
          <div className="flex-1 flex flex-col min-h-0 bg-[#09090B]">
            {/* Contact Header */}
            <ActiveContactHeader
              activePeer={activePeer}
              onDisconnect={handleDisconnectPeer}
              onPingPeer={handlePingPeer}
              lang={lang}
            />

            {/* Messages Scroll Area */}
            <div 
              id="messages-scroll-area"
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-3"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {lang === 'fr' && 'Chambre Sécurisée Établie'}
                    {lang === 'en' && 'Chamber Established'}
                    {lang === 'es' && 'Cámara Segura Establecida'}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] max-w-sm leading-relaxed">
                    {lang === 'fr' && (
                      <>Canal direct actif avec <span className="font-mono-code text-indigo-400">{activePeer.fingerprint}</span>. Tous les messages sont chiffrés de bout en bout et s'autodétruisent sous 60s dès l'ouverture.</>
                    )}
                    {lang === 'en' && (
                      <>Point-to-point channel active with <span className="font-mono-code text-indigo-400">{activePeer.fingerprint}</span>. All messages are encrypted with ephemeral forward secrecy and auto-destruct 60s after being opened.</>
                    )}
                    {lang === 'es' && (
                      <>Canal punto a punto activo con <span className="font-mono-code text-indigo-400">{activePeer.fingerprint}</span>. Todos los mensajes están cifrados de extremo a extremo y se autodestruyen en 60s tras abrirse.</>
                    )}
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <EphemeralMessageItem
                    key={msg.id}
                    message={msg}
                    onOpenMessage={handleOpenMessage}
                    onBurnMessage={handleBurnMessage}
                    lang={lang}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Composer */}
            <MessageComposer
              onSendMessage={handleSendMessage}
              onOpenMediaModal={(mode) => setMediaModalState({ isOpen: true, mode })}
              lang={lang}
            />
          </div>
        ) : (
          /* NO CONTACT ACTIVE: WELCOME & HANDSHAKE DASHBOARD */
          <div 
            id="empty-state-dashboard"
            className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto"
          >
            <div className="max-w-xl w-full text-center space-y-6">
              {/* Centered Handshake Plus Trigger */}
              <div className="relative inline-block mx-auto group">
                <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl opacity-30 group-hover:opacity-60 blur-xl transition duration-500" />
                <button
                  id="dashboard-hero-plus-btn"
                  onClick={() => setAddContactModal({ isOpen: true, tab: 'scan' })}
                  className="relative w-20 h-20 rounded-2xl bg-[#18181B] border border-indigo-500/40 hover:border-indigo-400 flex items-center justify-center text-indigo-400 hover:text-white shadow-2xl shadow-indigo-950/50 transition-all hover:scale-105 cursor-pointer"
                >
                  <Plus className="w-10 h-10 stroke-[2.5]" />
                </button>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {lang === 'fr' && 'Initier un Contact Sécurisé P2P'}
                  {lang === 'en' && 'Initiate Secure P2P Contact'}
                  {lang === 'es' && 'Iniciar Contacto Seguro P2P'}
                </h1>
                <p className="text-sm text-[#A1A1AA] max-w-md mx-auto leading-relaxed">
                  {lang === 'fr' && "Scannez le QR code d'un contact avec votre caméra ou collez sa Clé Unique de Contact (64 car. hex) pour ouvrir une chambre chiffrée isolée."}
                  {lang === 'en' && "Scan a peer's QR code with your camera or enter their 64-character Unique Contact Key to open an isolated, encrypted chamber."}
                  {lang === 'es' && "Escanea el código QR de un contacto con tu cámara o pega su Clave Única de Contacto (64 car. hex) para abrir una cámara cifrada aislada."}
                </p>

                {/* Primary Action Buttons: Scan QR & Enter Key */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    id="hero-scan-qr-btn"
                    onClick={() => setAddContactModal({ isOpen: true, tab: 'scan' })}
                    className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 stroke-[2.2]" />
                    <span>
                      {lang === 'fr' && 'Scanner le QR Code'}
                      {lang === 'en' && 'Scan Contact QR Code'}
                      {lang === 'es' && 'Escanear Código QR'}
                    </span>
                  </button>

                  <button
                    id="hero-enter-key-btn"
                    onClick={() => setAddContactModal({ isOpen: true, tab: 'paste' })}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-semibold text-[#A1A1AA] hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span>
                      {lang === 'fr' && 'Saisir / Coller la Clé'}
                      {lang === 'en' && 'Enter / Paste Key'}
                      {lang === 'es' && 'Pegar / Ingresar Clave'}
                    </span>
                  </button>

                  <button
                    id="hero-guide-btn"
                    onClick={() => setIsGuideModalOpen(true)}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-indigo-500/30 text-xs font-semibold text-indigo-300 hover:text-white transition-all cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    <span>
                      {lang === 'fr' && "Mode d'Emploi"}
                      {lang === 'en' && 'User Guide'}
                      {lang === 'es' && 'Guía de Uso'}
                    </span>
                  </button>
                </div>
              </div>

              {/* User's Own Key Card with 1-Click Copy */}
              <div className="p-5 bg-[#18181B] border border-[#27272A] rounded-2xl text-left space-y-3 shadow-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1AA] flex items-center gap-1.5 font-medium">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {lang === 'fr' && 'Votre Clé Unique de Contact'}
                      {lang === 'en' && 'Your Unique Contact Key'}
                      {lang === 'es' && 'Tu Clave Única de Contacto'}
                    </span>
                  </span>
                  <span className="text-indigo-400 font-mono-code font-semibold">{keyPair.fingerprint}</span>
                </div>

                <div className="p-3.5 bg-[#0C0C0E] border border-[#1F1F23] rounded-xl font-mono-code text-xs text-[#A1A1AA] break-all select-all leading-relaxed">
                  {keyPair.publicKeyHex}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    id="hero-copy-key-btn"
                    onClick={copyTopKey}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all cursor-pointer"
                  >
                    {topKeyCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {lang === 'fr' && 'Copié dans le presse-papier'}
                          {lang === 'en' && 'Copied to Clipboard'}
                          {lang === 'es' && '¡Copiado al portapapeles!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'fr' && 'Copier ma Clé de Contact'}
                          {lang === 'en' && 'Copy My Contact Key'}
                          {lang === 'es' && 'Copiar Mi Clave de Contacto'}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    id="hero-qr-btn"
                    onClick={() => setIsKeyModalOpen(true)}
                    className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[#27272A] hover:bg-[#323236] text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'fr' ? 'Code QR' : lang === 'es' ? 'Código QR' : 'QR Code'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Instant Testing Helper Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  id="hero-test-self-btn"
                  onClick={handleSendTestSelfMessage}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    {lang === 'fr' && 'Tester une Capsule 60s (Auto-destruction)'}
                    {lang === 'en' && 'Test 60s Self-Destruct Capsule'}
                    {lang === 'es' && 'Probar Cápsula 60s (Autodestrucción)'}
                  </span>
                </button>

                <button
                  id="hero-open-new-tab-btn"
                  onClick={() => window.open(window.location.href, '_blank', 'width=520,height=750')}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {lang === 'fr' && 'Ouvrir 2ème fenêtre pour démo P2P'}
                    {lang === 'en' && 'Open 2nd Window for Live P2P Demo'}
                    {lang === 'es' && 'Abrir 2ª ventana para demo P2P'}
                  </span>
                </button>
              </div>

              {/* Protocol Guarantees */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
                <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'fr' ? 'P2P WebRTC Direct' : lang === 'es' ? 'P2P WebRTC Directo' : 'WebRTC P2P Direct'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] leading-snug">
                    {lang === 'fr' && 'Canaux DataChannel directs navigateur à navigateur sans proxy central.'}
                    {lang === 'en' && 'Direct browser-to-browser DataChannels. No intermediate proxy.'}
                    {lang === 'es' && 'Canales DataChannel directos entre navegadores sin servidor central.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'fr' ? 'Chiffrement X25519' : lang === 'es' ? 'Cifrado X25519' : 'X25519 Ephemeral'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] leading-snug">
                    {lang === 'fr' && 'Clés éphémères garantissant une confidentialité persistante parfaite (PFS).'}
                    {lang === 'en' && 'One-time ephemeral keys guarantee Perfect Forward Secrecy.'}
                    {lang === 'es' && 'Claves efímeras que garantizan confidencialidad perfecta (PFS).'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'fr' ? 'Purge RAM 60s' : lang === 'es' ? 'Purga RAM 60s' : '60s RAM Purge'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] leading-snug">
                    {lang === 'fr' && 'Zéro écriture disque. Mémoire écrasée par des zéros et DOM nettoyé.'}
                    {lang === 'en' && 'Zero disk writes. Memory zeroed & DOM wiped after 60 seconds.'}
                    {lang === 'es' && 'Cero escrituras en disco. Memoria borrada con ceros y DOM limpiado.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}
      <KeyManagerModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        keyPair={keyPair}
        onRegenerateKey={handleRegenerateKey}
        lang={lang}
      />

      <AddContactModal
        isOpen={addContactModal.isOpen}
        initialTab={addContactModal.tab}
        onClose={() => setAddContactModal((prev) => ({ ...prev, isOpen: false }))}
        onConnectPeer={handleConnectPeer}
        myPublicKeyHex={keyPair.publicKeyHex}
        lang={lang}
      />

      <MediaRecorderModal
        isOpen={mediaModalState.isOpen}
        defaultMode={mediaModalState.mode}
        onClose={() => setMediaModalState({ isOpen: false, mode: 'audio' })}
        onSendMedia={(media) => {
          handleSendMessage({
            type: media.type,
            mediaBase64: media.mediaBase64,
            mediaMimeType: media.mediaMimeType,
            mediaDuration: media.mediaDuration,
          });
        }}
        lang={lang}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        myPublicKeyHex={keyPair.publicKeyHex}
        myFingerprint={keyPair.fingerprint}
        onOpenScanQR={() => setAddContactModal({ isOpen: true, tab: 'scan' })}
        onOpenPasteKey={() => setAddContactModal({ isOpen: true, tab: 'paste' })}
        lang={lang}
        onLangChange={setLang}
      />
    </div>
  );
}
