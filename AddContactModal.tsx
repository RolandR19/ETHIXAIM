import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Clipboard, 
  ExternalLink, 
  ArrowRight, 
  QrCode, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { isValidPublicKey, deriveFingerprint } from '../lib/crypto';
import { QRScanner } from './QRScanner';
import type { Language } from '../types';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectPeer: (publicKeyHex: string, nickname?: string) => void;
  myPublicKeyHex: string;
  initialTab?: 'scan' | 'paste';
  lang?: Language;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onConnectPeer,
  myPublicKeyHex,
  initialTab = 'scan',
  lang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'paste'>(initialTab);
  const [recipientKey, setRecipientKey] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setRecipientKey('');
      setNickname('');
      setError(null);
      setScannedSuccess(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const cleanKey = recipientKey.trim().replace(/^0x/i, '');
  const isValid = isValidPublicKey(cleanKey);
  const isSelf = cleanKey.toLowerCase() === myPublicKeyHex.toLowerCase();
  const fingerprint = isValid ? deriveFingerprint(cleanKey) : null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipientKey(text.trim());
      setError(null);
    } catch {
      setError(
        lang === 'fr' 
          ? 'Accès au presse-papier refusé. Veuillez coller la clé manuellement.' 
          : lang === 'es' 
          ? 'Acceso al portapapeles denegado. Pega la clave manualmente.' 
          : 'Clipboard access denied. Please manually paste the key.'
      );
    }
  };

  const handleOpenPeerInNewTab = () => {
    window.open(window.location.href, '_blank', 'width=520,height=750');
  };

  const handleScanSuccess = (scannedKey: string) => {
    setRecipientKey(scannedKey);
    setScannedSuccess(true);
    setError(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanKey) {
      setError(
        lang === 'fr' 
          ? 'Veuillez saisir une clé de contact ou scanner un code QR.' 
          : lang === 'es' 
          ? 'Por favor introduce una clave de contacto o escanea un código QR.' 
          : 'Please provide recipient Unique Contact Key or scan a QR code.'
      );
      return;
    }
    if (!isValid) {
      setError(
        lang === 'fr' 
          ? 'Format de clé invalide. Doit comporter 64 caractères hexadécimaux.' 
          : lang === 'es' 
          ? 'Formato de clave inválido. Debe tener 64 caracteres hexadecimales.' 
          : 'Invalid key format. Must be a 64-character hexadecimal public key.'
      );
      return;
    }
    if (isSelf) {
      setError(
        lang === 'fr' 
          ? 'Vous ne pouvez pas ouvrir une chambre avec votre propre clé. Ouvrez un second onglet pour tester.' 
          : lang === 'es' 
          ? 'No puedes abrir una cámara con tu propia clave. Abre una segunda pestaña para probar.' 
          : 'You cannot open a private chamber with your own key. Open a second tab to test.'
      );
      return;
    }

    onConnectPeer(cleanKey, nickname.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="add-contact-modal"
        className="relative w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-6 shadow-2xl text-[#A1A1AA] flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {lang === 'fr' && 'Initier une Connexion P2P'}
                {lang === 'en' && 'Initiate Contact Handshake'}
                {lang === 'es' && 'Iniciar Conexión P2P'}
              </h2>
              <p className="text-xs text-[#71717A]">
                {lang === 'fr' && 'Chambre Chiffrée • Zéro Serveur Intermédiaire'}
                {lang === 'en' && 'P2P Chamber Pairing • Zero-Server Discovery'}
                {lang === 'es' && 'Emparejamiento P2P • Cero Servidores'}
              </p>
            </div>
          </div>
          <button
            id="close-add-contact-btn"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Scan QR vs Manual Key */}
        <div className="flex items-center gap-2 p-1 bg-[#0C0C0E] border border-[#27272A] rounded-xl my-4 shrink-0">
          <button
            type="button"
            id="tab-scan-qr-btn"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-[#18181B] text-white shadow-sm border border-[#27272A]'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>
              {lang === 'fr' && 'Scanner un QR Code'}
              {lang === 'en' && 'Scan QR Code'}
              {lang === 'es' && 'Escanear Código QR'}
            </span>
          </button>
          <button
            type="button"
            id="tab-paste-key-btn"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-[#18181B] text-white shadow-sm border border-[#27272A]'
                : 'text-[#71717A] hover:text-[#A1A1AA]'
            }`}
          >
            <Clipboard className="w-4 h-4 text-indigo-400" />
            <span>
              {lang === 'fr' && 'Coller une Clé'}
              {lang === 'en' && 'Enter / Paste Key'}
              {lang === 'es' && 'Pegar Clave'}
            </span>
          </button>
        </div>

        {/* Tab 1: Live QR Scanner View */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {!scannedSuccess ? (
              <>
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  myPublicKeyHex={myPublicKeyHex}
                />
                <p className="text-center text-xs text-[#71717A]">
                  {lang === 'fr' && 'Pointez votre caméra vers le QR code ou chargez une capture d’écran'}
                  {lang === 'en' && 'Point your camera at a contact’s QR code or upload a QR screenshot'}
                  {lang === 'es' && 'Apunta tu cámara al código QR o sube una captura de pantalla'}
                </p>
              </>
            ) : (
              /* Scanned Key Confirmation Screen */
              <div className="space-y-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {lang === 'fr' && 'QR Code Reconnu !'}
                      {lang === 'en' && 'QR Code Recognized!'}
                      {lang === 'es' && '¡Código QR Reconocido!'}
                    </h3>
                    <p className="text-xs text-emerald-300/80">
                      {lang === 'fr' && 'Clé publique cryptographique vérifiée'}
                      {lang === 'en' && 'Valid cryptographic public key verified'}
                      {lang === 'es' && 'Clave pública criptográfica verificada'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#0C0C0E] border border-[#27272A] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#71717A]">
                      {lang === 'fr' ? 'Empreinte du contact :' : lang === 'es' ? 'Huella del contacto :' : 'Peer Fingerprint:'}
                    </span>
                    <span className="font-mono-code text-indigo-400 font-semibold">{fingerprint}</span>
                  </div>
                  <div className="text-[11px] font-mono-code text-[#71717A] truncate">
                    {cleanKey}
                  </div>
                </div>

                {/* Optional Nickname for Chamber */}
                <div className="space-y-1.5">
                  <label htmlFor="scanned-contact-nickname-input" className="text-xs text-[#71717A] font-medium">
                    {lang === 'fr' && 'Pseudo pour la chambre (Facultatif, en RAM uniquement)'}
                    {lang === 'en' && 'Chamber Label (Optional, volatile in RAM only)'}
                    {lang === 'es' && 'Apodo de la cámara (Opcional, en RAM únicamente)'}
                  </label>
                  <input
                    id="scanned-contact-nickname-input"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder={lang === 'fr' ? 'ex: Alice' : lang === 'es' ? 'ej: Alicia' : 'e.g. Alice'}
                    maxLength={24}
                    className="w-full px-3.5 py-2.5 bg-[#0C0C0E] border border-[#27272A] rounded-xl text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScannedSuccess(false);
                      setRecipientKey('');
                    }}
                    className="flex items-center gap-1.5 py-2 px-3 bg-[#18181B] border border-[#27272A] hover:bg-[#27272A] rounded-xl text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {lang === 'fr' ? 'Scanner à nouveau' : lang === 'es' ? 'Escanear de nuevo' : 'Scan Again'}
                    </span>
                  </button>
                  <button
                    type="button"
                    id="connect-scanned-peer-btn"
                    onClick={() => handleSubmit()}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <span>
                      {lang === 'fr' ? 'Ouvrir la Chambre Privée' : lang === 'es' ? 'Abrir Cámara Privada' : 'Connect & Open Chamber'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Manual Key Entry View */}
        {activeTab === 'paste' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[#71717A]">
                <label htmlFor="recipient-key-input" className="font-medium text-white">
                  {lang === 'fr' && 'Clé de Contact du Destinataire *'}
                  {lang === 'en' && 'Recipient Unique Contact Key *'}
                  {lang === 'es' && 'Clave de Contacto del Destinatario *'}
                </label>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'fr' ? 'Coller' : lang === 'es' ? 'Pegar' : 'Paste'}
                  </span>
                </button>
              </div>
              
              <textarea
                id="recipient-key-input"
                rows={3}
                value={recipientKey}
                onChange={(e) => {
                  setRecipientKey(e.target.value);
                  setError(null);
                }}
                placeholder={
                  lang === 'fr' 
                    ? 'Collez la clé publique (64 caractères hexadécimaux)...' 
                    : lang === 'es' 
                    ? 'Pega la clave pública (64 caracteres hexadecimales)...' 
                    : 'Paste 64-character hex contact key (e.g. 7f3b89a...)'
                }
                className="w-full px-3.5 py-2.5 bg-[#0C0C0E] border border-[#27272A] rounded-xl text-xs font-mono-code text-[#A1A1AA] placeholder:text-[#52525B] focus:outline-none focus:border-indigo-500 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Validation Feedback */}
            {cleanKey && (
              <div className="text-xs space-y-1">
                {isValid && !isSelf ? (
                  <div className="flex items-center gap-2 p-2.5 bg-indigo-950/20 border border-indigo-500/30 rounded-lg text-indigo-300">
                    <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <span className="text-[#71717A]">
                        {lang === 'fr' ? 'Empreinte validée : ' : lang === 'es' ? 'Huella validada : ' : 'Verified Fingerprint: '}
                      </span>
                      <strong className="font-mono-code text-indigo-300">{fingerprint}</strong>
                    </div>
                  </div>
                ) : isSelf ? (
                  <div className="flex items-center gap-2 p-2.5 bg-red-950/20 border border-red-500/30 rounded-lg text-red-300">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      {lang === 'fr' 
                        ? 'C’est votre propre clé publique. Entrez la clé de votre contact.' 
                        : lang === 'es' 
                        ? 'Esta es tu propia clave pública. Introduce la clave de tu contacto.' 
                        : 'That is your own public key. Enter a peer’s key.'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {lang === 'fr' 
                        ? `Clé incomplète (${cleanKey.length}/64 caractères hex)` 
                        : lang === 'es' 
                        ? `Clave incompleta (${cleanKey.length}/64 caracteres hex)` 
                        : `Incomplete key (${cleanKey.length}/64 characters hex)`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Optional Nickname */}
            <div className="space-y-1.5">
              <label htmlFor="contact-nickname-input" className="text-xs text-[#71717A] font-medium">
                {lang === 'fr' && 'Pseudo pour la chambre (Facultatif)'}
                {lang === 'en' && 'Chamber Label (Optional)'}
                {lang === 'es' && 'Apodo de la cámara (Opcional)'}
              </label>
              <input
                id="contact-nickname-input"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={lang === 'fr' ? 'ex: Alice' : lang === 'es' ? 'ej: Alicia' : 'e.g. Alice'}
                maxLength={24}
                className="w-full px-3.5 py-2.5 bg-[#0C0C0E] border border-[#27272A] rounded-xl text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] text-xs font-medium transition-colors cursor-pointer"
              >
                {lang === 'fr' ? 'Annuler' : lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                id="open-secure-channel-btn"
                type="submit"
                disabled={!isValid || isSelf}
                className={`flex items-center gap-2 py-2 px-5 rounded-xl text-xs font-semibold transition-all ${
                  isValid && !isSelf
                    ? 'bg-white hover:bg-zinc-200 text-black shadow-md cursor-pointer'
                    : 'bg-[#27272A] text-[#52525B] cursor-not-allowed'
                }`}
              >
                <span>
                  {lang === 'fr' ? 'Ouvrir la Chambre Sécurisée' : lang === 'es' ? 'Abrir Cámara Segura' : 'Establish Secure Channel'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Global Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-950/20 border border-red-500/30 rounded-lg text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Peer Testing Helper Button */}
        <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between text-xs text-[#71717A] shrink-0">
          <span>
            {lang === 'fr' ? 'Vous testez seul ?' : lang === 'es' ? '¿Probando tú solo?' : 'Testing by yourself?'}
          </span>
          <button
            type="button"
            onClick={handleOpenPeerInNewTab}
            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>
              {lang === 'fr' ? 'Ouvrir un Contact dans un 2ème onglet' : lang === 'es' ? 'Abrir Contacto en 2ª pestaña' : 'Open Peer in New Window'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
