import React from 'react';
import { Settings, X } from 'lucide-react';
import { EQ_FREQUENCIES, EQ_PRESETS, APP_VERSION } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  updateTheme: (t: string) => void;
  adaptiveAuraEnabled: boolean;
  setAdaptiveAuraEnabled: (v: boolean) => void;
  autoHideEnabled: boolean;
  setAutoHideEnabled: (v: boolean) => void;
  previewsEnabled: boolean;
  setPreviewsEnabled: (v: boolean) => void;
  alwaysOnTop: boolean;
  setAlwaysOnTop: (v: boolean) => void;
  brightness: number;
  updateBrightness: (v: number) => void;
  skipInterval: number;
  setSkipInterval: (v: number) => void;
  crossfadeEnabled: boolean;
  setCrossfadeEnabled: (v: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (v: number) => void;
  currentPreset: string;
  setCurrentPreset: (v: string) => void;
  eqGains: number[];
  setEqGains: (v: number[]) => void;
  clearLibrary: () => void;
  updateStatus: { status: string; version?: string } | null;
  checkForUpdates: () => void;
  showNotify: (msg: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, theme, updateTheme, adaptiveAuraEnabled, setAdaptiveAuraEnabled,
  autoHideEnabled, setAutoHideEnabled, previewsEnabled, setPreviewsEnabled,
  alwaysOnTop, setAlwaysOnTop, brightness, updateBrightness, skipInterval, setSkipInterval,
  crossfadeEnabled, setCrossfadeEnabled, crossfadeDuration, setCrossfadeDuration,
  currentPreset, setCurrentPreset, eqGains, setEqGains,
  clearLibrary, updateStatus, checkForUpdates, showNotify
}) => {
  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-card glass" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
            <Settings size={20} color="var(--accent-primary)" />
            <h2 style={{fontSize:'18px', fontWeight:800}}>Settings</h2>
          </div>
          <X className="icon-btn" onClick={onClose} />
        </div>
        
        <div className="settings-body">
          <div className="settings-section">
            <span className="settings-label">APPEARANCE</span>
            <div className="theme-grid">
              {['blue', 'purple', 'emerald', 'amber', 'rose'].map(t => (
                <div key={t} className={`theme-opt ${theme === t ? 'active' : ''}`} style={{background: `var(--accent-primary)`}} onClick={() => updateTheme(t)} data-theme={t} />
              ))}
            </div>
            
            <div style={{marginTop:'24px'}}>
              <div className="settings-toggle-row">
                <span>Display Brightness</span>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <input 
                    type="range" min="0.5" max="1.5" step="0.05" 
                    value={brightness} 
                    onChange={(e) => updateBrightness(parseFloat(e.target.value))} 
                    style={{width:'100px'}} 
                  />
                  <span style={{fontSize:'11px', width:'30px', fontWeight:800}}>{Math.round(brightness * 100)}%</span>
                </div>
              </div>
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

          <div className="settings-section" style={{opacity: 0.6, pointerEvents: 'none'}}>
            <span className="settings-label">AUDIO ENGINE (Not Working Properly - Fixed in Future Updates)</span>
            <div className="settings-toggle-row"><span>Enable track crossfading</span><div className={`suite-switch ${crossfadeEnabled ? 'active' : ''}`} /></div>
            <div className="settings-toggle-row"><span>Crossfade Duration</span><div style={{display:'flex', alignItems:'center', gap:'10px'}}><input type="range" min="1" max="12" value={crossfadeDuration} readOnly style={{width:'100px'}} /> <span style={{fontSize:'11px', width:'25px'}}>{crossfadeDuration}s</span></div></div>
            
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
            <button className="btn-modern secondary" style={{width:'100%', color:'#ff4b4b', border:'1px solid rgba(255,75,75,0.2)', fontSize:'12px'}} onClick={() => { clearLibrary(); onClose(); }}>Clear All Files & Library</button>
          </div>

          <div className="settings-section" style={{borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:'24px'}}>
            <span className="settings-label">APP INFORMATION</span>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
              <span style={{fontSize:'13px', opacity:0.6}}>Version {APP_VERSION}</span>
              {updateStatus?.status === 'available' ? (
                <a 
                  href="https://github.com/Indrajit-suzzi/auraplayer/releases/latest" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="update-badge available"
                >
                  Update Available: {updateStatus.version}
                </a>
              ) : updateStatus?.status === 'latest' ? (
                <span className="update-badge latest">Up to date</span>
              ) : null}
            </div>
            <button 
              className="btn-modern secondary" 
              style={{width:'100%', fontSize:'12px'}} 
              disabled={updateStatus?.status === 'checking'}
              onClick={checkForUpdates}
            >
              {updateStatus?.status === 'checking' ? 'Checking for updates...' : 'Check for Updates'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
