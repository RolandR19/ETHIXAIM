import React, { useState, useRef, useEffect } from 'react';
import { Mic, Camera, Video, Upload, Play, Square, RefreshCw, Send, X, AlertCircle } from 'lucide-react';
import type { MediaType, Language } from '../types';

interface MediaRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode: 'audio' | 'camera' | 'upload';
  onSendMedia: (media: {
    type: MediaType;
    mediaBase64: string;
    mediaMimeType: string;
    mediaDuration?: number;
    mediaFileName?: string;
  }) => void;
  lang?: Language;
}

export const MediaRecorderModal: React.FC<MediaRecorderModalProps> = ({
  isOpen,
  onClose,
  defaultMode,
  onSendMedia,
  lang = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'photo' | 'video' | 'upload'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Audio analysis
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Stream and recorder references
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Video element for camera preview
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (defaultMode === 'camera') {
        setActiveTab('photo');
      } else if (defaultMode === 'upload') {
        setActiveTab('upload');
      } else {
        setActiveTab('audio');
      }
      resetState();
    } else {
      cleanupStreams();
    }
  }, [isOpen, defaultMode]);

  // Start or stop camera feed when switching tabs
  useEffect(() => {
    if (!isOpen) return;
    resetState();

    if (activeTab === 'photo' || activeTab === 'video') {
      startCameraStream();
    } else {
      cleanupStreams();
    }

    return () => {
      cleanupStreams();
    };
  }, [activeTab, isOpen]);

  const resetState = () => {
    setPreviewUrl(null);
    setPreviewMime('');
    setIsRecording(false);
    setRecordDuration(0);
    setError(null);
    chunksRef.current = [];
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  };

  const cleanupStreams = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  // -------------------------------------------------------------
  // Camera Handler (Photo / Video)
  // -------------------------------------------------------------
  const startCameraStream = async () => {
    cleanupStreams();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: activeTab === 'video',
      });
      mediaStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.play();
      }
    } catch (err: any) {
      setError(`Camera access denied or unavailable: ${err?.message || err}`);
    }
  };

  const capturePhoto = () => {
    if (!videoElementRef.current) return;
    const video = videoElementRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewUrl(dataUrl);
    setPreviewMime('image/jpeg');
    cleanupStreams();
  };

  // -------------------------------------------------------------
  // Audio Recorder (Voice Notes)
  // -------------------------------------------------------------
  const startAudioRecording = async () => {
    cleanupStreams();
    resetState();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Audio visualizer setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        }
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // MediaRecorder setup
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
          setPreviewMime(mimeType);
        };
        reader.readAsDataURL(blob);
        cleanupStreams();
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError(`Microphone access error: ${err?.message || err}`);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // -------------------------------------------------------------
  // Video Clip Recording
  // -------------------------------------------------------------
  const startVideoRecording = () => {
    if (!mediaStreamRef.current) return;
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/mp4';
      const recorder = new MediaRecorder(mediaStreamRef.current);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
          setPreviewMime(mimeType);
        };
        reader.readAsDataURL(blob);
        cleanupStreams();
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 30) {
            stopVideoRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(`Failed to start video recording: ${err?.message || err}`);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // -------------------------------------------------------------
  // File Upload Handler
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 10MB to keep P2P transmission fast and responsive
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB for rapid P2P delivery.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
      setPreviewMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Confirm and Send to Composer
  // -------------------------------------------------------------
  const handleConfirmSend = () => {
    if (!previewUrl) return;

    let type: MediaType = 'image';
    if (previewMime.startsWith('audio/')) {
      type = 'audio';
    } else if (previewMime.startsWith('video/')) {
      type = 'video';
    } else if (previewMime.startsWith('image/')) {
      type = 'image';
    }

    onSendMedia({
      type,
      mediaBase64: previewUrl,
      mediaMimeType: previewMime,
      mediaDuration: recordDuration || undefined,
    });

    cleanupStreams();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div 
        id="media-recorder-modal"
        className="relative w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-6 shadow-2xl text-[#A1A1AA]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-tight">
              {lang === 'fr' && 'Capsule Média Éphémère'}
              {lang === 'en' && 'Ephemeral Media Capsule'}
              {lang === 'es' && 'Cápsula Multimedia Efímera'}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0C0C0E] border border-indigo-500/30 text-indigo-400 font-mono-code font-bold">
              {lang === 'fr' && 'Auto-destruction 60s'}
              {lang === 'en' && '60s Auto-Destruct'}
              {lang === 'es' && 'Autodestrucción 60s'}
            </span>
          </div>
          <button
            id="close-media-modal-btn"
            onClick={() => {
              cleanupStreams();
              onClose();
            }}
            className="p-1.5 text-[#71717A] hover:text-white rounded-lg hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        {!previewUrl && (
          <div className="flex items-center gap-1 p-1 bg-[#0C0C0E] border border-[#1F1F23] rounded-xl my-4 text-xs font-medium">
            <button
              onClick={() => setActiveTab('audio')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'audio' ? 'bg-[#18181B] text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>
                {lang === 'fr' ? 'Note Vocale' : lang === 'es' ? 'Nota de Voz' : 'Voice Note'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('photo')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'photo' ? 'bg-[#18181B] text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>
                {lang === 'fr' ? 'Photo' : lang === 'es' ? 'Foto' : 'Photo'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'video' ? 'bg-[#18181B] text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>
                {lang === 'fr' ? 'Vidéo' : lang === 'es' ? 'Video' : 'Video'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'upload' ? 'bg-[#18181B] text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm' : 'text-[#71717A] hover:text-[#A1A1AA]'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {lang === 'fr' ? 'Fichier' : lang === 'es' ? 'Archivo' : 'File'}
              </span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-2 p-3 my-3 bg-red-950/20 border border-red-500/30 rounded-xl text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Stage */}
        <div className="my-3 min-h-[220px] flex flex-col items-center justify-center">
          {previewUrl ? (
            /* Preview Stage */
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="relative w-full max-h-[260px] rounded-xl overflow-hidden bg-[#0C0C0E] border border-[#27272A] flex items-center justify-center">
                {previewMime.startsWith('image/') && (
                  <img src={previewUrl} alt="Preview" className="max-h-[260px] object-contain rounded-xl" />
                )}
                {previewMime.startsWith('video/') && (
                  <video src={previewUrl} controls className="max-h-[260px] w-full rounded-xl" />
                )}
                {previewMime.startsWith('audio/') && (
                  <div className="p-6 w-full flex flex-col items-center gap-3">
                    <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                      <Mic className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-[#71717A] font-mono-code">
                      {lang === 'fr' ? `Note Vocale (${recordDuration}s)` : lang === 'es' ? `Nota de Voz (${recordDuration}s)` : `Voice Note (${recordDuration}s recorded)`}
                    </span>
                    <audio src={previewUrl} controls className="w-full max-w-sm" />
                  </div>
                )}
              </div>

              {/* Action Buttons for Preview */}
              <div className="flex items-center justify-between w-full gap-3">
                <button
                  onClick={resetState}
                  className="flex items-center gap-2 py-2 px-4 rounded-xl border border-[#27272A] hover:bg-[#27272A] text-[#A1A1AA] text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'fr' ? 'Effacer & Recommencer' : lang === 'es' ? 'Descartar y Repetir' : 'Discard & Retake'}
                  </span>
                </button>
                <button
                  id="confirm-send-media-btn"
                  onClick={handleConfirmSend}
                  className="flex items-center gap-2 py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'fr' ? 'Chiffrer & Envoyer' : lang === 'es' ? 'Cifrar y Enviar' : 'Encrypt & Send Capsule'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Mode Stage */
            <div className="w-full">
              {/* Voice Note View */}
              {activeTab === 'audio' && (
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                  {/* Visualizer Wave */}
                  <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs">
                    {[...Array(16)].map((_, i) => {
                      const height = isRecording
                        ? Math.max(8, Math.min(56, (audioLevel * ((i % 5) + 1) * 0.4)))
                        : 8;
                      return (
                        <div
                          key={i}
                          style={{ height: `${height}px` }}
                          className={`w-1.5 rounded-full transition-all duration-75 ${
                            isRecording ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-[#27272A]'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Timer */}
                  <div className="text-2xl font-mono-code font-bold text-white tracking-wider">
                    {Math.floor(recordDuration / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(recordDuration % 60).toString().padStart(2, '0')}
                  </div>

                  {/* Controls */}
                  <div>
                    {!isRecording ? (
                      <button
                        id="start-voice-recording-btn"
                        onClick={startAudioRecording}
                        className="flex items-center gap-2.5 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>
                          {lang === 'fr' ? 'Démarrer l’enregistrement' : lang === 'es' ? 'Iniciar grabación de voz' : 'Start Voice Recording'}
                        </span>
                      </button>
                    ) : (
                      <button
                        id="stop-voice-recording-btn"
                        onClick={stopAudioRecording}
                        className="flex items-center gap-2.5 py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                      >
                        <Square className="w-4 h-4" />
                        <span>
                          {lang === 'fr' ? 'Arrêter & Écouter' : lang === 'es' ? 'Detener y Escuchar' : 'Stop & Preview'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Photo View */}
              {activeTab === 'photo' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-full max-w-sm h-64 bg-black rounded-xl overflow-hidden border border-[#27272A] flex items-center justify-center">
                    <video ref={videoElementRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                  </div>
                  <button
                    id="snap-photo-btn"
                    onClick={capturePhoto}
                    className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>
                      {lang === 'fr' ? 'Prendre une photo' : lang === 'es' ? 'Tomar instantánea' : 'Capture Snapshot'}
                    </span>
                  </button>
                </div>
              )}

              {/* Video View */}
              {activeTab === 'video' && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-full max-w-sm h-64 bg-black rounded-xl overflow-hidden border border-[#27272A] flex items-center justify-center">
                    <video ref={videoElementRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                    {isRecording && (
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-mono-code">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>{recordDuration}s / 30s</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {!isRecording ? (
                      <button
                        id="start-video-record-btn"
                        onClick={startVideoRecording}
                        className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                      >
                        <Video className="w-4 h-4" />
                        <span>
                          {lang === 'fr' ? 'Démarrer la vidéo' : lang === 'es' ? 'Iniciar grabación de video' : 'Start Recording Clip'}
                        </span>
                      </button>
                    ) : (
                      <button
                        id="stop-video-record-btn"
                        onClick={stopVideoRecording}
                        className="flex items-center gap-2 py-2.5 px-6 rounded-xl border border-[#27272A] hover:bg-[#27272A] text-white font-semibold text-xs transition-all cursor-pointer"
                      >
                        <Square className="w-4 h-4" />
                        <span>
                          {lang === 'fr' ? 'Terminer le clip' : lang === 'es' ? 'Finalizar clip' : 'Finish Clip'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Upload View */}
              {activeTab === 'upload' && (
                <div className="p-8 border-2 border-dashed border-[#27272A] rounded-xl flex flex-col items-center justify-center text-center space-y-3 hover:border-indigo-500/50 transition-colors">
                  <Upload className="w-8 h-8 text-[#71717A]" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {lang === 'fr' ? 'Glissez-déposez ou cliquez pour téléverser' : lang === 'es' ? 'Arrastra o haz clic para subir' : 'Drag and drop, or click to upload'}
                    </p>
                    <p className="text-xs text-[#71717A]">
                      {lang === 'fr' ? 'Images, vocaux et vidéos (Max 10 Mo)' : lang === 'es' ? 'Imágenes, clips de voz y videos (Máx 10MB)' : 'Supports Images, Voice Clips, and Short Videos (Max 10MB)'}
                    </p>
                  </div>
                  <label 
                    id="browse-file-label"
                    className="cursor-pointer py-2 px-4 rounded-xl bg-[#0C0C0E] border border-[#27272A] hover:border-indigo-500/50 text-xs text-indigo-400 font-medium transition-colors"
                  >
                    <span>
                      {lang === 'fr' ? 'Parcourir les fichiers' : lang === 'es' ? 'Explorar archivos del dispositivo' : 'Browse Device Files'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,audio/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
