import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  QrCode, 
  Key, 
  Flame, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  Copy, 
  Check, 
  Laptop, 
  Smartphone,
  Globe
} from 'lucide-react';
import type { Language } from '../types';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPublicKeyHex: string;
  myFingerprint: string;
  onOpenScanQR: () => void;
  onOpenPasteKey: () => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  myPublicKeyHex,
  myFingerprint,
  onOpenScanQR,
  onOpenPasteKey,
  lang,
  onLangChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'quickstart' | 'connect' | 'autodestruct' | 'security'>('quickstart');

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(myPublicKeyHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      id="guide-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="guide-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0F0F12] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F23] bg-[#0A0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                {lang === 'fr' && "Guide & Mode d'Emploi"}
                {lang === 'en' && "User Guide & Instructions"}
                {lang === 'es' && "Guía y Modo de Empleo"}
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono-code font-semibold">
                  P2P 100% RAM
                </span>
              </h2>
              <p className="text-xs text-[#71717A]">
                {lang === 'fr' && "Comment connecter 2 personnes et échanger en toute discrétion"}
                {lang === 'en' && "How to connect 2 devices and chat with absolute privacy"}
                {lang === 'es' && "Cómo conectar 2 dispositivos y chatear con total discreción"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher inside Guide */}
            <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-lg p-0.5 text-[11px] font-semibold font-mono-code">
              <button
                type="button"
                onClick={() => onLangChange('fr')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  lang === 'fr' ? 'bg-indigo-600 text-white' : 'text-[#71717A] hover:text-white'
                }`}
                title="Français"
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => onLangChange('en')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  lang === 'en' ? 'bg-indigo-600 text-white' : 'text-[#71717A] hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLangChange('es')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  lang === 'es' ? 'bg-indigo-600 text-white' : 'text-[#71717A] hover:text-white'
                }`}
                title="Español"
              >
                ES
              </button>
            </div>

            <button
              id="guide-modal-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#71717A] hover:text-white hover:bg-[#18181B] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1F1F23] bg-[#0A0A0C] px-4 overflow-x-auto gap-1 text-xs">
          <button
            onClick={() => setActiveTab('quickstart')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'quickstart'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {lang === 'fr' && '1. Démarrage Rapide'}
            {lang === 'en' && '1. Quickstart'}
            {lang === 'es' && '1. Inicio Rápido'}
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'connect'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {lang === 'fr' && '2. Connecter 2 Appareils'}
            {lang === 'en' && '2. Connect 2 Devices'}
            {lang === 'es' && '2. Conectar 2 Dispositivos'}
          </button>
          <button
            onClick={() => setActiveTab('autodestruct')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'autodestruct'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {lang === 'fr' && '3. Auto-Destruction 60s'}
            {lang === 'en' && '3. 60s Auto-Destruct'}
            {lang === 'es' && '3. Autodestrucción 60s'}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            {lang === 'fr' && '4. Sécurité & Urgence'}
            {lang === 'en' && '4. Security & Panic'}
            {lang === 'es' && '4. Seguridad y Emergencia'}
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-[#A1A1AA]">
          {/* TAB 1: QUICKSTART */}
          {activeTab === 'quickstart' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200">
                <h4 className="font-semibold text-white flex items-center gap-2 mb-1 text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  {lang === 'fr' && 'Réseau social 100% anonyme & éphémère'}
                  {lang === 'en' && '100% Anonymous & Ephemeral Social Network'}
                  {lang === 'es' && 'Red social 100% anónima y efímera'}
                </h4>
                <p className="text-xs text-indigo-200/80 leading-relaxed">
                  {lang === 'fr' && "Pas de base de données, pas d'inscription, aucun stockage sur disque ou serveur. Vos messages ne vivent que dans la mémoire vive (RAM) de vos appareils et s'autodétruisent aussi bien chez l'expéditeur que chez le destinataire."}
                  {lang === 'en' && "No databases, no signups, no disk or server logging. Messages exist exclusively in volatile RAM and automatically self-destruct for both the sender and the recipient."}
                  {lang === 'es' && "Sin bases de datos, sin registros, sin almacenamiento en disco o servidor. Tus mensajes solo viven en la memoria RAM volátil de tus dispositivos y se autodestruyen tanto para el emisor como para el receptor."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h5 className="font-semibold text-white text-xs">
                    {lang === 'fr' && 'Votre Clé X25519'}
                    {lang === 'en' && 'Your X25519 Key'}
                    {lang === 'es' && 'Tu Clave X25519'}
                  </h5>
                  <p className="text-[11px] text-[#71717A] leading-normal">
                    {lang === 'fr' && 'Générée aléatoirement en mémoire vive à chaque session, sans aucun compte requis.'}
                    {lang === 'en' && 'Randomly generated in volatile RAM on every session, no account needed.'}
                    {lang === 'es' && 'Generada aleatoriamente en memoria RAM en cada sesión, sin necesidad de cuenta.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h5 className="font-semibold text-white text-xs">
                    {lang === 'fr' && 'Connexion P2P'}
                    {lang === 'en' && 'P2P Connection'}
                    {lang === 'es' && 'Conexión P2P'}
                  </h5>
                  <p className="text-[11px] text-[#71717A] leading-normal">
                    {lang === 'fr' && 'Scannez le QR Code de votre ami ou collez sa clé pour ouvrir la chambre chiffrée.'}
                    {lang === 'en' && 'Scan your friend’s QR Code or paste their key to open the encrypted chamber.'}
                    {lang === 'es' && 'Escanea el código QR de tu amigo o pega su clave para abrir la cámara cifrada.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h5 className="font-semibold text-white text-xs">
                    {lang === 'fr' && 'Brûlage 60s'}
                    {lang === 'en' && '60s Auto-Burn'}
                    {lang === 'es' && 'Quema en 60s'}
                  </h5>
                  <p className="text-[11px] text-[#71717A] leading-normal">
                    {lang === 'fr' && 'Tout message envoyé ou lu est incinéré et écrasé en RAM sous 60 secondes.'}
                    {lang === 'en' && 'Every message sent or opened is incinerated and overwritten in RAM within 60s.'}
                    {lang === 'es' && 'Todo mensaje enviado o leído es incinerado y sobreescrito en RAM en 60s.'}
                  </p>
                </div>
              </div>

              {/* Your current key box */}
              <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#71717A] font-medium">
                    {lang === 'fr' && 'Votre empreinte publique actuelle :'}
                    {lang === 'en' && 'Your current public fingerprint:'}
                    {lang === 'es' && 'Tu huella pública actual:'}
                  </span>
                  <span className="font-mono-code text-indigo-400 font-bold">{myFingerprint}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={myPublicKeyHex}
                    className="flex-1 bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-1.5 text-[11px] font-mono-code text-[#A1A1AA] select-all truncate"
                  />
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>
                      {copied 
                        ? (lang === 'fr' ? 'Copié !' : lang === 'es' ? '¡Copiado!' : 'Copied!')
                        : (lang === 'fr' ? 'Copier' : lang === 'es' ? 'Copiar' : 'Copy')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECTING 2 PEERS */}
          {activeTab === 'connect' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-semibold text-white text-sm">
                {lang === 'fr' && '3 Méthodes pour connecter deux personnes :'}
                {lang === 'en' && '3 Methods to connect two people:'}
                {lang === 'es' && '3 Métodos para conectar a dos personas:'}
              </h4>

              {/* Method A */}
              <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                <div className="flex items-center gap-2 text-white font-medium text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-400">
                    {lang === 'fr' && 'Méthode 1 : Scan QR Code (Deux téléphones ou PC + Mobile)'}
                    {lang === 'en' && 'Method 1: QR Code Scan (Two phones or PC + Mobile)'}
                    {lang === 'es' && 'Método 1: Escaneo Código QR (Dos móviles o PC + Móvil)'}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {lang === 'fr' && (
                    <>
                      1. Sur le 1er appareil, cliquez sur l'icône QR code en haut pour afficher votre code.<br />
                      2. Sur le 2ème appareil, cliquez sur le bouton <strong>"Scan QR"</strong>.<br />
                      3. Visez le QR code avec la caméra : la chambre privée s'ouvre immédiatement sur les deux appareils !
                    </>
                  )}
                  {lang === 'en' && (
                    <>
                      1. On the 1st device, click the QR icon at the top to display your code.<br />
                      2. On the 2nd device, click the <strong>"Scan QR"</strong> button.<br />
                      3. Point your camera at the QR code: the private chamber opens immediately on both devices!
                    </>
                  )}
                  {lang === 'es' && (
                    <>
                      1. En el 1er dispositivo, haz clic en el icono QR arriba para mostrar tu código.<br />
                      2. En el 2º dispositivo, haz clic en el botón <strong>"Escanear QR"</strong>.<br />
                      3. Apunta la cámara al código QR: ¡la cámara privada se abre al instante en ambos dispositivos!
                    </>
                  )}
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => { onClose(); onOpenScanQR(); }}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'fr' && 'Ouvrir le Scanner QR'}
                      {lang === 'en' && 'Open QR Scanner'}
                      {lang === 'es' && 'Abrir Escáner QR'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Method B */}
              <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                <div className="flex items-center gap-2 text-white font-medium text-xs">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-indigo-400">
                    {lang === 'fr' && 'Méthode 2 : À distance via Copier/Coller de Clé'}
                    {lang === 'en' && 'Method 2: Remote Connection via Copy/Paste Key'}
                    {lang === 'es' && 'Método 2: A distancia mediante Copiar/Pegar Clave'}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {lang === 'fr' && (
                    <>
                      1. Cliquez sur le bouton <strong>Copier</strong> de votre identité dans la barre du haut.<br />
                      2. Envoyez cette clé publique à votre contact (via SMS, Signal, etc.).<br />
                      3. Votre contact clique sur <strong>"Coller une Clé"</strong>, colle votre clé et valide !
                    </>
                  )}
                  {lang === 'en' && (
                    <>
                      1. Click <strong>Copy</strong> next to your identity in the top bar.<br />
                      2. Send your public key to your contact (via SMS, Signal, etc.).<br />
                      3. Your contact clicks <strong>"Paste Key"</strong>, pastes your key, and connects!
                    </>
                  )}
                  {lang === 'es' && (
                    <>
                      1. Haz clic en <strong>Copiar</strong> junto a tu identidad en la barra superior.<br />
                      2. Envía tu clave pública a tu contacto (por SMS, Signal, etc.).<br />
                      3. Tu contacto hace clic en <strong>"Pegar Clave"</strong>, pega tu clave y ¡conecta!
                    </>
                  )}
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => { onClose(); onOpenPasteKey(); }}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'fr' && 'Coller une Clé Contact'}
                      {lang === 'en' && 'Paste Contact Key'}
                      {lang === 'es' && 'Pegar Clave de Contacto'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Method C */}
              <div className="p-4 rounded-xl bg-[#141417] border border-[#27272A] space-y-2">
                <div className="flex items-center gap-2 text-white font-medium text-xs">
                  <Laptop className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-purple-400">
                    {lang === 'fr' && 'Méthode 3 : Test local sur le même ordinateur (2 Onglets)'}
                    {lang === 'en' && 'Method 3: Local Test on the same device (2 Browser Tabs)'}
                    {lang === 'es' && 'Método 3: Prueba local en el mismo ordenador (2 Pestañas)'}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {lang === 'fr' && "Ouvrez cette application dans un second onglet de votre navigateur ! Copiez la clé de l'onglet 1 et collez-la dans l'onglet 2. Les deux onglets communiqueront instantanément en P2P direct !"}
                  {lang === 'en' && "Open this app in a second tab of your browser! Copy the public key from Tab 1 and paste it into Tab 2. Both tabs will establish a direct instant P2P channel!"}
                  {lang === 'es' && "¡Abre esta aplicación en una segunda pestaña de tu navegador! Copia la clave de la pestaña 1 y pégala en la pestaña 2. ¡Ambas pestañas se comunicarán al instante en P2P directo!"}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO-DESTRUCT & BURN */}
          {activeTab === 'autodestruct' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200">
                <h4 className="font-semibold text-white flex items-center gap-2 mb-1 text-sm">
                  <Flame className="w-4 h-4 text-red-400" />
                  {lang === 'fr' && 'Suppression automatique pour l’expéditeur ET le destinataire'}
                  {lang === 'en' && 'Automatic Deletion for BOTH Sender and Recipient'}
                  {lang === 'es' && 'Eliminación automática para EMISOR y RECEPTOR'}
                </h4>
                <p className="text-xs text-red-200/80 leading-relaxed">
                  {lang === 'fr' && "Le message envoyé commence immédiatement son compte à rebours de 60 secondes. À la fin, la mémoire vive est nettoyée des deux côtés."}
                  {lang === 'en' && "Sent messages immediately start their 60-second countdown. At zero, memory is wiped on both ends."}
                  {lang === 'es' && "El mensaje emitido inicia de inmediato su cuenta regresiva de 60 segundos. Al llegar a cero, la memoria se borra en ambos lados."}
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A]">
                  <strong className="text-white block mb-1">
                    {lang === 'fr' && '1. Côté Expéditeur (Vous qui envoyez) :'}
                    {lang === 'en' && '1. Sender Side (You who sent):'}
                    {lang === 'es' && '1. Lado Emisor (Tú que envías):'}
                  </strong>
                  {lang === 'fr' && 'Votre message commence immédiatement son décompte de 60s avec une jauge visuelle. À 0s, il est écrasé en mémoire et remplacé par une stèle de cendres ("Message émis détruit").'}
                  {lang === 'en' && 'Your message starts a 60s countdown immediately with a visual progress bar. At 0s, RAM is zeroed and replaced by ashes ("Sent message destroyed").'}
                  {lang === 'es' && 'Tu mensaje inicia inmediatamente un conteo de 60s con una barra visual. A los 0s, se sobreescribe en RAM y se sustituye por cenizas ("Mensaje emitido destruido").'}
                </div>

                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A]">
                  <strong className="text-white block mb-1">
                    {lang === 'fr' && '2. Côté Destinataire (Celui qui reçoit) :'}
                    {lang === 'en' && '2. Recipient Side (Receiver):'}
                    {lang === 'es' && '2. Lado Receptor (Quien recibe):'}
                  </strong>
                  {lang === 'fr' && 'Le message arrive scellé et chiffré. Dès le clic sur "Déchiffrer", le contenu se révèle et le compte à rebours de 60s commence.'}
                  {lang === 'en' && 'The capsule arrives sealed and encrypted. Upon clicking "Decrypt", plaintext reveals and the 60s countdown triggers.'}
                  {lang === 'es' && 'El mensaje llega sellado y cifrado. Al hacer clic en "Descifrar", el contenido se revela y comienza la cuenta de 60s.'}
                </div>

                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A]">
                  <strong className="text-white block mb-1">
                    {lang === 'fr' && '3. Bouton rouge "Brûler maintenant" :'}
                    {lang === 'en' && '3. Red "Burn Now" Button:'}
                    {lang === 'es' && '3. Botón rojo "Quemar ahora":'}
                  </strong>
                  {lang === 'fr' && 'Sur chaque message en cours de décompte, cliquez sur "Brûler" pour le détruire instantanément des deux côtés sans attendre les 60 secondes.'}
                  {lang === 'en' && 'Click the red "Burn" button on any active message to destroy it immediately on both screens without waiting for 60 seconds.'}
                  {lang === 'es' && 'Haz clic en el botón rojo "Quemar" en cualquier mensaje activo para destruirlo de inmediato en ambas pantallas sin esperar los 60 segundos.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & PANIC BUTTON */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-semibold text-white text-sm">
                {lang === 'fr' && 'Fonctionnalités de Sécurité Avancée'}
                {lang === 'en' && 'Advanced Security Features'}
                {lang === 'es' && 'Funciones de Seguridad Avanzada'}
              </h4>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A] space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <span>
                      {lang === 'fr' && 'Bouton de Panique / Régénération de Clé'}
                      {lang === 'en' && 'Panic Button / Key Regeneration'}
                      {lang === 'es' && 'Botón de Pánico / Regeneración de Clave'}
                    </span>
                  </div>
                  <p className="text-[#71717A] leading-relaxed">
                    {lang === 'fr' && 'Le bouton "Régénérer" dans la barre du haut efface instantanément votre clé privée actuelle de la RAM avec des zéros, purge tous les messages visibles, et rompt définitivement toutes les chambres ouvertes.'}
                    {lang === 'en' && 'The "Regenerate" button in the top bar immediately wipes your current private key with zeros, purges all visible messages, and severs all active connections.'}
                    {lang === 'es' && 'El botón "Regenerar" en la barra superior borra de inmediato tu clave privada actual con ceros en RAM, purga todos los mensajes y corta todas las conexiones.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#141417] border border-[#27272A] space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>
                      {lang === 'fr' && 'Triple Canal de Transmission'}
                      {lang === 'en' && 'Triple Channel Transmission'}
                      {lang === 'es' && 'Triple Canal de Transmisión'}
                    </span>
                  </div>
                  <p className="text-[#71717A] leading-relaxed">
                    {lang === 'fr' && 'Les flux transitent en priorité par un canal direct WebRTC. En cas de pare-feu réseau complexe, le relais mesh éphémère sans log assure une livraison instantanée en RAM.'}
                    {lang === 'en' && 'Traffic prioritizes direct WebRTC DataChannels. If firewalls restrict P2P, the zero-log ephemeral mesh relay routes payloads in RAM.'}
                    {lang === 'es' && 'El tráfico prioriza canales directos WebRTC. Si hay cortafuegos, los repetidores malla efímeros sin registro aseguran la entrega en RAM.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#1F1F23] bg-[#0A0A0C]">
          <span className="text-[11px] text-[#71717A] font-mono-code">
            X25519 • Zero-Backend • Pure RAM
          </span>

          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all cursor-pointer"
          >
            {lang === 'fr' && "J'ai compris"}
            {lang === 'en' && "Got it"}
            {lang === 'es' && "Entendido"}
          </button>
        </div>
      </div>
    </div>
  );
};
