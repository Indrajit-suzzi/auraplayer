import React from 'react';
import { 
  Shuffle, SkipBack, SkipForward, Play, Pause, RotateCcw, RotateCw, 
  Repeat, Repeat1, Gauge, Languages, Subtitles, 
  Monitor, VolumeX, Volume2, Maximize 
} from 'lucide-react';

interface PlayerControlsProps {
  mediaUrl: string | null;
  mediaType: 'video' | 'audio';
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  skipInterval: number;
  audioTracks: Array<{index: number, label: string, enabled: boolean}>;
  subtitlesUrl: string | null;
  previewPos: number;
  previewTime: number;
  showPreview: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  timeTextRef: React.RefObject<HTMLDivElement | null>;
  scrubberFillRef: React.RefObject<HTMLDivElement | null>;
  
  togglePlay: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  handleSkip: (s: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  toggleMiniPlayer: () => void;
  setIsShuffle: (v: boolean) => void;
  setRepeatMode: (v: 'none' | 'all' | 'one') => void;
  setPlaybackSpeed: (v: number) => void;
  handleScrub: (percent: number) => void;
  handleMouseMoveScrubber: (e: React.MouseEvent) => void;
  setShowPreview: (v: boolean) => void;
  handleVolumeWheel: (e: React.WheelEvent) => void;
  handleVolumeChange: (e: React.MouseEvent | React.TouchEvent) => void;
  switchAudioTrack: (index: number) => void;
  showNotify: (msg: string) => void;
  formatTime: (s: number) => string;
}

const PlayerControls: React.FC<PlayerControlsProps> = React.memo(({
  mediaUrl, mediaType, isPlaying, isShuffle, repeatMode, currentTime, duration,
  playbackSpeed, volume, isMuted, skipInterval, audioTracks, subtitlesUrl,
  previewPos, previewTime, showPreview, videoRef, previewVideoRef,
  timeTextRef, scrubberFillRef,
  togglePlay, handlePrev, handleNext, handleSkip, toggleMute, toggleFullscreen,
  toggleMiniPlayer, setIsShuffle, setRepeatMode, setPlaybackSpeed,
  handleScrub, handleMouseMoveScrubber, setShowPreview, handleVolumeWheel,
  handleVolumeChange, switchAudioTrack, showNotify, formatTime
}) => {
  return (
    <footer className="master-controls glass" role="region" aria-label="Media Player Controls">
      <div className="master-scrubber" 
        role="slider"
        aria-label="Seek timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        onMouseDown={(e) => { 
          const rect = e.currentTarget.getBoundingClientRect();
          handleScrub((e.clientX - rect.left) / rect.width);
        }} 
        onMouseMove={handleMouseMoveScrubber} 
        onMouseEnter={() => setShowPreview(true)} 
        onMouseLeave={() => setShowPreview(false)}
      >
        {mediaType === 'video' ? (
          <div className="video-preview-window" style={{ left: `${previewPos}px`, visibility: (showPreview && mediaUrl) ? 'visible' : 'hidden', opacity: (showPreview && mediaUrl) ? 1 : 0 }}>
            <video ref={previewVideoRef} src={mediaUrl || undefined} muted className="preview-video-element" />
            <div className="preview-time">{formatTime(previewTime)}</div>
          </div>
        ) : (
          <div className="time-preview-bubble" style={{ left: `${previewPos}px`, visibility: (showPreview && mediaUrl) ? 'visible' : 'hidden', opacity: (showPreview && mediaUrl) ? 1 : 0 }}>
            {formatTime(previewTime)}
          </div>
        )}
        <div ref={scrubberFillRef} className="scrubber-fill" style={{ width: `${(currentTime/duration)*100 || 0}%` }}></div>
      </div>
      
      <div className="controls-row-master">
        <div className="group-left" role="group" aria-label="Playback controls">
          <button className="icon-btn-wrap" title="Shuffle" aria-label={`Shuffle ${isShuffle ? 'On' : 'Off'}`} aria-pressed={isShuffle} onClick={() => { const n = !isShuffle; setIsShuffle(n); showNotify(`Shuffle ${n ? 'On' : 'Off'}`); }}>
            <Shuffle size={18} className={`nav-icon ${isShuffle ? 'active-accent' : ''}`} />
          </button>
          <button className="icon-btn-wrap" title="Previous" aria-label="Previous track" onClick={handlePrev}><SkipBack size={22} className="nav-icon" /></button>
          <div className="skip-group" role="group">
            <button className="icon-btn-wrap" title={`Back ${skipInterval}s`} aria-label={`Skip back ${skipInterval} seconds`} onClick={() => handleSkip(-skipInterval)}><RotateCcw size={20} className="nav-icon" /></button>
            <button className="btn-play-luxe" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={32} /> : <Play size={32} style={{marginLeft:'4px'}} />}</button>
            <button className="icon-btn-wrap" title={`Forward ${skipInterval}s`} aria-label={`Skip forward ${skipInterval} seconds`} onClick={() => handleSkip(skipInterval)}><RotateCw size={20} className="nav-icon" /></button>
          </div>
          <button className="icon-btn-wrap" title="Next" aria-label="Next track" onClick={handleNext}><SkipForward size={22} className="nav-icon" /></button>
          <button className="icon-btn-wrap" 
            title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
            aria-label={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}
            onClick={() => { 
              if (repeatMode === 'one') { setRepeatMode('none'); showNotify("Loop: Off"); }
              else if (repeatMode === 'all') { setRepeatMode('one'); showNotify("Loop: One"); }
              else { setRepeatMode('all'); showNotify("Loop: All"); }
            }}
          >
            {repeatMode === 'one' ? <Repeat1 size={18} className="nav-icon active-accent" /> : 
             repeatMode === 'all' ? <Repeat size={18} className="nav-icon active-accent" /> : 
             <Repeat size={18} className="nav-icon" />}
          </button>
          <div ref={timeTextRef} className="time-display" aria-live="polite" aria-label="Current time">{formatTime(currentTime)} / {formatTime(duration)}</div>
        </div>
        
