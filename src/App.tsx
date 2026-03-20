import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, 
  Settings, Music2, Monitor, X, PlusSquare, Trash2, Gauge, 
  ChevronLeft, Folder, Shuffle, Repeat, Repeat1, Copy,
  RotateCcw, RotateCw, Music, Search, SortAsc, SortDesc, PictureInPicture2, Link, CheckCircle2, UploadCloud,
  Subtitles, Languages, ListPlus
} from 'lucide-react';
import jsmediatags from 'jsmediatags';
import { getColor } from 'colorthief';
import './App.css';

interface MediaItem {
  name: string; url: string; type: string; file?: File; path?: string;
  size?: number; addedAt: number; duration?: number;
}

interface ScannedFile {
  name: string;
  path: string;
  type: string;
  size: number;
  birthtime: number;
}

interface ElectronBridge {
  onOpenFile: (callback: (filePath: string) => void) => void;
  removeOpenFileListener: () => void;
  setAlwaysOnTop: (value: boolean) => void;
  toggleMiniPlayer: (enabled: boolean) => void;
  findSidecarFile: (filePath: string, extensions: string[]) => Promise<string | null>;
  onMediaPlayPause: (callback: () => void) => void;
  onMediaNext: (callback: () => void) => void;
  onMediaPrev: (callback: () => void) => void;
  setProgress: (progress: number) => void;
  getFileStats: (filePath: string) => Promise<{ size: number, birthtime: number }>;
  scanDirectory: (dirPath: string) => Promise<ScannedFile[]>;
}

interface JsMediaTagsTags {
  tags: {
    picture?: {
      data: number[];
      format: string;
    };
  };
}

interface AudioTrack {
  label: string;
  enabled: boolean;
}

interface HTMLVideoElementWithAudioTracks extends HTMLVideoElement {
  audioTracks: AudioTrack[] & { length: number };
}

interface FileWithPath extends File {
  path?: string;
}

interface FolderItem {
  isFolder: true;
  isPlaylist?: boolean;
  name: string;
  path: string;
}

type ViewItem = (MediaItem & { isFolder: false; isPlaylist?: boolean }) | FolderItem;

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 3, 2, 0, 0, 0, 0, 0],
  Rock: [4, 3, 2, 0, -1, -1, 0, 2, 3, 4],
  Pop: [-1, 0, 1, 2, 3, 3, 2, 1, 0, -1],
  Electronic: [5, 4, 0, 0, -2, 0, 2, 3, 5, 6],
  Acoustic: [3, 2, 1, 0, 1, 2, 4, 5, 4, 2]
};

