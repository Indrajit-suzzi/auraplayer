import React from 'react';
import type { MediaItem, HTMLVideoElementWithAudioTracks, ElectronBridge } from '../types';
import { EQ_FREQUENCIES, EQ_PRESETS, VIDEO_EXTENSIONS_REGEX } from '../constants';

export const useAudioEngine = (
  playlist: MediaItem[],
  showNotify: (msg: string) => void
) => {
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [mediaType, setMediaType] = React.useState<'video' | 'audio'>('video');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [isShuffle, setIsShuffle] = React.useState(false);
  const [repeatMode, setRepeatMode] = React.useState<'none' | 'all' | 'one'>('none');
  const [isMuted, setIsMuted] = React.useState(false);
  const [prevVolume, setPrevVolume] = React.useState(0.8);
  const [audioTracks, setAudioTracks] = React.useState<Array<{index: number, label: string, enabled: boolean}>>([]);

  // Equalizer State
  const [eqGains, setEqGains] = React.useState<number[]>(() => {
    const saved = localStorage.getItem('suite-eq');
    return saved ? JSON.parse(saved) : EQ_PRESETS.Flat;
  });
  const [currentPreset, setCurrentPreset] = React.useState('Flat');

  // Crossfade & Multi-Player State
  const [crossfadeEnabled, setCrossfadeEnabled] = React.useState(() => localStorage.getItem('suite-crossfade') === 'true');
  const [activePlayer, setActivePlayer] = React.useState<'A' | 'B'>('A');
  const [isCrossfading, setIsCrossfading] = React.useState(false);
  const [crossfadeDuration, setCrossfadeDuration] = React.useState(() => Number(localStorage.getItem('suite-crossfade-dur')) || 5);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const audioRef2 = React.useRef<HTMLAudioElement>(null);
  
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const gainNodeARef = React.useRef<GainNode | null>(null);
  const gainNodeBRef = React.useRef<GainNode | null>(null);
  const equalizerFiltersRef = React.useRef<BiquadFilterNode[]>([]);
  const sourceARef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const sourceBRef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);

  const initAudioContext = React.useCallback(() => {
    if (!audioContextRef.current && audioRef.current && audioRef2.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      gainNodeARef.current = ctx.createGain();
      gainNodeBRef.current = ctx.createGain();
      sourceARef.current = ctx.createMediaElementSource(audioRef.current);
      sourceBRef.current = ctx.createMediaElementSource(audioRef2.current);
      
      sourceARef.current.connect(gainNodeARef.current);
      sourceBRef.current.connect(gainNodeBRef.current);

      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      gainNodeARef.current.connect(analyserRef.current);
      gainNodeBRef.current.connect(analyserRef.current);
      
      const filters: BiquadFilterNode[] = [];
      EQ_FREQUENCIES.forEach((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = eqGains[i];
        filters.push(filter);
      });
      equalizerFiltersRef.current = filters;
      
      analyserRef.current.connect(filters[0]);
      
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(ctx.destination);
    }
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [eqGains]);

  const playMedia = React.useCallback((index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const item = playlist[index];
    setMediaUrl(item.url);
    const isVideo = item.type.startsWith('video') || !!item.name.match(VIDEO_EXTENSIONS_REGEX);
    setMediaType(isVideo ? 'video' : 'audio');
    setCurrentIndex(index);
    setIsPlaying(true);
    setIsCrossfading(false);
    setCurrentIndex(index);
    setIsPlaying(true);
    setIsCrossfading(false);
    initAudioContext();
  }, [playlist, initAudioContext]);

  const handleCrossfade = React.useCallback((nextIndex: number) => {
    if (!crossfadeEnabled || mediaType !== 'audio' || isCrossfading) {
      playMedia(nextIndex);
      return;
    }

    const nextItem = playlist[nextIndex];
    if (!nextItem) return;

    initAudioContext();

    const outgoingPlayer = activePlayer;
    const incomingPlayer = activePlayer === 'A' ? 'B' : 'A';
    
    setIsCrossfading(true);
    setCurrentIndex(nextIndex);
    setMediaUrl(nextItem.url);
    setActivePlayer(incomingPlayer);

    const rampDuration = crossfadeDuration;
    const ctx = audioContextRef.current;
    if (ctx && gainNodeARef.current && gainNodeBRef.current) {
      const now = ctx.currentTime;
      const outgoingGain = outgoingPlayer === 'A' ? gainNodeARef.current.gain : gainNodeBRef.current.gain;
      const incomingGain = outgoingPlayer === 'A' ? gainNodeBRef.current.gain : gainNodeARef.current.gain;

      outgoingGain.cancelScheduledValues(now);
      incomingGain.cancelScheduledValues(now);
      outgoingGain.setValueAtTime(volume, now);
      outgoingGain.linearRampToValueAtTime(0, now + rampDuration);
      incomingGain.setValueAtTime(0, now);
      incomingGain.linearRampToValueAtTime(volume, now + rampDuration);
    }

    const nextAudio = incomingPlayer === 'A' ? audioRef.current : audioRef2.current;
    if (nextAudio) {
      nextAudio.volume = 0;
      nextAudio.play().catch(() => {});
    }

    setTimeout(() => {
      setIsCrossfading(false);
      const oldAudio = outgoingPlayer === 'A' ? audioRef.current : audioRef2.current;
      if (oldAudio) {
        oldAudio.pause();
        oldAudio.currentTime = 0;
      }
    }, rampDuration * 1000);
  }, [crossfadeEnabled, mediaType, isCrossfading, playlist, activePlayer, volume, playMedia, crossfadeDuration, initAudioContext]);

  const handleNext = React.useCallback(() => {
    if (playlist.length === 0 || isCrossfading) return;
    if (repeatMode === 'one') {
      const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
      if (el) { el.currentTime = 0; el.play(); }
      return;
    }
    let nextIndex: number;
    if (isShuffle) {
      if (playlist.length <= 1) { nextIndex = 0; }
      else { do { nextIndex = Math.floor(Math.random() * playlist.length); } while (nextIndex === currentIndex); }
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    if (nextIndex === 0 && repeatMode === 'none' && !isShuffle) setIsPlaying(false);
    else if (nextIndex >= 0 && nextIndex < playlist.length) handleCrossfade(nextIndex);
  }, [playlist, repeatMode, isShuffle, mediaType, currentIndex, handleCrossfade, activePlayer, isCrossfading]);

  const handlePrev = React.useCallback(() => {
    if (playlist.length === 0 || isCrossfading) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    if (prevIndex >= 0 && prevIndex < playlist.length) handleCrossfade(prevIndex);
  }, [playlist, currentIndex, handleCrossfade, isCrossfading]);

  const togglePlay = React.useCallback(() => {
    initAudioContext();
    setIsPlaying(prev => !prev);
  }, [initAudioContext]);

  const toggleMute = React.useCallback(() => {
    if (!isMuted) { setPrevVolume(volume); setVolume(0); setIsMuted(true); showNotify("Audio Muted"); }
    else { setVolume(prevVolume); setIsMuted(false); showNotify("Audio Unmuted"); }
  }, [isMuted, prevVolume, volume, showNotify]);

  const handleSkip = React.useCallback((seconds: number) => {
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el) el.currentTime = Math.max(0, Math.min(duration, el.currentTime + seconds));
  }, [mediaType, duration, activePlayer]);

  const detectAudioTracks = React.useCallback(() => {
    const video = videoRef.current as HTMLVideoElementWithAudioTracks | null;
    if (!video || !('audioTracks' in video)) {
      setAudioTracks([]);
      return;
    }
    const tracks = video.audioTracks;
    const trackList = [];
    for (let i = 0; i < tracks.length; i++) {
      trackList.push({ index: i, label: (tracks[i] as any).label || `Audio Track ${i + 1}`, enabled: (tracks[i] as any).enabled });
    }
    setAudioTracks(trackList);
  }, []);

  const switchAudioTrack = React.useCallback((index: number) => {
    const video = videoRef.current as HTMLVideoElementWithAudioTracks | null;
    if (!video || !('audioTracks' in video)) return;
    const tracks = video.audioTracks;
    for (let i = 0; i < tracks.length; i++) (tracks[i] as any).enabled = (i === index);
    const trackList = [];
    for (let i = 0; i < tracks.length; i++) {
      trackList.push({ index: i, label: (tracks[i] as any).label || `Audio Track ${i + 1}`, enabled: (tracks[i] as any).enabled });
    }
    setAudioTracks(trackList);
    showNotify(`Audio: ${trackList[index].label}`);
  }, [showNotify]);

  const handleVolumeWheel = React.useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
    setIsMuted(false);
  }, [volume, setVolume, setIsMuted]);

  const handleVolumeChange = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const x = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    setVolume(percent);
    setIsMuted(false);
  }, [setVolume, setIsMuted]);

  // Equalizer Sync
  React.useEffect(() => {
    if (audioContextRef.current && equalizerFiltersRef.current.length > 0) {
      equalizerFiltersRef.current.forEach((filter, i) => {
        filter.gain.setTargetAtTime(eqGains[i], audioContextRef.current!.currentTime, 0.01);
      });
    }
  }, [eqGains]);

  // Gain Sync
  React.useEffect(() => {
    if (gainNodeARef.current && gainNodeBRef.current && !isCrossfading) {
      if (activePlayer === 'A') {
        gainNodeARef.current.gain.value = volume;
        gainNodeBRef.current.gain.value = 0;
      } else {
        gainNodeARef.current.gain.value = 0;
        gainNodeBRef.current.gain.value = volume;
      }
    }
  }, [volume, activePlayer, isCrossfading]);

  // Playback Rates & Volume Sync
  React.useEffect(() => {
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el) { 
      el.playbackRate = playbackSpeed; 
      // Direct volume sync for simplicity and redundancy alongside the WebAudio nodes
      el.volume = volume; 
    }
    // Also sync the secondary audio player if not active to ensure mute carries over
    if (mediaType === 'audio') {
      const otherEl = activePlayer === 'A' ? audioRef2.current : audioRef.current;
      if (otherEl) otherEl.volume = volume;
    }
  }, [playbackSpeed, volume, mediaUrl, mediaType, activePlayer]);

  // Sync isPlaying state with actual element
  React.useEffect(() => {
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el && mediaUrl) {
      if (isPlaying) {
        el.play().catch(err => {
          if (err.name !== 'AbortError') console.error("Playback failed", err);
        });
      } else {
        el.pause();
      }
    }
  }, [isPlaying, mediaUrl, mediaType, activePlayer]);

  // Global Media Shortcuts
  React.useEffect(() => {
    const el = (window as unknown as { electron: ElectronBridge }).electron;
    if (el) {
      el.onMediaPlayPause(() => togglePlay());
      el.onMediaNext(() => handleNext());
      el.onMediaPrev(() => handlePrev());
    }
  }, [togglePlay, handleNext, handlePrev]);

  // Taskbar Progress
  React.useEffect(() => {
    const el = (window as unknown as { electron: ElectronBridge }).electron;
    if (el) {
      if (isPlaying && duration > 0) el.setProgress(currentTime / duration);
      else el.setProgress(-1);
    }
  }, [isPlaying, currentTime, duration]);

  return {
    mediaUrl, setMediaUrl, mediaType, setMediaType, isPlaying, setIsPlaying,
    currentIndex, setCurrentIndex, currentTime, setCurrentTime, duration, setDuration,
    volume, setVolume, playbackSpeed, setPlaybackSpeed, isShuffle, setIsShuffle,
    repeatMode, setRepeatMode, isMuted, setIsMuted, audioTracks, setAudioTracks,
    eqGains, setEqGains, currentPreset, setCurrentPreset,
    crossfadeEnabled, setCrossfadeEnabled, activePlayer, setActivePlayer,
    isCrossfading, setIsCrossfading, crossfadeDuration, setCrossfadeDuration,
    videoRef, audioRef, audioRef2,
    playMedia, handleCrossfade, handleNext, handlePrev, togglePlay, toggleMute, handleSkip,
    detectAudioTracks, switchAudioTrack, handleVolumeWheel, handleVolumeChange,
    analyser: analyserRef.current
  };
};
