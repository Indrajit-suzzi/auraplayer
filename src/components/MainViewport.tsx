import React from 'react';
import { Pause, Music } from 'lucide-react';
import type { MediaItem } from '../types';

interface MainViewportProps {
  mediaType: 'video' | 'audio';
  mediaUrl: string | null;
  isPlaying: boolean;
  isScrubbing: boolean;
  adaptiveAuraEnabled: boolean;
  albumArt: string | null;
  subtitlesUrl: string | null;
  lyrics: Array<{time: number, text: string}>;
  lyricIndex: number;
  playlist: MediaItem[];
  currentIndex: number;
  activePlayer: 'A' | 'B';
  crossfadeEnabled: boolean;
  isCrossfading: boolean;
  crossfadeDuration: number;
  
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioRef2: React.RefObject<HTMLAudioElement | null>;
  
  togglePlay: () => void;
  toggleFullscreen: () => void;
  setCurrentTime: (t: number) => void;
  setDuration: (t: number) => void;
  setIsPlaying: (v: boolean) => void;
  handleNext: () => void;
  detectAudioTracks: () => void;
  handleTimeUpdate: (el: HTMLMediaElement | null) => void;
  brightness: number;
  showNotify: (msg: string) => void;
}

const MainViewport: React.FC<MainViewportProps> = React.memo(({
  mediaType, mediaUrl, isPlaying, adaptiveAuraEnabled, albumArt,
  subtitlesUrl, lyrics, lyricIndex, playlist, currentIndex, activePlayer,
  crossfadeEnabled, isCrossfading, crossfadeDuration,
  videoRef, audioRef, audioRef2,
  togglePlay, toggleFullscreen, setDuration, setIsPlaying,
  handleNext, detectAudioTracks, brightness, handleTimeUpdate, showNotify
}) => {
  const currentItem = playlist[currentIndex];

  return (
    <main className="master-viewport" onDoubleClick={toggleFullscreen} style={{ filter: `brightness(${brightness})` }}>
      {mediaType === 'video' ? (
        <div className="video-surface-wrap" onClick={togglePlay}>
          {mediaUrl && (
            <video 
              ref={videoRef} 
              src={mediaUrl} 
              autoPlay 
              className="video-engine" 
              onTimeUpdate={() => handleTimeUpdate(videoRef.current)} 
              onLoadedMetadata={() => { setDuration(videoRef.current?.duration || 0); detectAudioTracks(); }} 
              onEnded={handleNext} 
              onError={(e) => {
                const error = (e.target as any).error;
                console.error("Video Error:", error);
                showNotify(`Playback Error: ${error?.message || "Unknown Code " + error?.code}`);
              }}
              onPlay={() => setIsPlaying(true)} 
            >
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
            <div className="album-art-luxury shadow-2xl">
              {albumArt ? <img src={albumArt} alt="Art" /> : <div className="default-art"><Music size={120} opacity={0.2} strokeWidth={1} /></div>}
              {!isPlaying && mediaUrl && <div className="pause-overlay-audio"><Pause size={60} fill="white" style={{opacity:0.4}} /></div>}
            </div>
            <div className="audio-details">
              <h1 className="track-title-luxury">{currentItem?.title || currentItem?.name.split('.')[0]}</h1>
              {currentItem?.artist && <p className="track-artist-luxury">{currentItem.artist}</p>}
              {currentItem?.album && <p className="track-album-luxury">{currentItem.album}</p>}
            </div>
          </div>
          
          {mediaUrl && (
            <audio 
              ref={audioRef} 
              src={activePlayer === 'A' ? mediaUrl : undefined} 
              onTimeUpdate={() => {
                if (activePlayer === 'A') {
                  const el = audioRef.current;
                  if (el) {
                    handleTimeUpdate(el);
                    if (crossfadeEnabled && !isCrossfading && el.duration > 0 && el.duration - el.currentTime < crossfadeDuration && playlist.length > 1) {
                      handleNext();
                    }
                  }
                }
              }} 
              onLoadedMetadata={() => activePlayer === 'A' && setDuration(audioRef.current?.duration || 0)} 
              onEnded={handleNext} 
              onPlay={() => activePlayer === 'A' && setIsPlaying(true)} 
              onError={(e) => {
                const error = (e.target as any).error;
                console.error("Audio A Error:", error);
                showNotify(`Playback Error: ${error?.message || "Unknown Code " + error?.code}`);
              }}
            />
          )}
          <audio 
            ref={audioRef2} 
            src={activePlayer === 'B' ? (mediaUrl || undefined) : undefined} 
            onTimeUpdate={() => {
              if (activePlayer === 'B') {
                const el = audioRef2.current;
                if (el) {
                  handleTimeUpdate(el);
                  if (crossfadeEnabled && !isCrossfading && el.duration > 0 && el.duration - el.currentTime < crossfadeDuration && playlist.length > 1) {
                    handleNext();
                  }
                }
              }
            }} 
            onLoadedMetadata={() => activePlayer === 'B' && setDuration(audioRef2.current?.duration || 0)} 
            onEnded={handleNext} 
            onPlay={() => activePlayer === 'B' && setIsPlaying(true)} 
            onPause={(e) => { if (activePlayer === 'B' && e.currentTarget.readyState > 0) setIsPlaying(false); }} 
            onError={(e) => {
              const error = (e.target as any).error;
              console.error("Audio B Error:", error);
              // alert redundant for player B
            }}
          />
        </div>
      )}
    </main>
  );
});

MainViewport.displayName = 'MainViewport';

export default MainViewport;
