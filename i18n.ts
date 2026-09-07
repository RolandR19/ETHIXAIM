import type { Language } from '../types';

export interface Translations {
  // Top bar
  appName: string;
  appSubtitle: string;
  meshActive: (connected: number, total: number) => string;
  identityLabel: string;
  copyFullKey: string;
  showQrDetails: string;
  regenerate: string;
  regenerateTooltip: string;
  scanQr: string;
  guide: string;
  newHandshake: string;
  keyCopied: string;

  // Empty state hero
  heroTitle: string;
  heroSubtitle: string;
  heroTestButton: string;
  heroScanButton: string;
  heroPasteButton: string;
  heroGuideButton: string;
  zeroStorageBadge: string;
  zeroStorageDesc: string;

  // Active chamber
  e2eBadge: string;
  testLink: string;
  testingLink: string;
  closeChamber: string;
  transportWebrtc: string;
  transportLocal: string;
  transportMesh: string;
  noMessagesTitle: string;
  noMessagesSubtitle: string;

  // Message Composer
  inputPlaceholder: string;
  sendTooltip: string;
  voiceTooltip: string;
  imageTooltip: string;
  ephemeralNotice: string;
  recordingVoice: string;
  cancel: string;

  // Ephemeral Message Item
  sealedCapsuleTitle: string;
  sealedCapsuleDesc: string;
  decryptButton: string;
  burnButton: string;
  purgingIn: (seconds: number) => string;
  activeCapsule: string;
  outgoingCapsule: string;
  capsuleDestroyedSender: string;
  capsuleDestroyedRecipient: string;
  incomingEncrypted: string;
  outgoingSelfDestructing: string;

  // Modals - Key Manager
  keyModalTitle: string;
  keyModalSubtitle: string;
  keyModalFingerprint: string;
  keyModalPublicKey: string;
  copyPublicKey: string;
  keyModalWarning: string;

  // Modals - Add Contact
  addContactTitle: string;
  tabScanQr: string;
  tabPasteKey: string;
  pasteKeyPlaceholder: string;
  nicknamePlaceholder: string;
  connectButton: string;
  invalidKeyError: string;

  // Modals - Guide
  guideTitle: string;
  guideSubtitle: string;
  tabQuickstart: string;
  tabConnect: string;
  tabAutodestruct: string;
  tabSecurity: string;
  guideGotIt: string;
}

