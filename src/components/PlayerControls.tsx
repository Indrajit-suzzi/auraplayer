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
    <footer className="master-controls glass">
      <div className="master-scrubber" 
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
        <div className="group-left">
          <div className="icon-btn-wrap" title="Shuffle">
            <Shuffle size={18} className={`nav-icon ${isShuffle ? 'active-accent' : ''}`} onClick={() => { const n = !isShuffle; setIsShuffle(n); showNotify(`Shuffle ${n ? 'On' : 'Off'}`); }} />
          </div>
          <div className="icon-btn-wrap" title="Previous"><SkipBack size={22} onClick={handlePrev} className="nav-icon" /></div>
          <div className="skip-group">
            <div className="icon-btn-wrap" title={`Back ${skipInterval}s`}><RotateCcw size={20} onClick={() => handleSkip(-skipInterval)} className="nav-icon" /></div>
            <div className="btn-play-luxe" onClick={togglePlay}>{isPlaying ? <Pause size={32} /> : <Play size={32} style={{marginLeft:'4px'}} />}</div>
            <div className="icon-btn-wrap" title={`Forward ${skipInterval}s`}><RotateCw size={20} onClick={() => handleSkip(skipInterval)} className="nav-icon" /></div>
          </div>
          <div className="icon-btn-wrap" title="Next"><SkipForward size={22} onClick={handleNext} className="nav-icon" /></div>
          <div className="icon-btn-wrap" title={repeatMode === 'one' ? 'Repeat One' : repeatMode === 'all' ? 'Repeat All' : 'Repeat Off'}>
            {repeatMode === 'one' ? <Repeat1 size={18} className="nav-icon active-accent" onClick={() => { setRepeatMode('none'); showNotify("Loop: Off"); }} /> : 
             repeatMode === 'all' ? <Repeat size={18} className="nav-icon active-accent" onClick={() => { setRepeatMode('one'); showNotify("Loop: One"); }} /> : 
             <Repeat size={18} className="nav-icon" onClick={() => { setRepeatMode('all'); showNotify("Loop: All"); }} />}
          </div>
          <div ref={timeTextRef} className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>
        </div>
        
        <div className="group-right">
          <div className="speed-selector-wrap">
            <Gauge size={14} />
            <select 
              className="suite-select speed-select-fine"
              value={playbackSpeed} 
              title="Playback Speed" 
              onChange={(e) => { const s = parseFloat(e.target.value); setPlaybackSpeed(s); showNotify(`Speed: ${s}x`); }}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => <option key={s} value={s}>{s}x</option>)}
            </select>
          </div>
          
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
              <div className="icon-btn-wrap" title="Mini Player (M)"><Monitor size={20} className="icon-btn" onClick={toggleMiniPlayer} /></div>
            </>
          )}
          
          <div className="icon-btn-wrap" title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
            {isMuted || volume === 0 ? <VolumeX size={20} opacity={0.6} className="icon-btn" onClick={toggleMute} /> : <Volume2 size={20} opacity={0.6} className="icon-btn" onClick={toggleMute} />}
          </div>
          <div className="luxe-vol-slider" onWheel={handleVolumeWheel} onClick={handleVolumeChange} title="Adjust Volume (Wheel)">
            <div className="luxe-vol-fill" style={{ width: `${volume * 100}%` }}></div>
          </div>
          <div className="icon-btn-wrap" title="Full Screen (F)">
            <Maximize size={22} className="icon-btn" onClick={toggleFullscreen} />
          </div>
        </div>
      </div>
    </footer>
  );
});

PlayerControls.displayName = 'PlayerControls';

export default PlayerControls;
