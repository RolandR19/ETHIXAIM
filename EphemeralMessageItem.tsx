import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Flame, 
  Play, 
  Pause, 
  Check, 
  CheckCheck, 
  Clock, 
  Volume2, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import type { MessageRecord, Language } from '../types';
import { playDecryptSound, playBurnSound } from '../lib/sounds';
import { translations } from '../lib/i18n';

interface EphemeralMessageItemProps {
  message: MessageRecord;
  onOpenMessage: (messageId: string) => void;
  onBurnMessage: (messageId: string) => void;
  lang?: Language;
}

export const EphemeralMessageItem: React.FC<EphemeralMessageItemProps> = ({
  message,
  onOpenMessage,
  onBurnMessage,
  lang = 'en',
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = translations[lang];

  // When status is 'opened_counting', manage the 60-second countdown
  useEffect(() => {
    if (message.status !== 'opened_counting') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - (message.openedAt || now)) / 1000);
      const remaining = Math.max(0, 60 - elapsed);

      if (remaining <= 0) {
        clearInterval(interval);
        playBurnSound();
        onBurnMessage(message.id);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [message.status, message.openedAt, message.id, onBurnMessage]);

  const handleOpen = () => {
    playDecryptSound();
    onOpenMessage(message.id);
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // -------------------------------------------------------------
  // RENDER: 1. BURNED & PURGED STATE (Tombstone)
  // -------------------------------------------------------------
  if (message.status === 'burned_purged') {
    return (
      <div 
        id={`message-burned-${message.id}`}
        className={`flex ${message.isOutgoing ? 'justify-end' : 'justify-start'} my-2.5 opacity-60 transition-opacity`}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#18181B]/80 border border-[#1F1F23] text-[11px] font-mono-code text-[#71717A]">
          <Flame className="w-3.5 h-3.5 text-red-500/70" />
          <span>
            {message.isOutgoing 
              ? t.capsuleDestroyedSender 
              : t.capsuleDestroyedRecipient}
          </span>
          <span className="text-[10px] text-[#52525B]">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 2. SEALED ENCRYPTED STATE
  // -------------------------------------------------------------
  if (message.status === 'received_sealed' && !message.isOutgoing) {
    return (
      <div 
        id={`message-sealed-${message.id}`}
        className="flex justify-start my-3 animate-fade-in"
      >
        <div className="max-w-md w-full p-4 rounded-2xl rounded-bl-none bg-[#18181B] border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)] text-[#A1A1AA] relative">
          <div className="absolute -top-3 left-3 bg-[#09090B] px-2 text-[10px] font-mono text-indigo-400 border border-[#1F1F23] rounded">
            Encrypted Payload (X25519)
          </div>

          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#27272A] text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              <span className="font-medium text-white">{t.sealedCapsuleTitle}</span>
            </div>
            <span className="text-[10px] text-[#71717A] font-mono-code">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="p-3 bg-[#0C0C0E] border border-[#1F1F23] rounded-xl flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-white">X25519 PFS Ephemeral Payload</p>
              <p className="text-[11px] text-[#71717A]">{t.sealedCapsuleDesc}</p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium font-mono-code">
              <Clock className="w-3.5 h-3.5" />
              <span>60s</span>
            </div>
            <button
              id={`decrypt-btn-${message.id}`}
              onClick={handleOpen}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(79,70,229,0.35)] transition-all cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{t.decryptButton}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: 3. OPENED / COUNTING DOWN OR OUTGOING MESSAGE
  // -------------------------------------------------------------
  const remaining = message.remainingSeconds ?? 60;
  const progressPercent = Math.max(0, Math.min(100, (remaining / 60) * 100));

  // Determine color scheme based on remaining time
  let timerColorClass = 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
  let barColorClass = 'bg-indigo-500';
  let isUrgent = false;

  if (remaining <= 15) {
    timerColorClass = 'text-red-500 border-red-500/40 bg-red-500/15 animate-pulse';
    barColorClass = 'bg-red-500';
    isUrgent = true;
  } else if (remaining <= 30) {
    timerColorClass = 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    barColorClass = 'bg-amber-400';
  }

  const content = message.decryptedContent;

  return (
    <div 
      id={`message-${message.id}`}
      className={`flex ${message.isOutgoing ? 'justify-end' : 'justify-start'} my-3 animate-fade-in`}
    >
      <div 
        className={`max-w-md w-full rounded-2xl border transition-all overflow-hidden relative ${
          message.isOutgoing
            ? 'bg-[#18181B] border-[#27272A] text-white rounded-br-none'
            : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] rounded-bl-none shadow-xl'
        }`}
      >
        {/* Encrypted tag badge */}
        {!message.isOutgoing && (
          <div className="absolute -top-3 left-3 bg-[#09090B] px-2 text-[10px] font-mono text-indigo-400 border border-[#1F1F23] rounded">
            Decrypted (RAM)
          </div>
        )}

        {/* Countdown Header Bar (for both outgoing and opened incoming messages) */}
        {message.status === 'opened_counting' && (
          <div className="bg-[#0C0C0E] border-b border-[#1F1F23] p-3 pt-3.5">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-500 animate-bounce' : 'text-indigo-400'}`} />
                <span className={`text-[11px] font-medium font-mono-code ${isUrgent ? 'text-red-500 font-bold animate-pulse' : 'text-[#A1A1AA]'}`}>
                  {isUrgent ? t.purgingIn(remaining) : (message.isOutgoing ? t.outgoingCapsule : t.activeCapsule)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Immediate Burn Button */}
                <button
                  type="button"
                  onClick={() => onBurnMessage(message.id)}
                  title={t.burnButton}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-mono-code font-semibold transition-colors cursor-pointer"
                >
                  <Flame className="w-3 h-3 text-red-400" />
                  <span>{t.burnButton}</span>
                </button>

                <div className={`px-2 py-0.5 rounded-full border text-[10px] font-mono-code font-semibold ${timerColorClass}`}>
                  {remaining}s
                </div>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full h-1 bg-[#27272A] rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className={`h-full transition-all duration-300 rounded-full ${barColorClass}`}
              />
            </div>
          </div>
        )}

        {/* Message Payload Body */}
        <div className="p-4 space-y-3">
          {content?.type === 'text' && (
            <p className="text-sm leading-relaxed text-white whitespace-pre-wrap select-text break-words">
              {content.text}
            </p>
          )}

          {content?.type === 'audio' && content.mediaBase64 && (
            <div className="p-3 bg-[#0C0C0E] border border-[#1F1F23] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500 flex items-center justify-center bg-indigo-500/10 text-indigo-400">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {lang === 'fr' ? 'Note Vocale' : lang === 'es' ? 'Nota de Voz' : 'Voice Note'}
                    </div>
                    {content.mediaDuration && (
                      <span className="text-[10px] text-[#71717A] font-mono-code">
                        0:{content.mediaDuration.toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={togglePlayAudio}
                  className="p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
              </div>

              <audio
                ref={audioRef}
                src={content.mediaBase64}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />

              {/* Waveform Simulator matching Design */}
              <div className="flex items-center gap-1 h-4 pt-1">
                {[...Array(18)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-full transition-all ${
                      i < 12 ? 'bg-indigo-500' : 'bg-zinc-700'
                    }`}
                    style={{ height: `${Math.sin(i * 0.7) * 8 + 10}px` }}
                  />
                ))}
              </div>
            </div>
          )}

          {content?.type === 'image' && content.mediaBase64 && (
            <div className="rounded-xl overflow-hidden border border-[#27272A] bg-black/60">
              <img
                src={content.mediaBase64}
                alt="Encrypted Payload"
                className="w-full max-h-72 object-contain rounded-xl"
              />
            </div>
          )}

          {content?.type === 'video' && content.mediaBase64 && (
            <div className="rounded-xl overflow-hidden border border-[#27272A] bg-black/60">
              <video
                src={content.mediaBase64}
                controls
                className="w-full max-h-72 rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Footer info & Delivery receipt */}
        <div className="px-4 pb-3 pt-1 flex items-center justify-between text-[10px] text-[#71717A] border-t border-[#1F1F23]">
          <span className="font-mono-code">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          <div className="flex items-center gap-1.5">
            {message.isOutgoing ? (
              <span className="flex items-center gap-1 text-indigo-400 font-mono-code">
                <span>P2P Direct</span>
                <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#71717A] font-mono-code">
                <span>Decrypted (RAM)</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
