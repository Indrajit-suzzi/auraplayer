import React from 'react';
import jsmediatags from 'jsmediatags';
import type { MediaItem, JsMediaTagsTags, ElectronBridge } from '../types';
import { VIDEO_EXTENSIONS_REGEX, AUDIO_EXTENSIONS_REGEX } from '../constants';
import { getColor } from '../utils';

export const useMetadata = (
  playlist: MediaItem[],
  currentIndex: number,
  showNotify: (msg: string) => void
) => {
  const [albumArt, setAlbumArt] = React.useState<string | null>(null);
  const [subtitlesUrl, setSubtitlesUrl] = React.useState<string | null>(null);
  const [lyrics, setLyrics] = React.useState<Array<{time: number, text: string}>>([]);
  const [lyricIndex, setLyricIndex] = React.useState(-1);
  const [dominantColor, setDominantColor] = React.useState<string | null>(null);
  const albumArtUrlRef = React.useRef<string | null>(null);

  // Immediate Reset on Track Change to avoid inconsistency
  React.useEffect(() => {
    setAlbumArt(null);
    setDominantColor(null);
    setSubtitlesUrl(null);
    setLyrics([]);
    setLyricIndex(-1);
    if (albumArtUrlRef.current) {
      URL.revokeObjectURL(albumArtUrlRef.current);
      albumArtUrlRef.current = null;
    }
    fetchItemMetadata(currentIndex);
  }, [currentIndex, playlist.length]); // playlist.length in deps as extra safety

  // Reactive Dominant Color Extraction
  React.useEffect(() => {
    if (albumArt) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = albumArt;
      img.onload = async () => {
        try {
           const colorResult = await getColor(img);
           if (colorResult) setDominantColor(colorResult.hex());
        } catch { setDominantColor(null); }
      };
    } else {
      setDominantColor(null);
    }
  }, [albumArt]);

  const srtToVtt = (srtText: string) => {
    let vttText = "WEBVTT\n\n";
    vttText += srtText
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
      .replace(/\r/g, '');
    return vttText;
  };

  const parseLRC = (text: string) => {
    const lines = text.split('\n');
    const result: Array<{time: number, text: string}> = [];
    const regex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/;
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const msText = match[3];
        const ms = parseInt(msText) / (msText.length === 3 ? 1000 : 100);
        const time = parseInt(match[1]) * 60 + parseInt(match[2]) + ms;
        result.push({ time, text: match[4].trim() });
      }
    }
    return result.sort((a, b) => a.time - b.time);
  };

  const fetchItemMetadata = React.useCallback((index: number) => {
    const item = playlist[index];
    if (!item) return;

    const isVideo = item.type.startsWith('video') || !!item.name.match(VIDEO_EXTENSIONS_REGEX);

    // Cleanup previous object URLs to prevent memory leaks
    setSubtitlesUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setLyrics([]);
    setLyricIndex(-1);

    if (albumArtUrlRef.current) {
      URL.revokeObjectURL(albumArtUrlRef.current);
      albumArtUrlRef.current = null;
      setAlbumArt(null);
    }

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

    const electron = (window as unknown as { electron: ElectronBridge }).electron;

    if (item.url?.startsWith('media://')) {
      // jsmediatags can read from URLs if they support range requests (Electron's custom protocol does)
      if (!isVideo) {
        jsmediatags.read(item.url, { 
          onSuccess: handleTags, 
          onError: () => {
            // Silently fail for art, maybe it just doesn't have any
          } 
        });
      }
      
      if (electron?.findSidecarFile && item.path) {
        if (isVideo) {
          electron.findSidecarFile(item.path, ['srt', 'vtt']).then((subPath) => {
            if (subPath) {
              const subUrl = `media://app/${encodeURIComponent(subPath)}`;
              fetch(subUrl).then(res => res.text()).then(text => {
                const isSrt = subPath.toLowerCase().endsWith('.srt');
                const vttContent = isSrt ? srtToVtt(text) : text;
                const blobUrl = URL.createObjectURL(new Blob([vttContent], { type: 'text/vtt' }));
                setSubtitlesUrl(blobUrl);
                showNotify("Subtitles loaded");
              }).catch(() => {});
            }
          });
        }
        electron.findSidecarFile(item.path, ['lrc']).then((lrcPath) => {
          if (lrcPath) {
            const lrcUrl = `media://app/${encodeURIComponent(lrcPath)}`;
            fetch(lrcUrl).then(res => res.text()).then(text => {
              const parsed = parseLRC(text);
              if (parsed.length > 0) { setLyrics(parsed); showNotify("Lyrics loaded"); }
            }).catch(() => {});
          }
        });
      }
    } else if (item.file && (item.type.startsWith('audio/') || !!item.name.match(AUDIO_EXTENSIONS_REGEX))) {
      jsmediatags.read(item.file, { onSuccess: handleTags, onError: () => {} });
    }
  }, [playlist, showNotify]);

  // Global cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (albumArtUrlRef.current) URL.revokeObjectURL(albumArtUrlRef.current);
      if (subtitlesUrl) URL.revokeObjectURL(subtitlesUrl);
    };
  }, []);

  return {
    albumArt,
    subtitlesUrl,
    lyrics,
    lyricIndex,
    setLyricIndex,
    dominantColor,
    fetchItemMetadata
  };
};
