import React from 'react';
import { 
  ChevronLeft, ListPlus, RotateCw, SortAsc, SortDesc, Trash2, 
  Search, X, Music, Folder, Monitor, Music2 
} from 'lucide-react';
import type { MediaItem, ViewItem } from '../types';

interface SidebarProps {
  isFullscreen: boolean;
  viewPath: string | null;
  setViewPath: (path: string | null) => void;
  libraryRootPaths: string[];
  playlist: MediaItem[];
  currentIndex: number;
  sortBy: string;
  setSortBy: (val: 'name' | 'type' | 'size' | 'added' | 'duration') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (val: 'asc' | 'desc') => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  currentViewItems: ViewItem[];
  addNewPlaylist: () => void;
  refreshLibrary: () => void;
  clearLibrary: () => void;
  handleCrossfade: (index: number) => void;
  removeItem: (e: React.MouseEvent, index: number) => void;
  removeFolder: (e: React.MouseEvent, path: string) => void;
  userPlaylists: Record<string, string[]>;
  setUserPlaylists: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  showNotify: (msg: string) => void;
  isPlaying: boolean;
  onAddFolder?: () => void;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({
  isFullscreen, viewPath, setViewPath, libraryRootPaths, playlist, currentIndex,
  sortBy, setSortBy, sortOrder, setSortOrder, searchQuery, setSearchQuery,
  currentViewItems, addNewPlaylist, refreshLibrary, clearLibrary,
  handleCrossfade, removeItem, removeFolder, setUserPlaylists,
  showNotify, isPlaying, onAddFolder
}) => {
  if (isFullscreen) return null;

  const formatMode = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

  return (
    <aside className="master-sidebar glass">
      <div className="sidebar-header-row">
        {viewPath ? (
          <div className="breadcrumb-nav" style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div className="icon-btn" title="Go Back" style={{ flexShrink: 0 }} onClick={() => {
              if (libraryRootPaths.includes(viewPath)) setViewPath(null);
              else setViewPath(viewPath.split('/').slice(0, -1).join('/'));
            }}><ChevronLeft size={16} /></div>
            <div className="breadcrumbs" style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', fontSize: '11px', fontWeight: 600, gap: '4px', scrollbarWidth: 'none' }}>
              {viewPath.startsWith('virtual:') || viewPath.startsWith('playlist:') ? (
                <span style={{ cursor: 'pointer' }} onClick={() => setViewPath(null)}>{viewPath.split(':').pop()}</span>
              ) : (
                viewPath.split('/').map((part, idx, arr) => {
                  const clickPath = arr.slice(0, idx + 1).join('/');
                  return (
                    <React.Fragment key={clickPath}>
                      {idx > 0 && <span style={{ opacity: 0.3 }}>/</span>}
                      <span className="crumb" style={{ cursor: 'pointer', opacity: idx === arr.length - 1 ? 1 : 0.7 }} onClick={() => setViewPath(clickPath)}>
                        {part}
                      </span>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        ) : <div className="sidebar-label">LIBRARY</div>}
        <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
          {onAddFolder && <div className="icon-btn" title="Add Folder" onClick={onAddFolder}><ListPlus size={16} /></div>}
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
          currentViewItems.map((item, _index) => {
            const itemIndex = !item.isFolder ? playlist.findIndex(p => p.url === (item as MediaItem).url) : -1;
            const media = !item.isFolder ? item as MediaItem : null;
            
            return (
              <div 
                key={(item as MediaItem).url || item.path || _index}
                className={`queue-item ${item.isFolder ? 'folder-item' : (currentIndex === itemIndex ? 'active' : '')}`}
                onClick={() => item.isFolder ? setViewPath(item.path) : handleCrossfade(itemIndex)}
              >
                {item.isPlaylist ? <Music size={18} color="var(--accent-primary)" /> : item.isFolder ? <Folder size={18} color="var(--accent-primary)" /> : ((item as MediaItem).type?.startsWith('video') ? <Monitor size={16} /> : <Music2 size={16} />)}
                <div className="item-info-stack">
                  <span className="item-name">{media?.title || item.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {media?.artist && <span className="item-meta-sub">{media.artist}</span>}
                    {currentIndex === itemIndex && !item.isFolder && isPlaying && (
                      <div className="playing-bars">
                        <div className="bar"></div>
                        <div className="bar"></div>
                        <div className="bar"></div>
                      </div>
                    )}
                  </div>
                </div>
                {item.isPlaylist ? (
                  <div className="remove-item-btn" title="Delete Playlist" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete playlist "${item.name}"?`)) { setUserPlaylists(prev => { const n = { ...prev }; delete n[item.name]; return n; }); if (viewPath === item.path) setViewPath(null); } }}><X size={14} /></div>
                ) : item.isFolder ? (
                  <div className="remove-item-btn" title="Remove Folder Tree" onClick={(e) => removeFolder(e, item.path)}><X size={14} /></div>
                ) : (
                  <div className="remove-item-btn" title="Remove" onClick={(e) => { e.stopPropagation(); removeItem(e, itemIndex); }}><X size={14} /></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