        <div className="group-right" role="group" aria-label="Advanced controls">
          <div className="speed-selector-wrap">
            <Gauge size={14} aria-hidden="true" />
            <label htmlFor="playback-speed" className="sr-only">Playback Speed</label>
            <select 
              id="playback-speed"
              className="suite-select speed-select-fine"
              value={playbackSpeed} 
              title="Playback Speed" 
              aria-label="Playback Speed"
              onChange={(e) => { const s = parseFloat(e.target.value); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
          
          {mediaType === 'video' && (
            <>
              {audioTracks.length > 1 && (
                <button className="icon-btn-wrap" title="Switch Audio Language" aria-label="Switch Audio Track" onClick={() => {
                  const currentIdx = audioTracks.findIndex(t => t.enabled);
                  const nextIdx = (currentIdx + 1) % audioTracks.length;
                  switchAudioTrack(nextIdx);
                }}>
                  <Languages size={20} className="icon-btn active-accent" />
                </button>
              )}
              <button className="icon-btn-wrap" title="Toggle Subtitles" aria-label={`Subtitles ${subtitlesUrl ? 'On' : 'Off'}`} aria-pressed={!!subtitlesUrl}
                onClick={() => {
                  if (videoRef.current && videoRef.current.textTracks.length > 0) {
                    const track = videoRef.current.textTracks[0];
                    track.mode = track.mode === 'showing' ? 'hidden' : 'showing';
                    showNotify(`Subtitles: ${track.mode === 'showing' ? 'On' : 'Off'}`);
                  } else {
                    showNotify("No subtitles available");
                  }
                }}
              >
                <Subtitles size={20} className={`icon-btn ${subtitlesUrl ? 'active-accent' : ''}`} style={{ opacity: subtitlesUrl ? 1 : 0.4 }} />
              </button>
              <button className="icon-btn-wrap" title="Mini Player (M)" aria-label="Toggle Mini Player" onClick={toggleMiniPlayer}>
                <Monitor size={20} className="icon-btn" />
              </button>
            </>
          )}
          
          <button className="icon-btn-wrap" title={isMuted ? 'Unmute (M)' : 'Mute (M)'} aria-label={isMuted ? 'Unmute' : 'Mute'} aria-pressed={isMuted} onClick={toggleMute}>
            {isMuted || volume === 0 ? <VolumeX size={20} opacity={0.6} className="icon-btn" /> : <Volume2 size={20} opacity={0.6} className="icon-btn" />}
          </button>
          <div className="luxe-vol-slider" role="slider" aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(volume * 100)} onWheel={handleVolumeWheel} onClick={handleVolumeChange} title="Adjust Volume (Wheel)">
            <div className="luxe-vol-fill" style={{ width: `${volume * 100}%` }}></div>
          </div>
          <button className="icon-btn-wrap" title="Full Screen (F)" aria-label="Toggle Fullscreen" onClick={toggleFullscreen}>
            <Maximize size={22} className="icon-btn" />
          </button>
        </div>
      </div>
    </footer>
  );
});

PlayerControls.displayName = 'PlayerControls';

export default PlayerControls;
