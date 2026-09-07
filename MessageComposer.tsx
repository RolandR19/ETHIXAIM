import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Camera } from 'lucide-react';
import type { MediaType, Language } from '../types';
import { translations } from '../lib/i18n';

interface MessageComposerProps {
  onSendMessage: (content: {
    type: MediaType;
    text?: string;
    mediaBase64?: string;
    mediaMimeType?: string;
    mediaDuration?: number;
  }) => void;
  onOpenMediaModal: (mode: 'audio' | 'camera' | 'upload') => void;
  lang?: Language;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onOpenMediaModal,
  lang = 'en',
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const t = translations[lang];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    onSendMessage({
      type: 'text',
      text: trimmed,
    });

    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      id="message-composer-container"
      className="p-4 bg-[#0C0C0E] border-t border-[#1F1F23]"
    >
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {/* Media / Camera Modal Triggers */}
        <div className="flex items-center gap-1">
          <button
            id="composer-attach-btn"
            type="button"
            onClick={() => onOpenMediaModal('upload')}
            title={t.imageTooltip}
            className="p-2.5 text-[#52525B] hover:text-white rounded-xl hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            id="composer-camera-btn"
            type="button"
            onClick={() => onOpenMediaModal('camera')}
            title={t.imageTooltip}
            className="p-2.5 text-[#52525B] hover:text-white rounded-xl hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            id="composer-mic-btn"
            type="button"
            onClick={() => onOpenMediaModal('audio')}
            title={t.voiceTooltip}
            className="p-2.5 text-[#52525B] hover:text-white rounded-xl hover:bg-[#18181B] transition-colors cursor-pointer"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input with Encrypted Pill */}
        <div className="flex-1 relative">
          <textarea
            id="message-textarea-input"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.inputPlaceholder}
            className="w-full bg-[#18181B] border border-[#27272A] rounded-xl py-3 pl-4 pr-24 text-white text-sm outline-none focus:border-indigo-500 transition-colors shadow-inner resize-none leading-relaxed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5 pointer-events-none">
            <div className="px-2 py-0.5 bg-[#27272A] text-[9px] text-[#A1A1AA] rounded font-mono">
              X25519
            </div>
          </div>
        </div>

        {/* Send Button */}
        <button
          id="composer-send-btn"
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          title={t.sendTooltip}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
            text.trim()
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-[#18181B] border border-[#27272A] text-[#52525B] cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="text-center mt-2.5">
        <span className="text-[10px] text-[#52525B] font-mono-code">
          {t.ephemeralNotice}
        </span>
      </div>
    </div>
  );
};