export const translations: Record<Language, Translations> = {
  fr: {
    // Top bar
    appName: 'EPHEMERAL',
    appSubtitle: 'Pure RAM • Zéro Sauvegarde',
    meshActive: (connected, total) => `Mesh Actif (${connected}/${total} Relais)`,
    identityLabel: 'Identité :',
    copyFullKey: 'Copier la clé publique',
    showQrDetails: 'Afficher le QR code & détails',
    regenerate: 'Régénérer',
    regenerateTooltip: 'Détruire la clé et couper toutes les liaisons',
    scanQr: 'Scanner QR',
    guide: 'Guide',
    newHandshake: 'Nouveau Contact',
    keyCopied: 'Copié !',

    // Hero
    heroTitle: 'Chambre Isolée Chiffrée',
    heroSubtitle: 'Échangez en direct sans aucun stockage serveur. Les messages transitent en Peer-to-Peer et s’autodétruisent sous 60 secondes chez l’expéditeur comme chez le destinataire.',
    heroTestButton: 'Test rapide : envoyer une capsule à soi-même',
    heroScanButton: 'Scanner QR Code',
    heroPasteButton: 'Coller une Clé Contact',
    heroGuideButton: 'Mode d’Emploi',
    zeroStorageBadge: '100% Mémoire Vive (RAM)',
    zeroStorageDesc: 'Aucune écriture sur disque dur, aucune base de données. Fermer l’onglet efface immédiatement tout.',

    // Active chamber
    e2eBadge: '1-sur-1 E2E',
    testLink: 'Tester la liaison',
    testingLink: 'Test en cours...',
    closeChamber: 'Fermer',
    transportWebrtc: 'WebRTC Direct',
    transportLocal: 'IPC Multi-Onglets',
    transportMesh: 'Relais Mesh Zéro-Log',
    noMessagesTitle: 'Chambre privée ouverte',
    noMessagesSubtitle: 'Envoyez un message texte, une note vocale ou une photo. Les capsules s’autodétruisent 60 secondes après envoi ou déchiffrement.',

    // Message Composer
    inputPlaceholder: 'Tapez un message éphémère...',
    sendTooltip: 'Envoyer (Chiffrement X25519)',
    voiceTooltip: 'Enregistrer une note vocale',
    imageTooltip: 'Envoyer une image ou vidéo',
    ephemeralNotice: 'Auto-destruction sous 60 secondes des deux côtés',
    recordingVoice: 'Enregistrement vocal en cours...',
    cancel: 'Annuler',

    // Ephemeral Message Item
    sealedCapsuleTitle: 'Capsule Scellée & Chiffrée',
    sealedCapsuleDesc: 'Reçue via réseau P2P • Chiffrée de bout en bout',
    decryptButton: 'Déchiffrer & Démarrer 60s',
    burnButton: 'Brûler',
    purgingIn: (s) => `AUTO-DESTRUCTION DANS ${s}s`,
    activeCapsule: 'Capsule Éphémère Active',
    outgoingCapsule: 'Message Émis (Auto-destruction 60s)',
    capsuleDestroyedSender: 'Message émis détruit • RAM effacée',
    capsuleDestroyedRecipient: 'Capsule détruite • RAM effacée',
    incomingEncrypted: 'Message entrant chiffré',
    outgoingSelfDestructing: 'Message éphémère envoyé',

    // Modals - Key Manager
    keyModalTitle: 'Votre Identité Cryptographique',
    keyModalSubtitle: 'Clé X25519 générée en mémoire RAM volatile',
    keyModalFingerprint: 'Empreinte de contact rapide :',
    keyModalPublicKey: 'Clé publique complète (64 caractères) :',
    copyPublicKey: 'Copier la clé publique',
    keyModalWarning: 'Cette clé n’est jamais enregistrée sur un serveur. Régénérer la clé rompt instantanément toutes les conversations antérieures.',

    // Modals - Add Contact
    addContactTitle: 'Initier une Poignée de Main P2P',
    tabScanQr: 'Scanner un QR Code',
    tabPasteKey: 'Coller une Clé',
    pasteKeyPlaceholder: 'Collez la clé publique (64 caractères hexadécimaux)...',
    nicknamePlaceholder: 'Pseudo facultatif (ex: Alice)',
    connectButton: 'Ouvrir la Chambre Privée',
    invalidKeyError: 'La clé publique doit contenir 64 caractères hexadécimaux valides.',

    // Modals - Guide
    guideTitle: 'Guide & Mode d’Emploi',
    guideSubtitle: 'Comment connecter 2 personnes et échanger en toute discrétion',
    tabQuickstart: '1. Démarrage Rapide',
    tabConnect: '2. Connecter 2 Appareils',
    tabAutodestruct: '3. Auto-Destruction 60s',
    tabSecurity: '4. Sécurité & Urgence',
    guideGotIt: 'J’ai compris',
  },

  en: {
    // Top bar
    appName: 'EPHEMERAL',
    appSubtitle: 'Pure RAM • Zero Backend',
    meshActive: (connected, total) => `Mesh Active (${connected}/${total} Relays)`,
    identityLabel: 'Identity:',
    copyFullKey: 'Copy public key',
    showQrDetails: 'Show QR code & key details',
    regenerate: 'Regenerate',
    regenerateTooltip: 'Destroy key and sever all prior channels',
    scanQr: 'Scan QR',
    guide: 'Guide',
    newHandshake: 'New Contact',
    keyCopied: 'Copied!',

    // Hero
    heroTitle: 'Encrypted Isolated Chamber',
    heroSubtitle: 'Direct live messaging with zero persistent storage. Messages travel peer-to-peer and self-destruct within 60 seconds for both sender and recipient.',
    heroTestButton: 'Quick Test: Send self-destructing capsule to self',
    heroScanButton: 'Scan QR Code',
    heroPasteButton: 'Paste Contact Key',
    heroGuideButton: 'User Guide',
    zeroStorageBadge: '100% Volatile RAM',
    zeroStorageDesc: 'Zero hard drive writes, zero databases. Closing the tab wipes everything immediately.',

    // Active chamber
    e2eBadge: '1-on-1 E2E',
    testLink: 'Test Link',
    testingLink: 'Testing link...',
    closeChamber: 'Close',
    transportWebrtc: 'WebRTC Direct',
    transportLocal: 'Multi-Tab IPC',
    transportMesh: 'Zero-Log Mesh Relay',
    noMessagesTitle: 'Private chamber opened',
    noMessagesSubtitle: 'Send text, voice notes, or photos. Capsules self-destruct 60 seconds after sending or decrypting.',

    // Message Composer
    inputPlaceholder: 'Type an ephemeral message...',
    sendTooltip: 'Send (X25519 Encryption)',
    voiceTooltip: 'Record voice note',
    imageTooltip: 'Send image or video',
    ephemeralNotice: '60-second auto-destruct on both sides',
    recordingVoice: 'Recording voice note...',
    cancel: 'Cancel',

    // Ephemeral Message Item
    sealedCapsuleTitle: 'Sealed & Encrypted Capsule',
    sealedCapsuleDesc: 'Received via P2P mesh • End-to-end encrypted',
    decryptButton: 'Decrypt & Start 60s Timer',
    burnButton: 'Burn Now',
    purgingIn: (s) => `AUTO-DESTRUCT IN ${s}s`,
    activeCapsule: 'Active Ephemeral Capsule',
    outgoingCapsule: 'Sent Message (60s Auto-Destruct)',
    capsuleDestroyedSender: 'Sent message destroyed • RAM zeroed',
    capsuleDestroyedRecipient: 'Capsule destroyed • RAM zeroed',
    incomingEncrypted: 'Incoming encrypted message',
    outgoingSelfDestructing: 'Ephemeral message sent',

    // Modals - Key Manager
    keyModalTitle: 'Your Cryptographic Identity',
    keyModalSubtitle: 'X25519 keypair generated in volatile RAM memory',
    keyModalFingerprint: 'Quick contact fingerprint:',
    keyModalPublicKey: 'Full public key (64 hex characters):',
    copyPublicKey: 'Copy Public Key',
    keyModalWarning: 'This key is never stored on any server. Regenerating your key immediately severs all prior channels.',

    // Modals - Add Contact
    addContactTitle: 'Initiate P2P Handshake',
    tabScanQr: 'Scan QR Code',
    tabPasteKey: 'Paste Key',
    pasteKeyPlaceholder: 'Paste recipient public key (64 hex characters)...',
    nicknamePlaceholder: 'Optional nickname (e.g. Alice)',
    connectButton: 'Open Private Chamber',
    invalidKeyError: 'Public key must be 64 valid hexadecimal characters.',

    // Modals - Guide
    guideTitle: 'User Guide & Instructions',
    guideSubtitle: 'How to connect 2 devices and chat with absolute discretion',
    tabQuickstart: '1. Quickstart',
    tabConnect: '2. Connect 2 Devices',
    tabAutodestruct: '3. 60s Auto-Destruct',
    tabSecurity: '4. Security & Panic',
    guideGotIt: 'Got it',
  },

  es: {
    // Top bar
    appName: 'EPHEMERAL',
    appSubtitle: 'Memoria RAM Pura • Cero Servidor',
    meshActive: (connected, total) => `Malla Activa (${connected}/${total} Repetidores)`,
    identityLabel: 'Identidad:',
    copyFullKey: 'Copiar clave pública',
    showQrDetails: 'Ver código QR y detalles',
    regenerate: 'Regenerar',
    regenerateTooltip: 'Destruir clave y cortar todas las conexiones previas',
    scanQr: 'Escanear QR',
    guide: 'Guía',
    newHandshake: 'Nuevo Contacto',
    keyCopied: '¡Copiado!',

    // Hero
    heroTitle: 'Cámara Aislada Cifrada',
    heroSubtitle: 'Mensajería directa en vivo sin almacenamiento persistente. Los mensajes viajan entre pares (P2P) y se autodestruyen en 60 segundos tanto para el emisor como para el receptor.',
    heroTestButton: 'Prueba rápida: enviarse una cápsula a sí mismo',
    heroScanButton: 'Escanear Código QR',
    heroPasteButton: 'Pegar Clave de Contacto',
    heroGuideButton: 'Guía de Uso',
    zeroStorageBadge: '100% Memoria RAM Volátil',
    zeroStorageDesc: 'Cero escritura en disco, cero bases de datos. Cerrar la pestaña borra todo al instante.',

    // Active chamber
    e2eBadge: '1-a-1 E2E',
    testLink: 'Probar enlace',
    testingLink: 'Probando enlace...',
    closeChamber: 'Cerrar',
    transportWebrtc: 'WebRTC Directo',
    transportLocal: 'IPC Multi-Pestaña',
    transportMesh: 'Repetidor Malla Cero-Logs',
    noMessagesTitle: 'Cámara privada abierta',
    noMessagesSubtitle: 'Envía texto, notas de voz o fotos. Las cápsulas se autodestruyen 60 segundos después de enviarse o descifrarse.',

    // Message Composer
    inputPlaceholder: 'Escribe un mensaje efímero...',
    sendTooltip: 'Enviar (Cifrado X25519)',
    voiceTooltip: 'Grabar nota de voz',
    imageTooltip: 'Enviar imagen o video',
    ephemeralNotice: 'Autodestrucción en 60 segundos en ambos lados',
    recordingVoice: 'Grabando nota de voz...',
    cancel: 'Cancelar',

    // Ephemeral Message Item
    sealedCapsuleTitle: 'Cápsula Sellada y Cifrada',
    sealedCapsuleDesc: 'Recibida por red P2P • Cifrada de extremo a extremo',
    decryptButton: 'Descifrar y Activar 60s',
    burnButton: 'Quemar',
    purgingIn: (s) => `AUTODESTRUCCIÓN EN ${s}s`,
    activeCapsule: 'Cápsula Efímera Activa',
    outgoingCapsule: 'Mensaje Emitido (Autodestrucción 60s)',
    capsuleDestroyedSender: 'Mensaje emitido destruido • RAM borrada',
    capsuleDestroyedRecipient: 'Cápsula destruida • RAM borrada',
    incomingEncrypted: 'Mensaje entrante cifrado',
    outgoingSelfDestructing: 'Mensaje efímero enviado',

    // Modals - Key Manager
    keyModalTitle: 'Tu Identidad Criptográfica',
    keyModalSubtitle: 'Par de claves X25519 generado en memoria RAM volátil',
    keyModalFingerprint: 'Huella de contacto rápido:',
    keyModalPublicKey: 'Clave pública completa (64 caracteres):',
    copyPublicKey: 'Copiar Clave Pública',
    keyModalWarning: 'Esta clave nunca se almacena en ningún servidor. Regenerar tu clave corta inmediatamente todas las conversaciones previas.',

    // Modals - Add Contact
    addContactTitle: 'Iniciar Saludo P2P',
    tabScanQr: 'Escanear Código QR',
    tabPasteKey: 'Pegar Clave',
    pasteKeyPlaceholder: 'Pega la clave pública (64 caracteres hexadecimales)...',
    nicknamePlaceholder: 'Apodo opcional (ej: Alicia)',
    connectButton: 'Abrir Cámara Privada',
    invalidKeyError: 'La clave pública debe tener 64 caracteres hexadecimales válidos.',

    // Modals - Guide
    guideTitle: 'Guía y Modo de Empleo',
    guideSubtitle: 'Cómo conectar 2 dispositivos y chatear con total discreción',
    tabQuickstart: '1. Inicio Rápido',
    tabConnect: '2. Conectar 2 Dispositivos',
    tabAutodestruct: '3. Autodestrucción 60s',
    tabSecurity: '4. Seguridad y Emergencia',
    guideGotIt: 'Entendido',
  },
};
