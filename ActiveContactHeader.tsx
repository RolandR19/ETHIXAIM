import React, { useState } from 'react';
import { ShieldCheck, Zap, Globe, Repeat, X, Activity } from 'lucide-react';
import type { ActivePeer, Language } from '../types';
import { translations } from '../lib/i18n';

interface ActiveContactHeaderProps {
  activePeer: ActivePeer;
  onDisconnect: () => void;
  onPingPeer?: () => void;
  lang?: Language;
}

export const ActiveContactHeader: React.FC<ActiveContactHeaderProps> = ({
  activePeer,
  onDisconnect,
  onPingPeer,
  lang = 'en',
}) => {
  const [pinging, setPinging] = useState(false);
  const t = translations[lang];

  const handlePing = () => {
    if (onPingPeer) {
      setPinging(true);
      onPingPeer();
      setTimeout(() => setPinging(false), 800);
    }
  };

  return (
    <div 
      id="active-contact-header"
      className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#0C0C0E] border-b border-[#1F1F23] text-[#A1A1AA]"
    >
      {/* Contact Identity */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-indigo-500/30 flex items-center justify-center font-mono-code text-indigo-400 font-bold text-sm shadow-[0_0_12px_rgba(99,102,241,0.2)]">
            {activePeer.nickname ? activePeer.nickname.slice(0, 2).toUpperCase() : activePeer.fingerprint.slice(0, 2)}
          </div>
          {/* Status Dot */}
          <span 
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0C0C0E] ${
              activePeer.connected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'
            }`} 
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {activePeer.nickname || `Peer: ${activePeer.fingerprint.slice(0, 8)}`}
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-tight px-2 py-0.5 rounded-md bg-[#18181B] border border-indigo-500/30 text-indigo-400 font-mono-code">
              {t.e2eBadge}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#71717A]">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono-code text-[11px] text-[#A1A1AA]">{activePeer.fingerprint}</span>
            {activePeer.latencyMs !== undefined && (
              <span className="text-emerald-400 font-mono-code text-[10px] ml-1 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/30">
                {activePeer.latencyMs}ms
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transport Status Badge, Ping Button & Disconnect */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onPingPeer && (
          <button
            id="chamber-ping-peer-btn"
            type="button"
            onClick={handlePing}
            title={t.testLink}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-indigo-400 text-xs font-medium transition-colors cursor-pointer"
          >
            <Activity className={`w-3.5 h-3.5 ${pinging ? 'animate-spin text-indigo-400' : 'text-[#71717A]'}`} />
            <span className="hidden md:inline">{pinging ? t.testingLink : t.testLink}</span>
          </button>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-xs">
          {activePeer.activeTransport === 'webrtc' ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">{t.transportWebrtc}</span>
              <span className="sm:hidden">P2P</span>
            </span>
          ) : activePeer.activeTransport === 'local_broadcast' ? (
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <Repeat className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{t.transportLocal}</span>
              <span className="sm:hidden">IPC</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{t.transportMesh}</span>
              <span className="sm:hidden">Mesh</span>
            </span>
          )}
        </div>

        <button
          id="close-chamber-btn"
          onClick={onDisconnect}
          title={t.closeChamber}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-[#27272A] hover:bg-[#18181B] text-[#A1A1AA] hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.closeChamber}</span>
        </button>
      </div>
    </div>
  );
};
