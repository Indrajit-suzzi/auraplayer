export interface MediaItem {
  name: string;
  url: string;
  type: string;
  file?: File;
  path?: string;
  size?: number;
  addedAt: number;
  duration?: number;
  artist?: string;
  album?: string;
  title?: string;
  thumbnail?: string; // Base64 small thumb
}

export interface ScannedFile {
  name: string;
  path: string;
  type: string;
  size: number;
  birthtime: number;
}

export interface ElectronBridge {
  getPath: (file: File) => string;
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
  updateAllowedRoots: (roots: string[]) => void;
  saveLibrary: (data: Partial<MediaItem>[]) => Promise<boolean>;
  loadLibrary: () => Promise<Partial<MediaItem>[] | null>;
  selectFolder: () => Promise<string | null>;
}

export interface JsMediaTagsTags {
  tags: {
    picture?: {
      data: number[];
      format: string;
    };
  };
}

export interface AudioTrack {
  label: string;
  enabled: boolean;
}

export interface HTMLVideoElementWithAudioTracks extends HTMLVideoElement {
  audioTracks: AudioTrack[] & { length: number };
}

export interface FileWithPath extends File {
  path?: string;
}

export interface FolderItem {
  isFolder: true;
  isPlaylist?: boolean;
  name: string;
  path: string;
}

export type ViewItem = (MediaItem & { isFolder: false; isPlaylist?: boolean }) | FolderItem;
