import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Key, Copy, Check, RefreshCw, ShieldAlert, X, QrCode } from 'lucide-react';
import type { KeyPair, Language } from '../types';

interface KeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyPair: KeyPair;
  onRegenerateKey: () => void;
  lang?: Language;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({
  isOpen,
  onClose,
  keyPair,
  onRegenerateKey,
  lang = 'en',
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfirmRegen, setShowConfirmRegen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && keyPair.publicKeyHex) {
      QRCode.toDataURL(keyPair.publicKeyHex, {
        width: 260,
        margin: 1,
        color: {
          dark: '#6366f1', // indigo-500
          light: '#0C0C0E', // deep dark background
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [isOpen, keyPair.publicKeyHex]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(keyPair.publicKeyHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmRegeneration = () => {
    setShowConfirmRegen(false);
    onRegenerateKey();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        id="key-manager-modal"
        className="relative w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-6 shadow-2xl text-[#A1A1AA]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Key className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                {lang === 'fr' && 'Votre Clé Cryptographique de Contact'}
                {lang === 'en' && 'Your Unique Contact Key'}
                {lang === 'es' && 'Tu Clave Criptográfica de Contacto'}
              </h2>
              <p className="text-xs text-[#71717A]">
                {lang === 'fr' && 'Identité X25519 Asymétrique Éphémère'}
                {lang === 'en' && 'X25519 Ephemeral Asymmetric Identity'}
                {lang === 'es' && 'Identidad Asimétrica Efímera X25519'}
              </p>
            </div>
          </div>
          <button
            id="close-key-manager-btn"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!showConfirmRegen ? (
          <div className="space-y-5 pt-4">
            {/* Fingerprint & Key Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#71717A]">
                <span>
                  {lang === 'fr' && 'Empreinte Cryptographique'}
                  {lang === 'en' && 'Cryptographic Fingerprint'}
                  {lang === 'es' && 'Huella Criptográfica'}
                </span>
                <span className="text-indigo-400 font-mono-code font-semibold">{keyPair.fingerprint}</span>
              </div>

              <div className="p-3.5 bg-[#0C0C0E] border border-[#1F1F23] rounded-xl">
                <div className="text-[11px] font-mono-code text-[#A1A1AA] break-all select-all leading-relaxed">
                  {keyPair.publicKeyHex}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  id="copy-my-key-btn"
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-white">
                        {lang === 'fr' && 'Clé Copiée dans le Presse-papier'}
                        {lang === 'en' && 'Key Copied to Clipboard'}
                        {lang === 'es' && 'Clave Copiada al Portapapeles'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>
                        {lang === 'fr' && 'Copier la Clé Publique Complète'}
                        {lang === 'en' && 'Copy Full Public Key'}
                        {lang === 'es' && 'Copiar Clave Pública Completa'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center p-4 bg-[#0C0C0E] border border-[#1F1F23] rounded-xl">
              <div className="flex items-center gap-2 text-xs text-[#71717A] mb-3">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>
                  {lang === 'fr' && 'Scanner pour une liaison directe instantanée'}
                  {lang === 'en' && 'Scan for Instant Out-of-Band Pairing'}
                  {lang === 'es' && 'Escanear para emparejamiento directo'}
                </span>
              </div>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Contact Key QR"
                  className="w-44 h-44 rounded-lg border border-[#27272A] p-1.5 bg-[#0C0C0E]"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-[#71717A]">
                  {lang === 'fr' ? 'Génération QR...' : lang === 'es' ? 'Generando QR...' : 'Generating QR...'}
                </div>
              )}
            </div>

            {/* Regenerate Action */}
            <div className="pt-2 border-t border-[#27272A] flex items-center justify-between">
              <div className="text-xs text-[#71717A] max-w-[280px]">
                {lang === 'fr' && 'Couper toutes les liaisons et détruire cette identité ?'}
                {lang === 'en' && 'Sever all channels and destroy prior identity?'}
                {lang === 'es' && '¿Cortar todos los canales y destruir esta identidad?'}
              </div>
              <button
                id="start-regenerate-key-btn"
                onClick={() => setShowConfirmRegen(true)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-lg border border-[#27272A] hover:bg-[#27272A] text-red-400 hover:text-red-300 text-xs font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {lang === 'fr' && 'Régénérer la Clé'}
                  {lang === 'en' && 'Regenerate Key'}
                  {lang === 'es' && 'Regenerar Clave'}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Confirmation Warning for Key Regeneration */
          <div className="space-y-4 pt-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex gap-3.5 text-red-200">
              <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-xs leading-relaxed">
                <p className="font-semibold text-sm text-red-300">
                  {lang === 'fr' && 'Voulez-vous vraiment régénérer votre clé ?'}
                  {lang === 'en' && 'Are you sure you want to regenerate your key?'}
                  {lang === 'es' && '¿Seguro que deseas regenerar tu clave?'}
                </p>
                <p className="text-[#A1A1AA]">
                  {lang === 'fr' && (
                    <>Cela va <strong className="text-white">immédiatement détruire et écraser par des zéros</strong> votre clé privée en mémoire RAM.</>
                  )}
                  {lang === 'en' && (
                    <>This will <strong className="text-white">instantly destroy and zero-scrub</strong> your current private key from browser RAM.</>
                  )}
                  {lang === 'es' && (
                    <>Esto va a <strong className="text-white">destruir y sobreescribir con ceros de inmediato</strong> tu clave privada en la memoria RAM.</>
                  )}
                </p>
                <p className="text-[#71717A]">
                  {lang === 'fr' && 'Toutes les chambres privées ouvertes seront immédiatement rompues.'}
                  {lang === 'en' && 'All active channels will be severed. Contacts with your old key cannot reach you.'}
                  {lang === 'es' && 'Todas las conexiones activas se cortarán de inmediato.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="cancel-regenerate-btn"
                onClick={() => setShowConfirmRegen(false)}
                className="py-2 px-4 rounded-xl border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] text-xs font-medium transition-colors cursor-pointer"
              >
                {lang === 'fr' && 'Annuler'}
                {lang === 'en' && 'Cancel'}
                {lang === 'es' && 'Cancelar'}
              </button>
              <button
                id="confirm-regenerate-btn"
                onClick={confirmRegeneration}
                className="flex items-center gap-2 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {lang === 'fr' && 'Détruire & Régénérer'}
                  {lang === 'en' && 'Destroy & Regenerate Now'}
                  {lang === 'es' && 'Destruir y Regenerar'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
