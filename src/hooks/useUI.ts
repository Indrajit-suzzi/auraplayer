import React from 'react';


export const useUI = (
  togglePlay: () => void,
  handleSkip: (s: number) => void,
  toggleMute: () => void,
  setVolume: React.Dispatch<React.SetStateAction<number>>,
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>,
  playbackSpeed: number,
  setPlaybackSpeed: (s: number) => void,
  initialSkipInterval: number,
  showNotify: (text: string) => void,
  handleScrub: (p: number) => void,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  audioRef2: React.RefObject<HTMLAudioElement | null>,
  mediaType: 'video' | 'audio',
  activePlayer: 'A' | 'B',
  setIsPlaying: (v: boolean) => void,
  duration: number,
  previewVideoRef: React.RefObject<HTMLVideoElement | null>
) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('suite-theme') || 'blue');
  const [showControls, setShowControls] = React.useState(true);
  const controlsTimeout = React.useRef<number | null>(null);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement>(null);
  const [previewTime, setPreviewTime] = React.useState(0);
  const [previewPos, setPreviewPos] = React.useState(0);
  const [showPreview, setShowPreview] = React.useState(false);
  const [previewsEnabled, setPreviewsEnabled] = React.useState(() => localStorage.getItem('suite-previews') !== 'false');
  const [adaptiveAuraEnabled, setAdaptiveAuraEnabled] = React.useState(() => localStorage.getItem('suite-adaptive-aura') === 'true');
  const [autoHideEnabled, setAutoHideEnabled] = React.useState(() => localStorage.getItem('suite-autohide') !== 'false');
  const [alwaysOnTop, setAlwaysOnTop] = React.useState(() => localStorage.getItem('suite-ontop') === 'true');
  const [brightness, setBrightness] = React.useState(() => parseFloat(localStorage.getItem('suite-brightness') || '1'));
  const [skipInterval, setSkipInterval] = React.useState(() => parseInt(localStorage.getItem('suite-skip') || String(initialSkipInterval)));

  const updateBrightness = React.useCallback((val: number) => {
    setBrightness(val);
    localStorage.setItem('suite-brightness', val.toString());
  }, []);

  const updateTheme = React.useCallback((newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('suite-theme', newTheme);
    showNotify(`Theme set to ${newTheme}`);
  }, [showNotify]);

  const handleMouseMoveScrubber = React.useCallback((e: React.MouseEvent | MouseEvent) => {
    if (duration === 0 || !previewsEnabled) return;
    const bar = document.querySelector('.master-scrubber') as HTMLDivElement;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const time = Math.max(0, Math.min(1, percent)) * duration;
    setPreviewTime(time);
    setPreviewPos(Math.max(0, Math.min(rect.width, x)));
    if (mediaType === 'video' && previewVideoRef.current) previewVideoRef.current.currentTime = time;
  }, [duration, previewsEnabled, mediaType, previewVideoRef]);

  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePiP = React.useCallback((vRef: React.RefObject<HTMLVideoElement | null>) => {
    if (vRef.current) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      } else {
        vRef.current.requestPictureInPicture().catch(() => {});
      }
    }
  }, []);

  const toggleMiniPlayer = React.useCallback(() => {
    const next = !isMiniPlayer;
    setIsMiniPlayer(next);
    const electron = (window as any).electron;
    if (electron) electron.toggleMiniPlayer(next);
  }, [isMiniPlayer]);

  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === ' ') { e.preventDefault(); togglePlay(); }
      else if (key === 'arrowright') handleSkip(skipInterval);
      else if (key === 'arrowleft') handleSkip(-skipInterval);
      else if (key === 'j') handleSkip(-10);
      else if (key === 'l') handleSkip(10);
      else if (key === 'arrowup') { e.preventDefault(); setVolume(v => Math.min(1, v + 0.05)); setIsMuted(false); }
      else if (key === 'arrowdown') { e.preventDefault(); setVolume(v => Math.max(0, v - 0.05)); }
      else if (key === 'm') toggleMute();
      else if (key === 'f') toggleFullscreen();
      else if (key === 'p') { /* Handle P logic if needed */ }
      else if (key === '>') { const s = Math.min(2, playbackSpeed + 0.25); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }
      else if (key === '<') { const s = Math.max(0.5, playbackSpeed - 0.25); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }
      else if (key === 'escape' && isFullscreen) document.exitFullscreen().catch(() => {});
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, handleSkip, skipInterval, toggleFullscreen, isFullscreen, playbackSpeed, setVolume, setIsMuted, showNotify, setPlaybackSpeed]);

  // Scrubbing Global Logic
  React.useEffect(() => {
    if (isScrubbing) {
      const handleGlobalMove = (e: MouseEvent) => {
        const bar = document.querySelector('.master-scrubber') as HTMLDivElement;
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        handleScrub(percent);
        handleMouseMoveScrubber(e);
      };
      const handleGlobalUp = () => {
        setIsScrubbing(false);
        if (wasPlayingBeforeScrub) {
          const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
          el?.play().catch(() => {});
          setIsPlaying(true);
        }
      };
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleGlobalUp);
      return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
      };
    }
  }, [isScrubbing, handleScrub, handleMouseMoveScrubber, wasPlayingBeforeScrub, mediaType, activePlayer, audioRef, audioRef2, videoRef, setIsPlaying]);

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  React.useLayoutEffect(() => {
    if (contextMenu && contextMenuRef.current) {
      const menu = contextMenuRef.current;
      const rect = menu.getBoundingClientRect();
      const { innerWidth: winW, innerHeight: winH } = window;
      let { x, y } = contextMenu;
      if (x + rect.width > winW) x = winW - rect.width - 10;
      if (y + rect.height > winH) y = winH - rect.height - 10;
      menu.style.left = `${Math.max(10, x)}px`;
      menu.style.top = `${Math.max(10, y)}px`;
    }
  }, [contextMenu]);

  return {
    isDragging, setIsDragging,
    isFullscreen, setIsFullscreen,
    isMiniPlayer, setIsMiniPlayer,
    isSettingsOpen, setIsSettingsOpen,
    theme, setTheme, updateTheme,
    showControls, setShowControls, controlsTimeout,
    contextMenu, setContextMenu, contextMenuRef,
    handleContextMenu, toggleFullscreen, toggleMiniPlayer, togglePiP,
    isScrubbing, setIsScrubbing,
    wasPlayingBeforeScrub, setWasPlayingBeforeScrub,
    previewTime, setPreviewTime,
    previewPos, setPreviewPos,
    showPreview, setShowPreview,
    previewsEnabled, setPreviewsEnabled,
    adaptiveAuraEnabled, setAdaptiveAuraEnabled,
    autoHideEnabled, setAutoHideEnabled,
    alwaysOnTop, setAlwaysOnTop,
    brightness, updateBrightness,
    skipInterval, setSkipInterval,
    handleMouseMoveScrubber
  };
};
