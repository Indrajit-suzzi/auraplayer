import React from 'react';
import jsmediatags from 'jsmediatags';
import type { MediaItem, ViewItem, ElectronBridge, ScannedFile, FileWithPath } from '../types';
import { MEDIA_EXTENSIONS_REGEX } from '../constants';

export const useLibrary = (
  showNotify: (msg: string) => void
) => {
  const [playlist, setPlaylist] = React.useState<MediaItem[]>([]);
  const [viewPath, setViewPath] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'type' | 'size' | 'added' | 'duration'>('name');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [userPlaylists, setUserPlaylists] = React.useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('aura-playlists');
    return saved ? JSON.parse(saved) : {};
  });

  const [explicitRoots, setExplicitRoots] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('aura-explicit-roots');
    return saved ? JSON.parse(saved) : [];
  });
  const [libraryRootPaths, setLibraryRootPaths] = React.useState<string[]>([]);

  const formatPath = React.useCallback((p: string | undefined | null) => p ? p.replace(/\\/g, '/').replace(/\/$/, '') : '', []);
  const normalize = React.useCallback((p: string | undefined | null) => p ? p.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '') : '', []);

  // --- Persistence ---

  React.useEffect(() => {
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (electron?.loadLibrary) {
      electron.loadLibrary().then(parsed => {
        if (parsed && Array.isArray(parsed)) {
          // Detect if any items use the "Old Format" (relative paths)
          const hasRelativePaths = (parsed as any[]).some(item => {
            if (!item || typeof item !== 'object' || !item.path) return false;
            const p = String(item.path);
            return !(p.includes(':') || p.startsWith('/')); // Not absolute
          });

          if (hasRelativePaths) {
            console.warn("Detected legacy relative paths in library. Wiping for a fresh start.");
            setPlaylist([]);
            setExplicitRoots([]); // Also clear roots to be safe
            localStorage.removeItem('aura-explicit-roots');
            if (electron?.saveLibrary) electron.saveLibrary([]);
            showNotify("Library Cleaned: Please Re-Add your folders using the '+' button in the sidebar.");
            return;
          }

          const restored = (parsed as any[])
            .filter(item => item && typeof item === 'object' && item.path)
            .map(item => {
              const fPath = formatPath(item.path as string);
              return {
                ...item,
                path: fPath,
                url: `media://app/${encodeURIComponent(fPath)}`
              } as MediaItem;
            });
          setPlaylist(restored);
        } else {
          // If library is empty or missing, ensure roots are also empty to avoid ghost folders
          setExplicitRoots([]);
          localStorage.removeItem('aura-explicit-roots');
        }
      });
    }
  }, [formatPath]);

  React.useEffect(() => {
    const toSave = playlist.map(({ name, type, path, size, addedAt, duration, artist, album, title, thumbnail }) => ({ 
      name, type, path, size, addedAt, duration, artist, album, title, thumbnail 
    }));
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (electron?.saveLibrary) {
      electron.saveLibrary(toSave);
    }
  }, [playlist]);

  React.useEffect(() => {
    localStorage.setItem('aura-explicit-roots', JSON.stringify(explicitRoots));
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (electron?.updateAllowedRoots) {
      electron.updateAllowedRoots(explicitRoots.map(r => formatPath(r)));
    }
  }, [explicitRoots, formatPath]);

  React.useEffect(() => {
    localStorage.setItem('aura-playlists', JSON.stringify(userPlaylists));
  }, [userPlaylists]);

  // --- Proactive Background Metadata Scanner ---

  // --- Proactive Background Metadata Scanner (Batched & Faster) ---

  React.useEffect(() => {
    const missing = playlist.filter(i => typeof i.duration !== 'number' || (!i.artist && i.type?.startsWith('audio')));
    if (missing.length === 0) return;

    let isDisposed = false;
    const BATCH_SIZE = 5;

    const processItem = async (item: MediaItem): Promise<Partial<MediaItem> | null> => {
      return new Promise((resolve) => {
        const isAudio = item.type?.startsWith('audio') || !item.type?.startsWith('video');
        if (isAudio) {
          jsmediatags.read(item.url, {
            onSuccess: (tags) => {
              const { artist, album, title } = tags.tags;
              const tempAudio = new Audio();
              tempAudio.src = item.url;
              tempAudio.onloadedmetadata = () => {
                resolve({ 
                  duration: tempAudio.duration, 
                  artist: artist || 'Unknown Artist', 
                  album: album || 'Unknown Album', 
                  title: title || item.name.replace(/\.[^/.]+$/, "") 
                });
                tempAudio.src = '';
              };
              tempAudio.onerror = () => resolve({ duration: 0 });
            },
            onError: () => {
              const tempAudio = new Audio();
              tempAudio.src = item.url;
              tempAudio.onloadedmetadata = () => {
                resolve({ duration: tempAudio.duration });
                tempAudio.src = '';
              };
              tempAudio.onerror = () => resolve({ duration: 0 });
            }
          });
        } else {
          const tempVideo = document.createElement('video');
          tempVideo.src = item.url;
          tempVideo.onloadedmetadata = () => {
            resolve({ duration: tempVideo.duration });
            tempVideo.src = '';
          };
          tempVideo.onerror = () => resolve({ duration: 0 });
        }
      });
    };

    const runBatch = async () => {
      const itemsToProcess = missing.slice(0, BATCH_SIZE);
      const results = await Promise.all(itemsToProcess.map(processItem));
      
      if (isDisposed) return;

      setPlaylist(prev => {
        const updated = [...prev];
        itemsToProcess.forEach((item, idx) => {
          const res = results[idx];
          if (res) {
            const foundIdx = updated.findIndex(p => p.url === item.url);
            if (foundIdx !== -1) updated[foundIdx] = { ...updated[foundIdx], ...res };
          }
        });
        return updated;
      });
    };

    const timer = setTimeout(runBatch, 500);
    return () => { isDisposed = true; clearTimeout(timer); };
  }, [playlist]);

  // --- Actions ---

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
      const existingMap = new Map(prev.filter(p => p.path).map(p => [normalize(p.path!), p]));
      const newItems = allResults.map(r => {
        const fPath = formatPath(r.path);
        const nPath = normalize(r.path);
        const existing = existingMap.get(nPath);
        return {
          ...r,
          path: fPath,
          url: `media://app/${encodeURIComponent(fPath)}`,
          addedAt: r.birthtime,
          duration: existing?.duration,
          artist: existing?.artist,
          album: existing?.album,
          title: existing?.title
        };
      });
      return [...blobs, ...newItems];
    });
    showNotify("Library Refresh Complete");
  }, [explicitRoots, showNotify, normalize, formatPath]);

  const clearLibrary = React.useCallback(() => {
    playlist.forEach(i => { if (i.url?.startsWith('blob:')) URL.revokeObjectURL(i.url); });
    setPlaylist([]); setViewPath(null); setExplicitRoots([]);
    localStorage.removeItem('aura-explicit-roots');
    const electron = (window as unknown as { electron: ElectronBridge }).electron;
    if (electron?.saveLibrary) electron.saveLibrary([]);
    showNotify("Library Reset Complete");
  }, [playlist, showNotify]);

  const handleFileSelection = React.useCallback(async (files: File[] | FileList | null, isFolderSelection: boolean) => {
    if (!files || files.length === 0) return;
    
    showNotify("Processing Metadata... Please wait.");
    const rawItems = Array.from(files).filter(f => f.type.startsWith('video/') || f.type.startsWith('audio/') || MEDIA_EXTENSIONS_REGEX.test(f.name));
    
    const newItems: MediaItem[] = [];
    
    // Process in batches for metadata pre-load
    const BATCH_SIZE = 5;
    for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
      const batch = rawItems.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (f) => {
        const fPath = formatPath((f as any).customPath || (f as FileWithPath).path || (f as any).webkitRelativePath || '');
        const url = fPath ? `media://app/${encodeURIComponent(fPath)}` : URL.createObjectURL(f);
        
        const item: MediaItem = { 
          name: f.name, 
          url, 
          type: f.type, 
          file: f, 
          path: fPath, 
          size: f.size,
          addedAt: Date.now()
        };

        // Try to get duration at least
        return new Promise<MediaItem>((resolve) => {
          const el = f.type.startsWith('video') ? document.createElement('video') : new Audio();
          el.src = url;
          el.onloadedmetadata = () => {
             resolve({ ...item, duration: el.duration });
             el.src = '';
          };
          el.onerror = () => resolve(item);
          setTimeout(() => resolve(item), 1500);
        });
      }));
      newItems.push(...results);
    }
    if (newItems.length > 0) {
      const addedRoots = new Set<string>();
      if (isFolderSelection) {
        const firstFile = Array.from(files as Iterable<ScannedFile & { webkitRelativePath?: string }>).find((f) => !!f.webkitRelativePath);
        if (firstFile && firstFile.webkitRelativePath) {
          const relPath = formatPath(firstFile.webkitRelativePath);
          const absPath = formatPath(firstFile.path || '');
          if (absPath && relPath) {
            const relParts = relPath.split('/');
            const absParts = absPath.split('/');
            const root = absParts.slice(0, absParts.length - relParts.length + 1).join('/');
            if (root) addedRoots.add(root);
          }
        }
      } else {
        newItems.forEach(item => { if (item.path) addedRoots.add(item.path.split('/').slice(0, -1).join('/')); });
      }
      
      if (addedRoots.size > 0) {
        setExplicitRoots(prev => {
          const nPrev = new Set(prev.map(r => normalize(r)));
          const toAdd = Array.from(addedRoots).filter(r => !nPrev.has(normalize(r)));
          return [...prev, ...toAdd];
        });
      }

      setPlaylist(prev => {
        const existingPaths = new Set(prev.map(p => p.path ? normalize(p.path) : ''));
        const uniqueNewItems = newItems.filter(ni => (ni.path && !existingPaths.has(normalize(ni.path))) || (!ni.path && !prev.some(old => old.name === ni.name)));
        if (uniqueNewItems.length > 0) showNotify(`Added ${uniqueNewItems.length} items`);
        return [...prev, ...uniqueNewItems];
      });
    }
  }, [showNotify, explicitRoots, normalize, formatPath]);

  const removeItem = React.useCallback((e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const name = playlist[index]?.name;
    if (playlist[index]?.url?.startsWith('blob:')) URL.revokeObjectURL(playlist[index].url);
    setPlaylist(prev => { const updated = [...prev]; updated.splice(index, 1); return updated; });
    showNotify(`Removed ${name}`);
  }, [playlist, showNotify]);

  const removeFolder = React.useCallback((e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    const nFolderPath = normalize(folderPath);
    setPlaylist(prev => prev.filter(item => !item.path || !normalize(item.path).startsWith(nFolderPath)));
    setExplicitRoots(prev => prev.filter(r => normalize(r) !== nFolderPath && !normalize(r).startsWith(nFolderPath + '/')));
    if (viewPath && (normalize(viewPath) === nFolderPath || normalize(viewPath).startsWith(nFolderPath + '/'))) setViewPath(null);
    showNotify("Removed Folder Tree");
  }, [viewPath, showNotify, normalize]);

  const addNewPlaylist = React.useCallback(() => {
    const name = prompt("Enter playlist name:");
    if (name && !userPlaylists[name]) {
      setUserPlaylists(prev => ({ ...prev, [name]: [] }));
      showNotify(`Playlist "${name}" created`);
    }
  }, [userPlaylists, showNotify]);

  // --- Roots Logic ---

  React.useEffect(() => {
    // Only use explicitRoots as the primary folders in the sidebar.
    // This prevents "Ghost Folders" from appearing based on old playlist entries.
    const valid = explicitRoots.filter(r => r && (r.includes(':') || r.startsWith('/')));
    setLibraryRootPaths(valid.sort((a, b) => a.localeCompare(b)));
  }, [explicitRoots]);

  const currentViewItems = React.useMemo<ViewItem[]>(() => {
    const q = searchQuery.toLowerCase();
    const nvPath = viewPath ? normalize(viewPath) : null;
    if (nvPath === null) {
      const items: ViewItem[] = [];
      Object.keys(userPlaylists).forEach(name => { if (!q || name.toLowerCase().includes(q)) items.push({ isFolder: true, isPlaylist: true, name, path: `playlist:${name}` }); });
      libraryRootPaths.forEach(f => { if (!q || f.toLowerCase().includes(q)) items.push({ isFolder: true, name: f.split('/').pop() || f, path: f }); });
      const noPathItems = playlist.filter(i => !i.path);
      if (noPathItems.length > 0 && (!q || "my library".includes(q))) items.push({ isFolder: true, name: "My Library (Blobs)", path: "virtual:my-library" });
      return items.sort((a, b) => {
        const res = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
        return sortOrder === 'asc' ? res : -res;
      });
    }
    if (nvPath.startsWith('playlist:')) {
      const pName = nvPath.slice('playlist:'.length);
      return (userPlaylists[pName] || []).map(url => playlist.find(p => p.url === url)).filter((i): i is MediaItem => !!i).map(i => ({ ...i, isFolder: false }));
    }
    if (nvPath === 'virtual:my-library') return playlist.filter(i => !i.path && (!q || i.name.toLowerCase().includes(q))).map(i => ({ ...i, isFolder: false }));
    
    const allInPath = playlist.filter(i => i.path && normalize(i.path).startsWith(nvPath + '/'));
    const folderMap = new Map<string, ViewItem>();
    const files: ViewItem[] = [];
    
    allInPath.forEach(item => {
      const origPath = item.path!;
      const nPath = normalize(origPath);
      const relNorm = nPath.slice(nvPath.length + 1);
      const partsNorm = relNorm.split('/');
      
      if (partsNorm.length > 1) {
        const subfolderNameNorm = partsNorm[0];
        if (!folderMap.has(subfolderNameNorm)) {
          // Find original subfolder name in the actual path
          const origRel = origPath.slice(nvPath.length + 1);
          const origSubfolderName = origRel.split('/')[0];
          const folderExactOrigPath = origPath.slice(0, nvPath.length + 1 + origSubfolderName.length);
          
          folderMap.set(subfolderNameNorm, { isFolder: true, name: origSubfolderName, path: folderExactOrigPath });
        }
      } else {
        files.push({ ...item, isFolder: false });
      }
    });

    const combined = [...Array.from(folderMap.values()), ...files];
    const filtered = q ? combined.filter((i) => i.name.toLowerCase().includes(q)) : combined;
    return filtered.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      let res = 0;
      if (sortBy === 'name') res = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      else if (!a.isFolder && !b.isFolder) {
        if (sortBy === 'type') res = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
        else if (sortBy === 'size') res = (a.size || 0) - (b.size || 0);
        else if (sortBy === 'added') res = (a.addedAt || 0) - (b.addedAt || 0);
        else if (sortBy === 'duration') res = (a.duration || 0) - (b.duration || 0);
      }
      if (res === 0) res = (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
      return sortOrder === 'asc' ? res : -res;
    });
  }, [viewPath, libraryRootPaths, playlist, searchQuery, sortBy, sortOrder, userPlaylists, normalize]);

  return {
    playlist, setPlaylist,
    viewPath, setViewPath,
    explicitRoots, setExplicitRoots,
    libraryRootPaths,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    userPlaylists, setUserPlaylists,
    addNewPlaylist,
    refreshLibrary,
    clearLibrary,
    handleFileSelection,
    removeItem,
    removeFolder,
    normalize,
    formatPath,
    currentViewItems
  };
};
