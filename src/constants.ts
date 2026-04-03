export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 3, 2, 0, 0, 0, 0, 0],
  Rock: [4, 3, 2, 0, -1, -1, 0, 2, 3, 4],
  Pop: [-1, 0, 1, 2, 3, 3, 2, 1, 0, -1],
  Electronic: [5, 4, 0, 0, -2, 0, 2, 3, 5, 6],
  Acoustic: [3, 2, 1, 0, 1, 2, 4, 5, 4, 2]
};

export const APP_VERSION = '1.2.0';

export const MEDIA_EXTENSIONS_REGEX = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus)$/i;
export const AUDIO_EXTENSIONS_REGEX = /\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i;
export const VIDEO_EXTENSIONS_REGEX = /\.(mp4|mkv|webm|mov|avi|flv|wmv|ogv|m4v|3gp|3g2|ts|mpeg)$/i;
