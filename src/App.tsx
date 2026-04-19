import React from 'react';
import { 
  PlusSquare, Folder, RotateCw, SkipForward, SkipBack, Pause, Play, Maximize, 
  CheckCircle2, UploadCloud, PictureInPicture2, Copy,
  Music, Volume2, VolumeX
} from 'lucide-react';
import type { MediaItem, ElectronBridge } from './types';
import { MEDIA_EXTENSIONS_REGEX, VIDEO_EXTENSIONS_REGEX, APP_VERSION } from './constants';
import { useLibrary } from './hooks/useLibrary';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useMetadata } from './hooks/useMetadata';
import { useUI } from './hooks/useUI';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainViewport from './components/MainViewport';
import PlayerControls from './components/PlayerControls';
import SettingsModal from './components/SettingsModal';

import './App.css';

const App: React.FC = () => {
  const [notification, setNotification] = React.useState<string | null>(null);
  const notifTimeout = React.useRef<number | null>(null);

  const showNotify = React.useCallback((msg: string) => {
    setNotification(msg);
    if (notifTimeout.current) window.clearTimeout(notifTimeout.current);
    notifTimeout.current = window.setTimeout(() => setNotification(null), 2500);
  }, []);

  const library = useLibrary(showNotify);
  const { 
    playlist, setPlaylist, viewPath, setViewPath, 
    libraryRootPaths, currentViewItems, searchQuery, setSearchQuery, sortBy, setSortBy, 
    sortOrder, setSortOrder, userPlaylists, setUserPlaylists, addNewPlaylist, setExplicitRoots,
    refreshLibrary, clearLibrary, removeItem, removeFolder, normalize, formatPath, handleFileSelection: libraryHandleFileSelection
  } = library;

  const previewVideoRef = React.useRef<HTMLVideoElement>(null);
  const requestedIndexRef = React.useRef<number | null>(null);

  const audioEngine = useAudioEngine(playlist, showNotify);
  const {
    mediaUrl, setMediaUrl, mediaType, isPlaying, setIsPlaying,
    currentIndex, setCurrentIndex, currentTime, setCurrentTime, duration, setDuration,
    volume, setVolume, playbackSpeed, setPlaybackSpeed, isShuffle, setIsShuffle,
    repeatMode, setRepeatMode, isMuted, setIsMuted, audioTracks,
    eqGains, setEqGains, currentPreset, setCurrentPreset,
    crossfadeEnabled,
    activePlayer,
    isCrossfading, crossfadeDuration,
    videoRef, audioRef, audioRef2,
    playMedia, handleCrossfade, handleNext, handlePrev, togglePlay, toggleMute, handleSkip,
    detectAudioTracks, switchAudioTrack, handleVolumeWheel, handleVolumeChange
  } = audioEngine;

  const metadata = useMetadata(playlist, currentIndex, showNotify);
  const { albumArt, subtitlesUrl, lyrics, lyricIndex, setLyricIndex, dominantColor } = metadata;

  const handleScrub = React.useCallback((percent: number) => {
    const time = Math.max(0, Math.min(1, percent)) * duration;
    const el = mediaType === 'video' ? videoRef.current : (activePlayer === 'A' ? audioRef.current : audioRef2.current);
    if (el) el.currentTime = time;
    setCurrentTime(time);
  }, [mediaType, duration, activePlayer, audioRef, audioRef2, videoRef, setCurrentTime]);

  // UI Hook
  const ui = useUI(
    togglePlay, handleSkip, toggleMute, setVolume, setIsMuted,
    playbackSpeed, setPlaybackSpeed, 10, showNotify,
    handleScrub, videoRef, audioRef, audioRef2,
    mediaType, activePlayer, setIsPlaying, duration, previewVideoRef
  );
  
  const { 
    isDragging, setIsDragging, isFullscreen, isMiniPlayer, isSettingsOpen, setIsSettingsOpen, theme, updateTheme,
    showControls, setShowControls, controlsTimeout, contextMenu, setContextMenu, contextMenuRef, handleContextMenu, toggleFullscreen, toggleMiniPlayer, togglePiP,
    handleMouseMoveScrubber, isScrubbing, 
    previewTime, previewPos, showPreview, setShowPreview,
    previewsEnabled, setPreviewsEnabled, adaptiveAuraEnabled, setAdaptiveAuraEnabled, autoHideEnabled, setAutoHideEnabled,
    alwaysOnTop, setAlwaysOnTop, brightness, updateBrightness, skipInterval, setSkipInterval
  } = ui;

  const [updateStatus, setUpdateStatus] = React.useState<{ status: string; version?: string } | null>(null);
  const [showVolumeHud, setShowVolumeHud] = React.useState(false);
  const volumeHudTimeout = React.useRef<number | null>(null);

  const triggerVolumeHud = React.useCallback(() => {
    setShowVolumeHud(true);
    if (volumeHudTimeout.current) window.clearTimeout(volumeHudTimeout.current);
    volumeHudTimeout.current = window.setTimeout(() => setShowVolumeHud(false), 1500);
  }, []);

  const prevVolState = React.useRef({ volume, isMuted });
  React.useEffect(() => {
    if (prevVolState.current.volume !== volume || prevVolState.current.isMuted !== isMuted) {
      if (!isSettingsOpen) triggerVolumeHud();
      prevVolState.current = { volume, isMuted };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, isMuted]);

  const checkForUpdates = async () => {
    setUpdateStatus({ status: 'checking' });
    try {
      const response = await fetch('https://api.github.com/repos/Indrajit-suzzi/auraplayer/releases/latest');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      if (latestVersion === APP_VERSION) setUpdateStatus({ status: 'latest' });
      else setUpdateStatus({ status: 'available', version: data.tag_name });
    } catch {
      setUpdateStatus(null);
      showNotify("Could not check for updates");
    }
  };

  const timeTextRef = React.useRef<HTMLDivElement>(null);
  const scrubberFillRef = React.useRef<HTMLDivElement>(null);

  const handleTimeUpdate = React.useCallback((el: HTMLMediaElement | null) => {
    if (!el || isScrubbing) return;
    const time = el.currentTime;
    const dur = el.duration || 0;
    
    // Low-level UI update (bypass React)
    if (timeTextRef.current) timeTextRef.current.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
    if (scrubberFillRef.current) scrubberFillRef.current.style.width = `${(time/dur)*100}%`;
    
    // High-level state (throttled)
    if (Math.abs(currentTime - time) > 1) {
      setCurrentTime(time);
    }
  }, [isScrubbing, currentTime, setCurrentTime]);

  React.useEffect(() => {
    if (requestedIndexRef.current !== null && playlist[requestedIndexRef.current]) {
      const idx = requestedIndexRef.current;
      requestedIndexRef.current = null;
      playMedia(idx);
    }
  }, [playlist, playMedia]);

  React.useEffect(() => {
    const electronBridge = (window as any).electron as ElectronBridge;
    if (electronBridge) {
      electronBridge.onOpenFile((rawPath: string) => {
        const filePath = formatPath(rawPath);
        const normPath = normalize(rawPath);
        if (!MEDIA_EXTENSIONS_REGEX.test(filePath)) return;
        const name = filePath.split('/').pop() || 'Unknown File', mUrl = `media://app/${encodeURIComponent(filePath)}`;
        const isVideo = VIDEO_EXTENSIONS_REGEX.test(filePath);
        electronBridge.getFileStats(normPath).then((stats: any) => {
          setPlaylist((prev: MediaItem[]) => {
            const index = prev.findIndex(item => item.url === mUrl);
            if (index !== -1) { requestedIndexRef.current = index; return prev; }
            const newItem: MediaItem = { 
              name, url: mUrl, path: filePath, type: isVideo ? 'video/mp4' : 'audio/mpeg',
              size: stats.size, addedAt: stats.birthtime || Date.now()
            };
            requestedIndexRef.current = prev.length;
            
            const parentDir = filePath.split('/').slice(0, -1).join('/');
            setExplicitRoots(r => {
                if (r.map(normalize).includes(normalize(parentDir))) return r;
                return [...r, parentDir];
            });

            return [...prev, newItem];
          });
          showNotify("File loaded from system");
        });
      });
    }
    return () => {
      const bridge = (window as any).electron as ElectronBridge;
      if (bridge?.removeOpenFileListener) bridge.removeOpenFileListener();
    };
  }, [showNotify, normalize, setPlaylist]);

  React.useEffect(() => {
    const electron = (window as any).electron as ElectronBridge;
    if (electron?.setAlwaysOnTop) electron.setAlwaysOnTop(alwaysOnTop);
  }, [alwaysOnTop]);


  React.useEffect(() => {
    if (lyrics.length > 0) {
      const idx = lyrics.findIndex((l, i) => currentTime >= l.time && (i === lyrics.length - 1 || currentTime < lyrics[i + 1].time));
      if (idx !== -1 && idx !== lyricIndex) setLyricIndex(idx);
    }
  }, [currentTime, lyrics, lyricIndex, setLyricIndex]);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files; if (!files || files.length === 0) return;
    
    const filesToLoad: any[] = [];
    const rootsToTrack: string[] = [];
    const electron = (window as any).electron as ElectronBridge;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const realPath = electron?.getPath ? electron.getPath(file) : (file as any).path;
      if (!realPath) continue;

      const absPath = formatPath(realPath);

      if (electron?.scanDirectory) {
        const scanned = await electron.scanDirectory(realPath);
        if (scanned && scanned.length > 0) {
          // It was a directory with media
          rootsToTrack.push(absPath);
          scanned.forEach(item => {
            filesToLoad.push({
              ...item,
              url: `media://app/${encodeURIComponent(formatPath(item.path))}`
            });
          });
        } else if (MEDIA_EXTENSIONS_REGEX.test(file.name)) {
          // It's a single media file
          rootsToTrack.push(absPath.split('/').slice(0, -1).join('/'));
          filesToLoad.push({
            name: file.name,
            path: absPath,
            size: file.size,
            type: file.type,
            url: `media://app/${encodeURIComponent(absPath)}`
          });
        }
      }
    }

    if (rootsToTrack.length > 0) {
      setExplicitRoots(prev => {
        const toAdd = rootsToTrack.filter(r => !prev.map(normalize).includes(normalize(r)));
        return [...prev, ...toAdd];
      });
    }

    if (filesToLoad.length > 0) {
      setPlaylist(prev => {
        const uniqueNewItems = filesToLoad.filter(newItem => !prev.some(oldItem => (oldItem.path && normalize(oldItem.path) === normalize(newItem.path))));
        const updated = [...prev, ...uniqueNewItems];
        if (electron?.saveLibrary) electron.saveLibrary(updated);
        return updated;
      });
      showNotify(`${filesToLoad.length} items added`);
    }
  };

  const handleAddFolder = async () => {
    const electron = (window as any).electron as ElectronBridge;
    if (electron?.selectFolder) {
      const folderPath = await electron.selectFolder();
      if (!folderPath) return;

      const scanned = await electron.scanDirectory(folderPath);
      if (scanned && scanned.length > 0) {
        showNotify("Processing Metadata... Please wait.");
        const absPath = formatPath(folderPath);
        const BATCH_SIZE = 5;
        
        for (let i = 0; i < scanned.length; i += BATCH_SIZE) {
          const batch = scanned.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(async (item) => {
            const url = `media://app/${encodeURIComponent(formatPath(item.path))}`;
            const mediaItem: MediaItem = {
              ...item,
              url,
              addedAt: item.birthtime || Date.now()
            } as MediaItem;
            
            return new Promise<MediaItem>((resolve) => {
              const el = item.type?.startsWith('video') ? document.createElement('video') : new Audio();
              el.src = url;
              el.onloadedmetadata = () => {
                resolve({ ...mediaItem, duration: el.duration });
                el.src = '';
              };
              el.onerror = () => resolve(mediaItem);
              setTimeout(() => resolve(mediaItem), 1500);
            });
          }));

          // Progressive Update: Add current batch to playlist immediately
          setPlaylist(prev => {
            const existingPaths = new Set(prev.map(p => p.path ? normalize(p.path) : ''));
            const uniqueResults = results.filter(ni => ni.path && !existingPaths.has(normalize(ni.path)));
            if (uniqueResults.length === 0) return prev;
            
            const updated = [...prev, ...uniqueResults];
            // Only save full library at end or periodically? 
            // Saving every batch is safer but heavier. Let's do it per batch for now.
            if (electron?.saveLibrary) electron.saveLibrary(updated);
            return updated;
          });
        }

        setExplicitRoots(prev => {
          if (prev.map(normalize).includes(normalize(absPath))) return prev;
          return [...prev, absPath];
        });

        showNotify(`Import complete`);
      }
    }
  };

  const handleRemoveItem = React.useCallback((e: React.MouseEvent, index: number) => {
    removeItem(e, index);
    if (index === currentIndex) { setMediaUrl(null); setIsPlaying(false); }
    else if (index < currentIndex) setCurrentIndex((prev: number) => prev - 1);
  }, [removeItem, currentIndex, setCurrentIndex, setMediaUrl, setIsPlaying]);

  const handleRemoveFolder = React.useCallback((e: React.MouseEvent, path: string) => {
    removeFolder(e, path);
    if (playlist.filter(i => !i.path?.startsWith(path)).length === 0) { setMediaUrl(null); setIsPlaying(false); }
  }, [removeFolder, playlist, setMediaUrl, setIsPlaying]);

  React.useEffect(() => {
    const currentItem = playlist[currentIndex];
    if (currentItem) {
      const name = currentItem.name.split('.')[0] || '';
      document.title = `${name} - Aura Player`;
    } else {
      document.title = 'Aura Player';
    }
  }, [playlist, currentIndex]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`app-container ${isFullscreen ? 'mode-fs' : 'mode-normal'} ${!showControls && isFullscreen ? 'hide-ui' : ''} ${isDragging ? 'drag-active' : ''} ${isMiniPlayer ? 'mode-mini' : ''}`}
      style={{ 
        '--accent-primary': (adaptiveAuraEnabled && dominantColor) ? dominantColor : undefined, 
        '--aura-bg': (adaptiveAuraEnabled && dominantColor) ? `${dominantColor}40` : 'rgba(0, 132, 255, 0.15)' 
      } as any}
      onMouseMove={() => { setShowControls(true); if (controlsTimeout.current) window.clearTimeout(controlsTimeout.current); if (isFullscreen && isPlaying && autoHideEnabled) controlsTimeout.current = window.setTimeout(() => setShowControls(false), 3000); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      data-theme={theme}
    >
      {!(window as any).electron && (
        <div className="browser-warning glass" style={{
          position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'rgba(255, 0, 0, 0.2)', color: '#ff4444',
          padding: '8px 20px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          border: '1px solid rgba(255, 0, 0, 0.3)', pointerEvents: 'none'
        }}>
          ⚠️ NOT IN DESKTOP MODE: Playback will not work in a standard browser. Use AuraPlayer.exe.
        </div>
      )}
      {showVolumeHud && (
        <div className="volume-hud-luxe glass">
          <div className="volume-hud-icon">
            {volume === 0 || isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
          </div>
          <div className="volume-hud-bar-wrap">
            <div className="volume-hud-bar-fill" style={{ width: `${volume * 100}%` }}></div>
          </div>
          <div className="volume-hud-percent">{Math.round(volume * 100)}%</div>
        </div>
      )}

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
            <div className="mini-title">{playlist[currentIndex]?.name?.split('.')[0] ?? ''}</div>
            <div className="mini-actions"><div className="icon-btn" onClick={() => toggleMiniPlayer()} title="Restore View"><Maximize size={16} /></div></div>
          </div>
        </div>
      ) : (
        <>
          {notification && <div className="aura-notification glass"><CheckCircle2 size={16} color="var(--accent-primary)" /><span>{notification}</span></div>}
          {isDragging && <div className="drag-overlay"><div className="drag-content"><UploadCloud size={60} className="drag-icon" /><h2>Drop files or folders anywhere</h2></div></div>}
          {contextMenu && (
            <div ref={contextMenuRef} className="custom-context-menu glass" onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}>
              {mediaUrl && (<><div className="menu-item" onClick={togglePlay}>{isPlaying ? <Pause size={14} /> : <Play size={14} />} <span>{isPlaying ? 'Pause' : 'Play'}</span></div><div className="menu-divider" /><div className="menu-item" onClick={handleNext}><SkipForward size={14} /> <span>Next File</span></div><div className="menu-item" onClick={handlePrev}><SkipBack size={14} /> <span>Previous File</span></div><div className="menu-divider" /></>)}
              <div className="menu-item" onClick={() => document.getElementById('file-up')?.click()}><PlusSquare size={14} /> <span>Add Files</span></div>
              <div className="menu-item" onClick={() => document.getElementById('folder-up')?.click()}><Folder size={14} /> <span>Open Folder</span></div>
              <div className="menu-item" onClick={refreshLibrary}><RotateCw size={14} /> <span>Refresh Library</span></div>
              {mediaUrl && (
                <>
                  <div className="menu-divider" /><div className="menu-group-label">Add to Playlist</div>
                  {Object.keys(userPlaylists).length === 0 ? <div className="menu-item disabled" style={{opacity:0.4, fontSize:'11px'}}>No playlists created</div> : 
                    Object.keys(userPlaylists).map(pName => (
                      <div key={pName} className="menu-item" onClick={() => { setUserPlaylists(prev => ({ ...prev, [pName]: Array.from(new Set([...(prev[pName] || []), playlist[currentIndex].url])) })); showNotify(`Added to ${pName}`); }}>
                        <Music size={12} /> <span>{pName}</span>
                      </div>
                    ))
                  }
                </>
              )}
              <div className="menu-divider" />
              {mediaType === 'video' && <div className="menu-item" onClick={() => togglePiP(videoRef)}><PictureInPicture2 size={14} /> <span>Native PiP</span></div>}
              {mediaUrl && (<div className="menu-item" onClick={() => { if (playlist[currentIndex]?.name) { navigator.clipboard.writeText(playlist[currentIndex].name); showNotify("Media name copied"); } }}><Copy size={14} /> <span>Copy File Name</span></div>)}
            </div>
          )}

          <input type="file" multiple id="file-up" style={{display:'none'}} onChange={(e) => libraryHandleFileSelection(e.target.files as any, false)} />
          <input type="file" id="folder-up" style={{display:'none'}} {...({ webkitdirectory: 'true', directory: '' } as any)} onChange={(e) => libraryHandleFileSelection(e.target.files as any, true)} />

          <SettingsModal
            isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} theme={theme} updateTheme={updateTheme}
            adaptiveAuraEnabled={adaptiveAuraEnabled} setAdaptiveAuraEnabled={setAdaptiveAuraEnabled} autoHideEnabled={autoHideEnabled} setAutoHideEnabled={setAutoHideEnabled}
            previewsEnabled={previewsEnabled} setPreviewsEnabled={setPreviewsEnabled} alwaysOnTop={alwaysOnTop} setAlwaysOnTop={setAlwaysOnTop}
            brightness={brightness} updateBrightness={updateBrightness}
            skipInterval={skipInterval} setSkipInterval={setSkipInterval} crossfadeEnabled={crossfadeEnabled}
            crossfadeDuration={crossfadeDuration} currentPreset={currentPreset} setCurrentPreset={setCurrentPreset}
            eqGains={eqGains} setEqGains={setEqGains} clearLibrary={clearLibrary} updateStatus={updateStatus} checkForUpdates={checkForUpdates} showNotify={showNotify}
          />
          {!mediaUrl && playlist.length === 0 && (<div className="welcome-screen-luxe"><div className="welcome-card-luxe glass"><div className="suite-logo">✦</div><h1>Aura Player</h1><div className="dash-actions-vertical"><button onClick={handleAddFolder} className="btn-modern primary">Select a Folder</button><label htmlFor="file-up" className="btn-modern secondary">Drag & Drop Files Here</label></div></div></div>)}

          <Header currentMediaName={playlist[currentIndex]?.name} setIsSettingsOpen={setIsSettingsOpen} />
          <Sidebar
            isFullscreen={isFullscreen} viewPath={viewPath} setViewPath={setViewPath} libraryRootPaths={libraryRootPaths} playlist={playlist} currentIndex={currentIndex}
            sortBy={sortBy} setSortBy={setSortBy} sortOrder={sortOrder} setSortOrder={setSortOrder} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            currentViewItems={currentViewItems} addNewPlaylist={addNewPlaylist} refreshLibrary={refreshLibrary} clearLibrary={clearLibrary}
            handleCrossfade={handleCrossfade} removeItem={handleRemoveItem} removeFolder={handleRemoveFolder} userPlaylists={userPlaylists} setUserPlaylists={setUserPlaylists} showNotify={showNotify}
            isPlaying={isPlaying} onAddFolder={handleAddFolder}
          />
          <MainViewport 
            mediaType={mediaType} mediaUrl={mediaUrl} isPlaying={isPlaying} isScrubbing={isScrubbing} adaptiveAuraEnabled={adaptiveAuraEnabled} albumArt={albumArt}
            subtitlesUrl={subtitlesUrl} lyrics={lyrics} lyricIndex={lyricIndex} playlist={playlist} currentIndex={currentIndex} activePlayer={activePlayer}
            crossfadeEnabled={crossfadeEnabled} isCrossfading={isCrossfading} crossfadeDuration={crossfadeDuration} videoRef={videoRef} audioRef={audioRef} audioRef2={audioRef2}
            togglePlay={togglePlay} toggleFullscreen={toggleFullscreen} setCurrentTime={setCurrentTime} setDuration={setDuration} setIsPlaying={setIsPlaying}
            handleNext={handleNext} detectAudioTracks={detectAudioTracks}
            brightness={brightness}
            handleTimeUpdate={handleTimeUpdate}
            showNotify={showNotify}
          />
          <PlayerControls 
            mediaUrl={mediaUrl} mediaType={mediaType} isPlaying={isPlaying} isShuffle={isShuffle} repeatMode={repeatMode} currentTime={currentTime} duration={duration}
            playbackSpeed={playbackSpeed} volume={volume} isMuted={isMuted} skipInterval={skipInterval} audioTracks={audioTracks} subtitlesUrl={subtitlesUrl}
            previewPos={previewPos} previewTime={previewTime} showPreview={showPreview} videoRef={videoRef} previewVideoRef={previewVideoRef}
            timeTextRef={timeTextRef} scrubberFillRef={scrubberFillRef}
            togglePlay={togglePlay} handlePrev={handlePrev} handleNext={handleNext} handleSkip={handleSkip} toggleMute={toggleMute} toggleFullscreen={toggleFullscreen}
            toggleMiniPlayer={() => toggleMiniPlayer()} setIsShuffle={setIsShuffle} setRepeatMode={setRepeatMode} setPlaybackSpeed={setPlaybackSpeed}
            handleScrub={handleScrub} handleMouseMoveScrubber={handleMouseMoveScrubber} setShowPreview={setShowPreview} handleVolumeWheel={handleVolumeWheel}
            handleVolumeChange={handleVolumeChange} switchAudioTrack={switchAudioTrack} showNotify={showNotify} formatTime={formatTime}
          />
        </>
      )}
    </div>
  );
};

export default App;