const App: React.FC = () => {
  const [playlist, setPlaylist] = React.useState<MediaItem[]>([]);
  const [viewPath, setViewPath] = React.useState<string | null>(null);
  const [libraryRootPaths, setLibraryRootPaths] = React.useState<string[]>([]);
  const [explicitRoots, setExplicitRoots] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('aura-explicit-roots');
    return saved ? JSON.parse(saved) : [];
  });
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);

  const normalize = (p: string) => p ? p.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '') : '';

  const srtToVtt = (srtText: string) => {
    let vttText = "WEBVTT\n\n";
    vttText += srtText
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // Change comma to dot in timestamps
      .replace(/\r/g, ''); // Remove carriage returns
    return vttText;
  };

  const [mediaType, setMediaType] = React.useState<'video' | 'audio'>('video');
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);
  const [showControls, setShowControls] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  const [albumArt, setAlbumArt] = React.useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('suite-theme') || 'blue');
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [isShuffle, setIsShuffle] = React.useState(false);
  const [repeatMode, setRepeatMode] = React.useState<'none' | 'all' | 'one'>('none');
  const [previewTime, setPreviewTime] = React.useState(0);
  const [previewPos, setPreviewPos] = React.useState(0);
  const [showPreview, setShowPreview] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = React.useState<'name' | 'type' | 'size' | 'added' | 'duration'>('name');
  
  const [notification, setNotification] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isMiniPlayer, setIsMiniPlayer] = React.useState(false);
  const [subtitlesUrl, setSubtitlesUrl] = React.useState<string | null>(null);
  const [audioTracks, setAudioTracks] = React.useState<Array<{index: number, label: string, enabled: boolean}>>([]);

  // Playlists & Lyrics State
  const [userPlaylists, setUserPlaylists] = React.useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('aura-playlists');
    return saved ? JSON.parse(saved) : {};
  });
  const [lyrics, setLyrics] = React.useState<Array<{time: number, text: string}>>([]);
  const [lyricIndex, setLyricIndex] = React.useState(-1);

  // Adaptive Aura State
  const [adaptiveAuraEnabled, setAdaptiveAuraEnabled] = React.useState(() => localStorage.getItem('suite-adaptive-aura') === 'true');
  const [dominantColor, setDominantColor] = React.useState<string | null>(null);

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

  // Extended Settings
  const [autoHideEnabled, setAutoHideEnabled] = React.useState(() => localStorage.getItem('suite-autohide') !== 'false');
  const [previewsEnabled, setPreviewsEnabled] = React.useState(() => localStorage.getItem('suite-previews') !== 'false');
  const [skipInterval, setSkipInterval] = React.useState(() => Number(localStorage.getItem('suite-skip')) || 10);
  const [alwaysOnTop, setAlwaysOnTop] = React.useState(() => localStorage.getItem('suite-ontop') === 'true');
  const [isMuted, setIsMuted] = React.useState(false);
  const [prevVolume, setPrevVolume] = React.useState(0.8);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const audioRef2 = React.useRef<HTMLAudioElement>(null);
  const previewVideoRef = React.useRef<HTMLVideoElement>(null);
  const controlsTimeout = React.useRef<number | null>(null);
  const notifyTimeout = React.useRef<number | null>(null);
  const requestedIndexRef = React.useRef<number | null>(null);
  const albumArtUrlRef = React.useRef<string | null>(null);
  
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const gainNodeARef = React.useRef<GainNode | null>(null);
  const gainNodeBRef = React.useRef<GainNode | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement>(null);
  const equalizerFiltersRef = React.useRef<BiquadFilterNode[]>([]);
  const sourceARef = React.useRef<MediaElementAudioSourceNode | null>(null);
  const sourceBRef = React.useRef<MediaElementAudioSourceNode | null>(null);

  // --- Core Logic ---

  const showNotify = React.useCallback((text: string) => {
    if (notifyTimeout.current) window.clearTimeout(notifyTimeout.current);
    setNotification(text);
    notifyTimeout.current = window.setTimeout(() => setNotification(null), 2000);
  }, []);

  const parseLRC = (text: string) => {
    const lines = text.split('\n');
    const result: Array<{time: number, text: string}> = [];
    const regex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
        result.push({ time, text: match[4].trim() });
      }
    }
    return result.sort((a, b) => a.time - b.time);
  };

  const fetchItemMetadata = React.useCallback((index: number) => {
    const item = playlist[index];
    if (!item) return;

    const isVideo = item.type.startsWith('video') || item.name.match(/\.(mp4|mkv|webm|mov|avi|flv|wmv|ogv|m4v|3gp|3g2|ts|mpeg)$/i);

    // Reset subtitles & lyrics
    if (subtitlesUrl) URL.revokeObjectURL(subtitlesUrl);
    setSubtitlesUrl(null);
    setLyrics([]);
    setLyricIndex(-1);

    // Reset and revoke old album art
    if (albumArtUrlRef.current) URL.revokeObjectURL(albumArtUrlRef.current);
    albumArtUrlRef.current = null;
    setAlbumArt(null);

    const handleTags = (tags: JsMediaTagsTags) => {
      const { data, format } = tags.tags.picture || {};
      if (data) {
        const byteArray = new Uint8Array(data);
        const blob = new Blob([byteArray], { type: format });
        const url = URL.createObjectURL(blob);
        albumArtUrlRef.current = url;
        setAlbumArt(url);
      }
    };

    if (item.url?.startsWith('media://')) {
      fetch(item.url).then(res => res.blob()).then(blob => jsmediatags.read(blob, { onSuccess: handleTags })).catch(() => {});
      
      const electron = (window as unknown as { electron: ElectronBridge }).electron;
      if (electron?.findSidecarFile && item.path) {
        if (isVideo) {
          electron.findSidecarFile(item.path, ['srt', 'vtt']).then(subPath => {
            if (subPath) {
              const subUrl = `media://${encodeURIComponent(subPath)}`;
              fetch(subUrl).then(res => res.text()).then(text => {
                const isSrt = subPath.toLowerCase().endsWith('.srt');
                const vttContent = isSrt ? srtToVtt(text) : text;
                const blob = new Blob([vttContent], { type: 'text/vtt' });
                const blobUrl = URL.createObjectURL(blob);
                setSubtitlesUrl(blobUrl);
                showNotify("Subtitles loaded");
              });
            }
          });
        }
        electron.findSidecarFile(item.path, ['lrc']).then(lrcPath => {
          if (lrcPath) {
            const lrcUrl = `media://${encodeURIComponent(lrcPath)}`;
            fetch(lrcUrl).then(res => res.text()).then(text => {
              const parsed = parseLRC(text);
              if (parsed.length > 0) {
                setLyrics(parsed);
                showNotify("Lyrics loaded");
              }
            });
          }
        });
      }
    } else if (item.file && (item.type.startsWith('audio/') || item.name.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i))) {
      jsmediatags.read(item.file, { onSuccess: handleTags });
    }
  }, [playlist, subtitlesUrl, showNotify]);

  const playMedia = React.useCallback((index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const item = playlist[index];
    setMediaUrl(item.url);
    const isVideo = item.type.startsWith('video') || item.name.match(/\.(mp4|mkv|webm|mov|avi|flv|wmv|ogv)$/i);
    setMediaType(isVideo ? 'video' : 'audio');
    setCurrentIndex(index);
    setIsPlaying(true);
    setIsCrossfading(false);

    fetchItemMetadata(index);
  }, [playlist, fetchItemMetadata]);

  const handleCrossfade = React.useCallback((nextIndex: number) => {
    if (!crossfadeEnabled || mediaType !== 'audio' || isCrossfading) {
      playMedia(nextIndex);
      return;
    }

    const nextItem = playlist[nextIndex];
    if (!nextItem) return;

    const outgoingPlayer = activePlayer;
    const incomingPlayer = activePlayer === 'A' ? 'B' : 'A';
    
    setIsCrossfading(true);
    setCurrentIndex(nextIndex);
    setMediaUrl(nextItem.url);
    setActivePlayer(incomingPlayer);
    
    fetchItemMetadata(nextIndex); // Load new art and tags immediately

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
  }, [crossfadeEnabled, mediaType, isCrossfading, playlist, activePlayer, volume, playMedia, crossfadeDuration, fetchItemMetadata]);

  const detectAudioTracks = React.useCallback(() => {
    const video = videoRef.current as HTMLVideoElementWithAudioTracks | null;
    if (!video || !('audioTracks' in video)) {
      setAudioTracks([]);
      return;
    }
    
    const tracks = video.audioTracks;
    const trackList = [];
    for (let i = 0; i < tracks.length; i++) {
      trackList.push({
        index: i,
        label: tracks[i].label || `Audio Track ${i + 1}`,
        enabled: tracks[i].enabled
      });
    }
    setAudioTracks(trackList);
  }, []);

  const switchAudioTrack = React.useCallback((index: number) => {
    const video = videoRef.current as HTMLVideoElementWithAudioTracks | null;
    if (!video || !('audioTracks' in video)) return;
    
    const tracks = video.audioTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].enabled = (i === index);
    }
    
    // Refresh local state
    const trackList = [];
    for (let i = 0; i < tracks.length; i++) {
      trackList.push({
        index: i,
        label: tracks[i].label || `Audio Track ${i + 1}`,
        enabled: tracks[i].enabled
      });
    }
    setAudioTracks(trackList);
    showNotify(`Audio: ${trackList[index].label}`);
  }, [showNotify]);

  const addNewPlaylist = React.useCallback(() => {
    const name = prompt("Enter playlist name:");
    if (name && !userPlaylists[name]) {
      setUserPlaylists(prev => ({ ...prev, [name]: [] }));
      showNotify(`Playlist "${name}" created`);
    }
  }, [userPlaylists, showNotify]);

  React.useEffect(() => {
    localStorage.setItem('aura-playlists', JSON.stringify(userPlaylists));
  }, [userPlaylists]);

  const refreshLibrary = React.useCallback(async () => {
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (!electron || explicitRoots.length === 0) return;

    showNotify("Refreshing Library...");
    const allResults: ScannedFile[] = [];
    for (const root of explicitRoots) {
      const results = await electron.scanDirectory(root);
      allResults.push(...results);
    }

    setPlaylist(prev => {
      const blobs = prev.filter(i => !i.path);
      const newItems = allResults.map(r => {
        const nPath = normalize(r.path);
        const existing = prev.find(p => normalize(p.path || '') === nPath);
        return {
          ...r,
          path: nPath,
          url: `media://${encodeURIComponent(nPath)}`,
          addedAt: r.birthtime,
          duration: existing?.duration
        };
      });
      return [...blobs, ...newItems];
    });
    showNotify("Library Refresh Complete");
  }, [explicitRoots, showNotify]);

  const handleFileSelection = React.useCallback((files: File[] | FileList | null, isFolderSelection: boolean) => {
    if (!files || files.length === 0) return;
    const mediaExtensions = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus)$/i;
    const newItems: MediaItem[] = Array.from(files).filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/') || f.name.match(mediaExtensions)).map(f => {
      const fPath = normalize((f as FileWithPath).path || '');
      return { 
        name: f.name, 
        url: fPath ? `media://${encodeURIComponent(fPath)}` : URL.createObjectURL(f), 
        type: f.type, 
        file: f, 
        path: fPath, 
        size: f.size,
        addedAt: Date.now()
      };
    });
    if (newItems.length > 0) {
      if (isFolderSelection) {
        const firstFile = Array.from(files as Iterable<FileWithPath & { webkitRelativePath?: string }>).find((f) => !!f.webkitRelativePath);
        if (firstFile && firstFile.webkitRelativePath) {
          const relPath = normalize(firstFile.webkitRelativePath);
          const absPath = normalize(firstFile.path || '');
          if (absPath && relPath) {
            const relParts = relPath.split('/');
            const absParts = absPath.split('/');
            const root = absParts.slice(0, absParts.length - relParts.length + 1).join('/');
            if (root && !explicitRoots.includes(root)) setExplicitRoots(prev => [...prev, root]);
          }
        } else {
          const paths = newItems.map(i => i.path).filter(Boolean) as string[];
          if (paths.length > 0) {
            const firstParts = paths[0].split('/');
            let common = firstParts.slice(0, -1);
            paths.forEach(p => {
              const parts = p.split('/');
              for (let i = 0; i < common.length; i++) {
                if (common[i] !== parts[i]) { common = common.slice(0, i); break; }
              }
            });
            const root = common.join('/');
            if (root && !explicitRoots.includes(root)) setExplicitRoots(prev => [...prev, root]);
          }
        }
      }

      setPlaylist(prev => {
        const uniqueNewItems = newItems.filter(newItem => !prev.some(oldItem => (newItem.path && oldItem.path === oldItem.path) || (!newItem.path && oldItem.name === newItem.name)));
        if (uniqueNewItems.length === 0) { showNotify("No new unique items found"); return prev; }
        const updated = [...prev, ...uniqueNewItems];
        if (!mediaUrl) requestedIndexRef.current = prev.length;
        showNotify(`Added ${uniqueNewItems.length} items`);
        return updated;
      });
    }
  }, [mediaUrl, showNotify, explicitRoots]);

  const togglePlay = React.useCallback(() => {
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el) {
      if (isPlaying) {
        el.pause();
      } else {
        el.play();
      }
    }
  }, [mediaType, isPlaying, activePlayer]);

  const toggleMute = React.useCallback(() => {
    const newMuted = !isMuted;
    if (newMuted) { setPrevVolume(volume); setVolume(0); setIsMuted(true); showNotify("Audio Muted"); }
    else { setVolume(prevVolume); setIsMuted(false); showNotify("Audio Unmuted"); }
  }, [isMuted, prevVolume, volume, showNotify]);

  const handleSkip = React.useCallback((seconds: number) => {
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el) el.currentTime = Math.max(0, Math.min(duration, el.currentTime + seconds));
  }, [mediaType, duration, activePlayer]);

  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => showNotify("Full Screen Mode")).catch(() => {});
    } else {
      document.exitFullscreen().then(() => showNotify("Exit Full Screen")).catch(() => {});
    }
  }, [showNotify]);

  const toggleMiniPlayer = React.useCallback(() => {
    if (mediaType === 'video' && videoRef.current) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().then(() => showNotify("Exit PiP Mode")).catch(() => {});
      } else {
        videoRef.current.requestPictureInPicture().then(() => showNotify("Entered PiP Mode")).catch(() => {});
      }
    } else if (mediaType === 'audio') {
      const next = !isMiniPlayer;
      setIsMiniPlayer(next);
      const electron = (window as unknown as { electron: ElectronBridge }).electron;
      if (electron) electron.toggleMiniPlayer(next);
      showNotify(next ? "Mini Player Active" : "Original View Restored");
    }
  }, [mediaType, isMiniPlayer, showNotify]);

  const handleNext = React.useCallback(() => {
    if (playlist.length === 0) return;
    
    // Safety: If already crossfading, ignore rapid clicks
    if (isCrossfading) return;

    if (repeatMode === 'one') {
      const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
      if (el) { el.currentTime = 0; el.play(); }
      return;
    }

    const nextIndex = isShuffle 
      ? Math.floor(Math.random() * playlist.length)
      : (currentIndex + 1) % playlist.length;

    if (nextIndex === 0 && repeatMode === 'none' && !isShuffle) {
      setIsPlaying(false);
    } else if (nextIndex >= 0 && nextIndex < playlist.length) {
      handleCrossfade(nextIndex);
    }
  }, [playlist, repeatMode, isShuffle, mediaType, currentIndex, handleCrossfade, activePlayer, isCrossfading]);

  const handlePrev = React.useCallback(() => {
    if (playlist.length === 0 || isCrossfading) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    if (prevIndex >= 0 && prevIndex < playlist.length) {
      handleCrossfade(prevIndex);
    }
  }, [playlist, currentIndex, handleCrossfade, isCrossfading]);

  const clearLibrary = React.useCallback(() => {
    playlist.forEach(i => { if (i.url?.startsWith('blob:')) URL.revokeObjectURL(i.url); });
    if (albumArtUrlRef.current) URL.revokeObjectURL(albumArtUrlRef.current);
    albumArtUrlRef.current = null;
    setPlaylist([]); setViewPath(null); setAlbumArt(null); setIsPlaying(false); setExplicitRoots([]);
    localStorage.removeItem('aura-library');
    localStorage.removeItem('aura-explicit-roots');
    showNotify("Library Reset Complete");
  }, [playlist, showNotify]);


  const handleScrub = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el) el.currentTime = percent * duration;
    setCurrentTime(percent * duration);
  }, [mediaType, duration, activePlayer]);

  const handleMouseMoveScrubber = React.useCallback((e: React.MouseEvent) => {
    if (duration === 0 || !previewsEnabled) return;
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(1, x / rect.width)) * duration;
    setPreviewTime(time); setPreviewPos(x);
    if (mediaType === 'video' && previewVideoRef.current) previewVideoRef.current.currentTime = time;
  }, [duration, previewsEnabled, mediaType]);

  const handleVolumeWheel = React.useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
    setIsMuted(false);
  }, [volume]);

  const handleVolumeChange = React.useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const bar = e.currentTarget as HTMLDivElement;
    const rect = bar.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    setVolume(percent);
    setIsMuted(false);
  }, []);

  const removeItem = React.useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const name = playlist[index]?.name;
    if (playlist[index]?.url?.startsWith('blob:')) URL.revokeObjectURL(playlist[index].url);
    setPlaylist(prev => { const updated = [...prev]; updated.splice(index, 1); return updated; });
    if (index === currentIndex) { setMediaUrl(null); setAlbumArt(null); }
    else if (index < currentIndex) setCurrentIndex(prev => prev - 1);
    showNotify(`Removed ${name}`);
  }, [playlist, currentIndex, showNotify]);

  const removeFolder = React.useCallback((e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    const toRemove = playlist.filter(item => item.path?.startsWith(folderPath));
    toRemove.forEach(item => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url); });
    const updated = playlist.filter(item => !item.path?.startsWith(folderPath));
    setPlaylist(updated);
    setExplicitRoots(prev => prev.filter(r => r !== folderPath && !r.startsWith(folderPath + '/')));
    if (viewPath === folderPath || viewPath?.startsWith(folderPath + '/')) setViewPath(null);
    if (updated.length === 0) { setMediaUrl(null); setIsPlaying(false); }
    showNotify("Removed Folder Tree");
  }, [playlist, viewPath, showNotify]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const items = e.dataTransfer.items; if (!items) return;
    const filesToLoad: File[] = [];
    const traverse = async (entry: FileSystemEntry) => {
      if (entry.isFile) { 
        const file = await new Promise<File>((resolve) => (entry as FileSystemFileEntry).file(resolve)); 
        filesToLoad.push(file); 
      }
      else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve));
        for (const child of entries) await traverse(child);
      }
    };
    const scanPromises = [];
    for (let i = 0; i < items.length; i++) { 
      const entry = items[i].webkitGetAsEntry(); 
      if (entry) scanPromises.push(traverse(entry)); 
    }
    await Promise.all(scanPromises);
    handleFileSelection(filesToLoad, true);
  };

  const updateTheme = React.useCallback((newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('suite-theme', newTheme);
    showNotify(`Theme set to ${newTheme}`);
  }, [showNotify]);

  // --- Data Sorting & Filtering ---

  React.useEffect(() => {
    // Determine the concise set of roots (top-most folders)
    const roots = new Set<string>();
    explicitRoots.forEach(r => roots.add(normalize(r)));
    
    playlist.forEach(i => {
      if (i.path) {
        const nPath = normalize(i.path);
        const parts = nPath.split('/');
        if (parts.length > 1) {
          const parent = parts.slice(0, -1).join('/');
          if (!Array.from(roots).some(r => parent.startsWith(r + '/') || parent === r)) {
            roots.add(parent);
          }
        }
      }
    });

    const finalRoots = Array.from(roots).filter(f => !Array.from(roots).some(other => f !== other && f.startsWith(other + '/')));
    setLibraryRootPaths(finalRoots.sort((a, b) => a.localeCompare(b)));
  }, [playlist, explicitRoots]);

  const currentViewItems = React.useMemo<ViewItem[]>(() => {
    const q = searchQuery.toLowerCase();
    const nvPath = viewPath ? normalize(viewPath) : null;
    
    if (nvPath === null) {
      const items: ViewItem[] = [];
      Object.keys(userPlaylists).forEach(name => {
        if (!q || name.toLowerCase().includes(q)) {
          items.push({ isFolder: true, isPlaylist: true, name, path: `playlist:${name}` });
        }
      });
      libraryRootPaths.forEach(f => {
        if (!q || f.toLowerCase().includes(q)) {
          items.push({ isFolder: true, name: f.split('/').pop() || f, path: f });
        }
      });
      const noPathItems = playlist.filter(i => !i.path);
      if (noPathItems.length > 0 && (!q || "my library".includes(q))) {
        items.push({ isFolder: true, name: "My Library (Blobs)", path: "virtual:my-library" });
      }
      return items;
    }

    if (nvPath.startsWith('playlist:')) {
      const pName = nvPath.slice('playlist:'.length);
      const urls = userPlaylists[pName] || [];
      return urls.map(url => playlist.find(p => p.url === url)).filter((i): i is MediaItem => !!i).map(i => ({ ...i, isFolder: false }));
    }

    if (nvPath === 'virtual:my-library') {
      return playlist
        .filter(i => !i.path && (!q || i.name.toLowerCase().includes(q)))
        .map(i => ({ ...i, isFolder: false }));
    }

    const allInPath = playlist.filter(i => i.path && normalize(i.path).startsWith(nvPath + '/'));
    const folderMap = new Map<string, string>();
    const files: ViewItem[] = [];

    allInPath.forEach(item => {
      const nPath = normalize(item.path!);
      const rel = nPath.slice(nvPath.length + 1);
      const parts = rel.split('/');
      
      if (parts.length > 1) {
        const subName = parts[0];
        folderMap.set(subName, nvPath + '/' + subName);
      } else {
        files.push({ ...item, isFolder: false });
      }
    });

    const folders: ViewItem[] = Array.from(folderMap.entries()).map(([name, path]) => ({ isFolder: true, name, path }));
    const combined = [...folders, ...files];
    const filtered = q ? combined.filter((i) => i.name.toLowerCase().includes(q)) : combined;

    return filtered.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      let res = 0;
      if (sortBy === 'name') res = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      else if (!a.isFolder && !b.isFolder) {
        if (sortBy === 'type') res = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
        else if (sortBy === 'size') res = (a.size || 0) - (b.size || 0);
        else if (sortBy === 'added') res = (a.addedAt || 0) - (b.addedAt || 0);
        else if (sortBy === 'duration') res = (a.duration || 0) - (b.duration || 0);
      }
      if (res === 0) res = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      return sortOrder === 'asc' ? res : -res;
    });
  }, [viewPath, libraryRootPaths, playlist, searchQuery, sortBy, sortOrder, userPlaylists]);

  const formatMode = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Effects ---

  React.useEffect(() => {
    const saved = localStorage.getItem('aura-library');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<MediaItem>[];
        const restored = parsed
          .filter(item => item && typeof item === 'object' && item.path)
          .map(item => {
            const nPath = normalize(item.path as string);
            return {
              ...item,
              path: nPath,
              url: `media://${encodeURIComponent(nPath)}`
            } as MediaItem;
          });
        if (restored.length > 0) setPlaylist(restored);
      } catch (e) { console.error("Restoration failed", e); }
    }
  }, []);

  React.useEffect(() => {
    const toSave = playlist.filter(item => item.path).map(({ name, type, path, size, addedAt, duration }) => ({ name, type, path, size, addedAt, duration }));
    if (toSave.length > 0) {
      localStorage.setItem('aura-library', JSON.stringify(toSave));
    }
  }, [playlist]);

  React.useEffect(() => {
    localStorage.setItem('aura-explicit-roots', JSON.stringify(explicitRoots));
  }, [explicitRoots]);

  React.useEffect(() => {
    // Background Metadata Scanner
    const missing = playlist.filter(i => !i.duration);
    if (missing.length === 0) return;

    const scanNext = async () => {
      const item = missing[0];
      const index = playlist.findIndex(p => p.url === item.url);
      if (index === -1) return;

      const tempAudio = new Audio();
      tempAudio.src = item.url;
      tempAudio.oncanplaythrough = () => {
        const d = tempAudio.duration;
        if (d && d > 0) {
          setPlaylist(prev => {
            const updated = [...prev];
            if (updated[index]) updated[index] = { ...updated[index], duration: d };
            return updated;
          });
        }
        tempAudio.src = '';
        tempAudio.load();
      };
      tempAudio.onerror = () => { 
        tempAudio.src = ''; 
        // Mark as "tried" to avoid infinite loop on broken files
        setPlaylist(prev => {
          const updated = [...prev];
          if (updated[index]) updated[index] = { ...updated[index], duration: -1 };
          return updated;
        });
      };
    };

    const timer = setTimeout(scanNext, 1500); 
    return () => clearTimeout(timer);
  }, [playlist]);

  React.useEffect(() => {
    const electronBridge = (window as unknown as { electron: ElectronBridge }).electron;
    if (electronBridge) {
      electronBridge.onOpenFile((rawPath: string) => {
        const filePath = normalize(rawPath);
        const mediaExtensions = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus)$/i;
        if (!mediaExtensions.test(filePath)) return;
        
        const name = filePath.split('/').pop() || 'Unknown File', mUrl = `media://${encodeURIComponent(filePath)}`;
        const isVideo = /\.(mp4|mkv|webm|mov|avi|flv|wmv|ogv)$/i.test(filePath);
        
        electronBridge.getFileStats(filePath).then(stats => {
          setPlaylist(prev => {
            const index = prev.findIndex(item => item.url === mUrl);
            if (index !== -1) { requestedIndexRef.current = index; return prev; }
            const newItem: MediaItem = { 
              name, 
              url: mUrl, 
              path: filePath, 
              type: isVideo ? 'video/mp4' : 'audio/mpeg',
              size: stats.size,
              addedAt: stats.birthtime || Date.now()
            };
            requestedIndexRef.current = prev.length;
            return [...prev, newItem];
          });
          showNotify("File loaded from system");
        });
      });
    }
    return () => electronBridge?.removeOpenFileListener();
  }, [showNotify]);

  React.useEffect(() => {
    if (requestedIndexRef.current !== null && playlist[requestedIndexRef.current]) {
      const idx = requestedIndexRef.current;
      requestedIndexRef.current = null;
      playMedia(idx);
    }
  }, [playlist, playMedia]);

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
      else if (key === 'p') toggleMiniPlayer();
      else if (key === '>') { const s = Math.min(2, playbackSpeed + 0.25); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }
      else if (key === '<') { const s = Math.max(0.5, playbackSpeed - 0.25); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }
      else if (key === 'escape' && isFullscreen) document.exitFullscreen().catch(() => {});
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, handleSkip, skipInterval, toggleFullscreen, isFullscreen, toggleMiniPlayer, playbackSpeed, showNotify]);

  React.useEffect(() => {
    if (mediaType === 'audio' && (isPlaying || isCrossfading) && audioRef.current && audioRef2.current) {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        analyserRef.current = ctx.createAnalyser();
        
        gainNodeARef.current = ctx.createGain();
        gainNodeBRef.current = ctx.createGain();
        
        sourceARef.current = ctx.createMediaElementSource(audioRef.current);
        sourceBRef.current = ctx.createMediaElementSource(audioRef2.current);
        
        sourceARef.current.connect(gainNodeARef.current);
        sourceBRef.current.connect(gainNodeBRef.current);

        // Create and Chain Equalizer Filters
        const filters: BiquadFilterNode[] = [];
        
        EQ_FREQUENCIES.forEach((freq, i) => {
          const filter = ctx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1; // Bandwidth
          filter.gain.value = eqGains[i];
          filters.push(filter);
        });
        equalizerFiltersRef.current = filters;

        // Connect both players to the first filter
        gainNodeARef.current.connect(filters[0]);
        gainNodeBRef.current.connect(filters[0]);

        // Chain filters
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }

        // Last filter to Analyser
        filters[filters.length - 1].connect(analyserRef.current);
        
        analyserRef.current.connect(ctx.destination);
      }

      // Update Filter Gains if they exist
      if (equalizerFiltersRef.current.length > 0) {
        equalizerFiltersRef.current.forEach((filter, i) => {
          filter.gain.setTargetAtTime(eqGains[i], audioContextRef.current!.currentTime, 0.01);
        });
      }

      // Sync master volume to GainNodes (if not currently crossfading)
      if (!isCrossfading) {
        if (activePlayer === 'A') {
          gainNodeARef.current!.gain.value = volume;
          gainNodeBRef.current!.gain.value = 0;
        } else {
          gainNodeARef.current!.gain.value = 0;
          gainNodeBRef.current!.gain.value = volume;
        }
      }
    }
  }, [mediaType, isPlaying, isCrossfading, mediaUrl, volume, activePlayer, eqGains]);

  React.useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  React.useEffect(() => {
    const el = mediaType === 'video' ? videoRef.current : audioRef.current;
    if (el) { el.playbackRate = playbackSpeed; el.volume = volume; }
  }, [playbackSpeed, volume, mediaUrl, mediaType]);

  React.useEffect(() => {
    const el = (window as unknown as { electron: ElectronBridge }).electron;
    if (el) {
      el.onMediaPlayPause(() => togglePlay());
      el.onMediaNext(() => handleNext());
      el.onMediaPrev(() => handlePrev());
    }
  }, [togglePlay, handleNext, handlePrev]);

  React.useEffect(() => {
    const el = (window as unknown as { electron: ElectronBridge }).electron;
    if (el && isPlaying && duration > 0) {
      el.setProgress(currentTime / duration);
    } else if (el && !isPlaying) {
      el.setProgress(-1); // Clear progress
    }
  }, [isPlaying, currentTime, duration]);

  React.useEffect(() => {
    if (duration > 0 && playlist[currentIndex] && !playlist[currentIndex].duration) {
      setPlaylist(prev => {
        const updated = [...prev];
        if (updated[currentIndex]) updated[currentIndex] = { ...updated[currentIndex], duration };
        return updated;
      });
    }
  }, [duration, currentIndex, playlist]);

  React.useEffect(() => {
    if (mediaUrl && isPlaying) {
      const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
      if (el) el.play().catch(() => {});
    }
  }, [mediaUrl, activePlayer, isPlaying, mediaType]);

  React.useEffect(() => {
    if (lyrics.length > 0) {
      const idx = lyrics.findIndex((l, i) => currentTime >= l.time && (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time));
      if (idx !== -1 && idx !== lyricIndex) setLyricIndex(idx);
    }
  }, [currentTime, lyrics, lyricIndex]);

  React.useEffect(() => {
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (electron) electron.setAlwaysOnTop(alwaysOnTop);
  }, [alwaysOnTop]);

  React.useEffect(() => {
    if (albumArt && adaptiveAuraEnabled) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = albumArt;
      img.onload = async () => {
        try {
          const color = await getColor(img);
          if (color) {
            setDominantColor(color.hex());
          }
        } catch (e) {
          console.error("Color extraction failed", e);
          setDominantColor(null);
        }
      };
    } else {
      setDominantColor(null);
    }
  }, [albumArt, adaptiveAuraEnabled]);

  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      if (albumArtUrlRef.current) URL.revokeObjectURL(albumArtUrlRef.current);
    };
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

  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div 
      className={`app-container ${isFullscreen ? 'mode-fs' : 'mode-normal'} ${!showControls && isFullscreen ? 'hide-ui' : ''} ${isDragging ? 'drag-active' : ''} ${isMiniPlayer ? 'mode-mini' : ''}`}
      style={{ 
        '--accent-primary': (adaptiveAuraEnabled && dominantColor) ? dominantColor : undefined,
        '--aura-bg': (adaptiveAuraEnabled && dominantColor) ? dominantColor : 'transparent'
      } as React.CSSProperties}
      onMouseMove={() => { setShowControls(true); if (controlsTimeout.current) window.clearTimeout(controlsTimeout.current); if (isFullscreen && isPlaying && autoHideEnabled) controlsTimeout.current = window.setTimeout(() => setShowControls(false), 3000); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      data-theme={theme}
    >
      {isMiniPlayer ? (
        <div className="mini-player-view">
          <div className="mini-art-wrap">
            {albumArt ? <img src={albumArt} alt="Art" /> : <div className="mini-default-art"><Music size={60} opacity={0.2} /></div>}
            <div className="mini-controls-overlay">
              <div className="mini-btn" onClick={handlePrev}><SkipBack size={20} fill="white" /></div>
              <div className="mini-btn play" onClick={togglePlay}>{isPlaying ? <Pause size={30} fill="white" /> : <Play size={30} fill="white" />}</div>
              <div className="mini-btn" onClick={handleNext}><SkipForward size={20} fill="white" /></div>
            </div>
          </div>
          <div className="mini-info">
            <div className="mini-title">{playlist[currentIndex]?.name.split('.')[0]}</div>
            <div className="mini-actions">
              <div className="icon-btn" onClick={toggleMiniPlayer} title="Restore View"><Maximize size={16} /></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {notification && (
        <div className="aura-notification glass">
          <CheckCircle2 size={16} color="var(--accent-primary)" />
          <span>{notification}</span>
        </div>
      )}

      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <UploadCloud size={60} className="drag-icon" />
            <h2>Drop files or folders anywhere</h2>
          </div>
        </div>
      )}

      {contextMenu && (
       <div ref={contextMenuRef} className="custom-context-menu glass" onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}>
         {mediaUrl && (<><div className="menu-item" onClick={togglePlay}>{isPlaying ? <Pause size={14} /> : <Play size={14} />} <span>{isPlaying ? 'Pause' : 'Play'}</span></div><div className="menu-divider" /><div className="menu-item" onClick={handleNext}><SkipForward size={14} /> <span>Next File</span></div><div className="menu-item" onClick={handlePrev}><SkipBack size={14} /> <span>Previous File</span></div><div className="menu-divider" /></>)}

          <div className="menu-item" onClick={() => document.getElementById('file-up')?.click()}><PlusSquare size={14} /> <span>Add Files</span></div>
          <div className="menu-item" onClick={() => document.getElementById('folder-up')?.click()}><Folder size={14} /> <span>Open Folder</span></div>
          <div className="menu-item" onClick={refreshLibrary}><RotateCw size={14} /> <span>Refresh Library</span></div>

          {mediaUrl && (
            <>
              <div className="menu-divider" />
              <div className="menu-group-label">Add to Playlist</div>
              {Object.keys(userPlaylists).length === 0 ? (
                <div className="menu-item disabled" style={{opacity:0.4, fontSize:'11px'}}>No playlists created</div>
              ) : (
                Object.keys(userPlaylists).map(name => (
                  <div key={name} className="menu-item" onClick={() => {
                    const item = playlist[currentIndex];
                    if (item && !userPlaylists[name].includes(item.url)) {
                      setUserPlaylists(prev => ({ ...prev, [name]: [...prev[name], item.url] }));
                      showNotify(`Added to ${name}`);
                    }
                  }}><PlusSquare size={14} /> <span>{name}</span></div>
                ))
              )}
              <div className="menu-divider" />
              <div className="menu-item" onClick={() => { setIsShuffle(!isShuffle); showNotify(`Shuffle ${!isShuffle ? 'On' : 'Off'}`); }}><Shuffle size={14} className={isShuffle ? 'active-accent' : ''} /> <span>Shuffle: {isShuffle ? 'On' : 'Off'}</span></div>
              <div className="menu-item" onClick={() => { const next = repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none'; setRepeatMode(next); showNotify(`Loop: ${formatMode(next)}`); }}><Repeat size={14} className={repeatMode !== 'none' ? 'active-accent' : ''} /> <span>Loop: {repeatMode.toUpperCase()}</span></div>
              <div className="menu-item" onClick={() => { const item = playlist[currentIndex]; if (item?.path) { navigator.clipboard.writeText(item.path); showNotify("File path copied"); } }}><Link size={14} /> <span>Copy File Path</span></div>
            </>
          )}
          <div className="menu-divider" /><div className="menu-item" onClick={toggleFullscreen}><Maximize size={14} /> <span>{isFullscreen ? 'Exit Full Screen' : 'Go Full Screen'}</span></div>
          <div className="menu-item" onClick={toggleMiniPlayer}><Monitor size={14} /> <span>{isMiniPlayer ? 'Exit Mini-Player' : 'Go Mini-Player'}</span></div>
          {mediaUrl && (<div className="menu-item" onClick={() => { if (playlist[currentIndex]?.name) { navigator.clipboard.writeText(playlist[currentIndex].name); showNotify("Media name copied"); } }}><Copy size={14} /> <span>Copy File Name</span></div>)}
        </div>
      )}

      <input type="file" multiple id="file-up" style={{display:'none'}} onChange={(e) => handleFileSelection(e.target.files, false)} />
      <input type="file" id="folder-up" style={{display:'none'}} {...({ webkitdirectory: 'true', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} onChange={(e) => handleFileSelection(e.target.files, true)} />

      {isSettingsOpen && (
        <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-card glass" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <Settings size={20} color="var(--accent-primary)" />
                <h2 style={{fontSize:'18px', fontWeight:800}}>Settings</h2>
              </div>
              <X className="icon-btn" onClick={() => setIsSettingsOpen(false)} />
            </div>
            
            <div className="settings-body">
              <div className="settings-section">
                <span className="settings-label">APPEARANCE</span>
                <div className="theme-grid">
                  {['blue', 'purple', 'emerald', 'amber', 'rose'].map(t => (
                    <div key={t} className={`theme-opt ${theme === t ? 'active' : ''}`} style={{background: `var(--accent-primary)`}} onClick={() => updateTheme(t)} data-theme={t} />
                  ))}
                </div>
                <div style={{marginTop:'20px'}}>
                  <div className="settings-toggle-row" onClick={() => { const val = !adaptiveAuraEnabled; setAdaptiveAuraEnabled(val); localStorage.setItem('suite-adaptive-aura', String(val)); }}><span>Adaptive Aura (Match Music)</span><div className={`suite-switch ${adaptiveAuraEnabled ? 'active' : ''}`} /></div>
                </div>
              </div>

              <div className="settings-section">
                <span className="settings-label">PLAYBACK</span>
                <div className="settings-toggle-row" onClick={() => { setAutoHideEnabled(!autoHideEnabled); localStorage.setItem('suite-autohide', String(!autoHideEnabled)); }}><span>Hide controls automatically</span><div className={`suite-switch ${autoHideEnabled ? 'active' : ''}`} /></div>
                <div className="settings-toggle-row" onClick={() => { setPreviewsEnabled(!previewsEnabled); localStorage.setItem('suite-previews', String(!previewsEnabled)); }}><span>Show video preview window</span><div className={`suite-switch ${previewsEnabled ? 'active' : ''}`} /></div>
                <div className="settings-toggle-row" onClick={() => { const val = !alwaysOnTop; setAlwaysOnTop(val); localStorage.setItem('suite-ontop', String(val)); }}><span>Stay on top of other windows</span><div className={`suite-switch ${alwaysOnTop ? 'active' : ''}`} /></div>
                <div className="settings-toggle-row"><span>Skip time when jumping</span><select value={skipInterval} className="suite-select" onChange={(e) => { setSkipInterval(Number(e.target.value)); localStorage.setItem('suite-skip', e.target.value); }}>{[5, 10, 15, 30, 60].map(v => <option key={v} value={v}>{v} seconds</option>)}</select></div>
              </div>

              <div className="settings-section">
                <span className="settings-label">AUDIO ENGINE</span>
                <div className="settings-toggle-row" onClick={() => { const val = !crossfadeEnabled; setCrossfadeEnabled(val); localStorage.setItem('suite-crossfade', String(val)); }}><span>Enable track crossfading</span><div className={`suite-switch ${crossfadeEnabled ? 'active' : ''}`} /></div>
                <div className="settings-toggle-row"><span>Crossfade Duration</span><div style={{display:'flex', alignItems:'center', gap:'10px'}}><input type="range" min="1" max="12" value={crossfadeDuration} onChange={(e) => { const v = Number(e.target.value); setCrossfadeDuration(v); localStorage.setItem('suite-crossfade-dur', String(v)); }} style={{width:'100px'}} /> <span style={{fontSize:'11px', width:'25px'}}>{crossfadeDuration}s</span></div></div>
                
                <div style={{marginTop:'24px'}}>
                  <div className="eq-preset-row">
                    <span style={{fontSize:'12px', opacity:0.6}}>Equalizer Preset:</span>
                    <select 
                      className="suite-select" 
                      value={currentPreset}
                      onChange={(e) => {
                        const name = e.target.value;
                        setCurrentPreset(name);
                        const newGains = (EQ_PRESETS as Record<string, number[]>)[name] || EQ_PRESETS.Flat;
                        setEqGains(newGains);
                        localStorage.setItem('suite-eq', JSON.stringify(newGains));
                        showNotify(`Equalizer: ${name}`);
                      }}
                    >
                      {Object.keys(EQ_PRESETS).map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div className="eq-sliders-grid">
                    {EQ_FREQUENCIES.map((freq, i) => (
                      <div key={freq} className="eq-slider-col">
                        <input 
                          type="range" 
                          min="-12" 
                          max="12" 
                          step="1" 
                          value={eqGains[i]} 
                          {...({ orient: "vertical" } as React.InputHTMLAttributes<HTMLInputElement> & { orient: string })}
                          onChange={(e) => {
                            const newGains = [...eqGains];
                            newGains[i] = Number(e.target.value);
                            setEqGains(newGains);
                            setCurrentPreset('Custom');
                            localStorage.setItem('suite-eq', JSON.stringify(newGains));
                          }}
                        />
                        <span className="eq-freq-label">{freq < 1000 ? freq : (freq/1000)+'k'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <span className="settings-label">MAINTENANCE</span>
                <button className="btn-modern secondary" style={{width:'100%', color:'#ff4b4b', border:'1px solid rgba(255,75,75,0.2)', fontSize:'12px'}} onClick={() => { clearLibrary(); setIsSettingsOpen(false); }}>Clear All Files & Library</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!mediaUrl && playlist.length === 0 && (<div className="welcome-screen-luxe"><div className="welcome-card-luxe glass"><div className="suite-logo">✦</div><h1>Aura Player</h1><div className="dash-actions-vertical"><label htmlFor="folder-up" className="btn-modern primary">Open a Folder</label><label htmlFor="file-up" className="btn-modern secondary">Drag & Drop Files Here</label></div></div></div>)}

      <header className="master-header glass">
        <div className="header-left"><label htmlFor="folder-up" className="library-tag"><Folder size={14} /> <span>FOLDER</span></label><label htmlFor="file-up" className="library-tag" style={{marginLeft:'10px'}}><PlusSquare size={14} /> <span>ADD FILES</span></label></div>
        <div className="title-text">{playlist[currentIndex]?.name || 'Waiting for media...'}</div>
        <Settings size={20} className="icon-btn" onClick={() => setIsSettingsOpen(true)} />
      </header>

      {!isFullscreen && (
        <aside className="master-sidebar glass">
          <div className="sidebar-header-row">
            {viewPath ? (
              <div className="back-btn" onClick={() => {
                // If the current viewPath is a root, go back to root view (null)
                if (libraryRootPaths.includes(viewPath)) {
                  setViewPath(null);
                } else {
                  // Otherwise go up one level
                  const parts = viewPath.split('/');
                  const parent = parts.slice(0, -1).join('/');
                  setViewPath(parent);
                }
              }}><ChevronLeft size={16} /> BACK</div>
            ) : <div className="sidebar-label">LIBRARY</div>}
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              {!viewPath && <div className="icon-btn" title="Create Playlist" onClick={addNewPlaylist}><ListPlus size={16} /></div>}
              <select 
                className="suite-select" 
                style={{fontSize:'10px', padding:'2px 4px'}}
                value={sortBy}
                onChange={(e) => {
                  const val = e.target.value as 'name' | 'type' | 'size' | 'added' | 'duration';
                  setSortBy(val);
                  showNotify(`Sort: ${formatMode(val)}`);
                }}
              >
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="size">Size</option>
                <option value="added">Date Added</option>
                <option value="duration">Playable Time</option>
              </select>
              <div className="icon-btn" title="Refresh Library" onClick={refreshLibrary}><RotateCw size={14} /></div>
              <div className="icon-btn" title="Toggle Sort Direction" onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); showNotify(`Sorting: ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`); }}>{sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}</div>
              {playlist.length > 0 && <div className="icon-btn" title="Clear Library" onClick={clearLibrary}><Trash2 size={14} /></div>}
            </div>
          </div>
          <div className="search-box-wrap"><Search size={14} className="search-icon" /><input type="text" placeholder="Search current view..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="sidebar-search-input" />{searchQuery && <X size={14} className="clear-search" onClick={() => setSearchQuery('')} />}</div>
          <div className="sidebar-scroll" style={{ overflowY: 'auto' }}>
            {currentViewItems.length === 0 ? (
              <div style={{padding:'40px 20px', textAlign:'center', opacity:0.3, fontSize:'12px'}}>No items found.</div>
            ) : (
              currentViewItems.map((item, _index) => (
                <div 
                  key={(item as MediaItem).url || item.path || _index}
                  className={`queue-item ${item.isFolder ? 'folder-item' : (currentIndex === playlist.findIndex(p => p.url === (item as MediaItem).url) ? 'active' : '')}`}
                  onClick={() => item.isFolder ? setViewPath(item.path) : handleCrossfade(playlist.findIndex(p => p.url === (item as MediaItem).url))}
                >
                  {item.isPlaylist ? <Music size={18} color="var(--accent-primary)" /> : item.isFolder ? <Folder size={18} color="var(--accent-primary)" /> : ((item as MediaItem).type?.startsWith('video') ? <Monitor size={16} /> : <Music2 size={16} />)}
                  <div className="item-info-stack">
                    <span className="item-name">{item.name}</span>
                  </div>
                  {item.isPlaylist ? (
                    <div className="remove-item-btn" title="Delete Playlist" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete playlist "${item.name}"?`)) { setUserPlaylists(prev => { const n = { ...prev }; delete n[item.name]; return n; }); if (viewPath === item.path) setViewPath(null); } }}><X size={14} /></div>
                  ) : item.isFolder ? (
                    <div className="remove-item-btn" title="Remove Folder Tree" onClick={(e) => removeFolder(e, item.path)}><X size={14} /></div>
                  ) : (
                    <div className="remove-item-btn" title="Remove" onClick={(e) => { e.stopPropagation(); removeItem(e, playlist.findIndex(p => p.url === (item as MediaItem).url)); }}><X size={14} /></div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      <main className="master-viewport" onDoubleClick={toggleFullscreen}>
        {mediaType === 'video' ? (
          <div className="video-surface-wrap" onClick={togglePlay}>
            {mediaUrl && (
              <video ref={videoRef} src={mediaUrl} autoPlay className="video-engine" onTimeUpdate={() => !isScrubbing && setCurrentTime(videoRef.current?.currentTime || 0)} onLoadedMetadata={() => { setDuration(videoRef.current?.duration || 0); detectAudioTracks(); }} onEnded={handleNext} onPlay={() => setIsPlaying(true)} onPause={(e) => { if (e.currentTarget.readyState > 0) setIsPlaying(false); }}>
                {subtitlesUrl && <track src={subtitlesUrl} kind="subtitles" srcLang="en" label="English" default />}
              </video>
            )}
            {!isPlaying && mediaUrl && <div className="pause-overlay"><Pause size={80} fill="white" style={{opacity:0.3}} /></div>}
          </div>
        ) : (
          <div className="audio-surface-wrap" onClick={togglePlay}>
            <div className="audio-glow" style={{ background: adaptiveAuraEnabled ? 'var(--accent-primary)' : (albumArt ? `url(${albumArt}) center/cover no-repeat` : 'none') }}></div>
            
            {lyrics.length > 0 && (
              <div className="lyrics-overlay-container">
                <div className="lyrics-scroll" style={{ transform: `translateY(calc(50% - ${lyricIndex * 40}px))` }}>
                  {lyrics.map((line, i) => (
                    <div key={i} className={`lyric-line ${i === lyricIndex ? 'active' : ''}`}>
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="audio-card-presentation">
              <div className="album-art-luxury shadow-2xl">{albumArt ? <img src={albumArt} alt="Art" /> : <div className="default-art"><Music size={120} opacity={0.2} strokeWidth={1} /></div>}
                {!isPlaying && mediaUrl && <div className="pause-overlay-audio"><Pause size={60} fill="white" style={{opacity:0.4}} /></div>}
              </div>
              <div className="audio-details"><h1 className="track-title-small">{playlist[currentIndex]?.name.split('.')[0]}</h1></div>
            </div>
            {mediaUrl && <audio ref={audioRef} src={activePlayer === 'A' ? mediaUrl : ''} onTimeUpdate={() => {
              if (activePlayer === 'A') {
                const el = audioRef.current;
                if (el && !isScrubbing) {
                  setCurrentTime(el.currentTime);
                  // Only auto-trigger if crossfade is enabled, NOT already crossfading, and nearly finished
                  if (crossfadeEnabled && !isCrossfading && el.duration > 0 && el.duration - el.currentTime < crossfadeDuration && playlist.length > 1) {
                    handleNext();
                  }
                }
              }
            }} onLoadedMetadata={() => activePlayer === 'A' && setDuration(audioRef.current?.duration || 0)} onEnded={handleNext} onPlay={() => activePlayer === 'A' && setIsPlaying(true)} onPause={(e) => { if (activePlayer === 'A' && e.currentTarget.readyState > 0) setIsPlaying(false); }} />}
            <audio ref={audioRef2} src={activePlayer === 'B' ? (mediaUrl || '') : ''} onTimeUpdate={() => {
              if (activePlayer === 'B') {
                const el = audioRef2.current;
                if (el && !isScrubbing) {
                  setCurrentTime(el.currentTime);
                  if (crossfadeEnabled && !isCrossfading && el.duration > 0 && el.duration - el.currentTime < crossfadeDuration && playlist.length > 1) {
                    handleNext();
                  }
                }
              }
            }} onLoadedMetadata={() => activePlayer === 'B' && setDuration(audioRef2.current?.duration || 0)} onEnded={handleNext} onPlay={() => activePlayer === 'B' && setIsPlaying(true)} onPause={(e) => { if (activePlayer === 'B' && e.currentTarget.readyState > 0) setIsPlaying(false); }} />
          </div>
        )}
      </main>

      <footer className="master-controls glass">
        <div className="master-scrubber" onMouseDown={(e) => { setIsScrubbing(true); handleScrub(e); }} onMouseMove={(e) => { if (e.buttons === 1) handleScrub(e); handleMouseMoveScrubber(e); }} onMouseUp={() => setIsScrubbing(false)} onMouseEnter={() => setShowPreview(true)} onMouseLeave={() => setShowPreview(false)} onClick={handleScrub}>
          {mediaType === 'video' ? (<div className="video-preview-window" style={{ left: `${previewPos}px`, visibility: (showPreview && mediaUrl) ? 'visible' : 'hidden', opacity: (showPreview && mediaUrl) ? 1 : 0 }}><video ref={previewVideoRef} src={mediaUrl || ''} muted className="preview-video-element" /><div className="preview-time">{formatTime(previewTime)}</div></div>) :
           (<div className="time-preview-bubble" style={{ left: `${previewPos}px`, visibility: (showPreview && mediaUrl) ? 'visible' : 'hidden', opacity: (showPreview && mediaUrl) ? 1 : 0 }}>{formatTime(previewTime)}</div>)}
          <div className="scrubber-fill" style={{ width: `${(currentTime/duration)*100 || 0}%` }}></div>
        </div>
        <div className="controls-row-master">
          <div className="group-left">
            <div className="icon-btn-wrap" title="Shuffle"><Shuffle size={18} className={`nav-icon ${isShuffle ? 'active-accent' : ''}`} onClick={() => { const n = !isShuffle; setIsShuffle(n); showNotify(`Shuffle ${n ? 'On' : 'Off'}`); }} /></div>
            <div className="icon-btn-wrap" title="Previous"><SkipBack size={22} onClick={handlePrev} className="nav-icon" /></div>
            <div className="skip-group"><div className="icon-btn-wrap" title={`Back ${skipInterval}s`}><RotateCcw size={20} onClick={() => handleSkip(-skipInterval)} className="nav-icon" /></div><div className="btn-play-luxe" onClick={togglePlay}>{isPlaying ? <Pause size={32} /> : <Play size={32} style={{marginLeft:'4px'}} />}</div><div className="icon-btn-wrap" title={`Forward ${skipInterval}s`}><RotateCw size={20} onClick={() => handleSkip(skipInterval)} className="nav-icon" /></div></div>
            <div className="icon-btn-wrap" title="Next"><SkipForward size={22} onClick={handleNext} className="nav-icon" /></div>
            <div className="icon-btn-wrap" title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}>
              {repeatMode === 'one' ? <Repeat1 size={18} className="nav-icon active-accent" onClick={() => { setRepeatMode('none'); showNotify("Loop: Off"); }} /> : repeatMode === 'all' ? <Repeat size={18} className="nav-icon active-accent" onClick={() => { setRepeatMode('one'); showNotify("Loop: One"); }} /> : <Repeat size={18} className="nav-icon" onClick={() => { setRepeatMode('all'); showNotify("Loop: All"); }} />}
            </div>
            <div className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>
          </div>
          <div className="group-right">
            <div className="speed-selector-wrap bottom-bar-control"><Gauge size={14} /><select value={playbackSpeed} title="Playback Speed" onChange={(e) => { const s = parseFloat(e.target.value); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }}>{[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => <option key={s} value={s}>{s}x</option>)}</select></div>
            {mediaType === 'video' && (
              <>
                {audioTracks.length > 1 && (
                  <div className="icon-btn-wrap" title="Switch Audio Language">
                    <Languages 
                      size={20} 
                      className="icon-btn active-accent" 
                      onClick={() => {
                        const currentIdx = audioTracks.findIndex(t => t.enabled);
                        const nextIdx = (currentIdx + 1) % audioTracks.length;
                        switchAudioTrack(nextIdx);
                      }} 
                    />
                  </div>
                )}
                <div className="icon-btn-wrap" title="Toggle Subtitles">
                  <Subtitles 
                    size={20} 
                    className={`icon-btn ${subtitlesUrl ? 'active-accent' : ''}`} 
                    style={{ opacity: subtitlesUrl ? 1 : 0.4 }}
                    onClick={() => {
                      if (videoRef.current && videoRef.current.textTracks.length > 0) {
                        const track = videoRef.current.textTracks[0];
                        track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
                        showNotify(`Subtitles: ${track.mode === 'showing' ? 'On' : 'Off'}`);
                      } else {
                        showNotify("No subtitles available");
                      }
                    }} 
                  />
                </div>
                <div className="icon-btn-wrap" title="Picture in Picture (P)"><PictureInPicture2 size={20} opacity={0.6} className="icon-btn" onClick={toggleMiniPlayer} /></div>
                <div className="icon-btn-wrap" title="Mini Player (M)"><Monitor size={20} opacity={0.6} className="icon-btn" onClick={toggleMiniPlayer} /></div>
              </>
            )}
            <div className="icon-btn-wrap" title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
              {isMuted || volume === 0 ? <VolumeX size={20} opacity={0.6} className="icon-btn" onClick={toggleMute} /> : <Volume2 size={20} opacity={0.6} className="icon-btn" onClick={toggleMute} />}
            </div>
            <div className="luxe-vol-slider" onWheel={handleVolumeWheel} onClick={handleVolumeChange} title="Adjust Volume (Wheel)"><div className="luxe-vol-fill" style={{ width: `${volume * 100}%` }}></div></div>
            <div className="icon-btn-wrap" title="Full Screen (F)"><Maximize size={22} className="icon-btn" onClick={toggleFullscreen} /></div>
          </div>
        </div>
      </footer>
        </>
      )}
    </div>
  );
}

export default App;
