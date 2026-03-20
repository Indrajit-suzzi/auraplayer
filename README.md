# Aura Player 🎵

A premium, feature-rich media player built with React, TypeScript, Vite, and Electron. Aura Player offers a sleek, modern interface with advanced audio/video capabilities and a focus on aesthetics and user experience.

## ✨ Features

- **Advanced Playback**: Supports a wide range of audio and video formats.
- **Custom Context Menu**: Right-click anywhere for quick access to controls, shuffle, repeat, and more.
- **YouTube-style Previews**: Hover over the progress bar to see video thumbnails and timestamps.
- **Adaptive Aura**: The interface background subtly adapts to the dominant color of the current media's album art.
- **10-Band Equalizer**: Fine-tune your audio with 10 frequency bands and several built-in presets (Bass Boost, Rock, Pop, etc.).
- **Smart Library**: Automatically scans folders, supports custom playlists, and offers advanced sorting (Name, Type, Size, Date Added, Duration).
- **Subtitles Support**: Supports `.srt` and `.vtt` subtitles with automatic conversion.
- **Crossfade & Multi-Player**: Smooth transitions between audio tracks using a dual-player system.
- **Mini Player Mode**: A compact view for background listening.
- **Customizable Themes**: Choose from several accent colors (Blue, Purple, Emerald, Amber, Rose).
- **Persistent Settings**: Your preferences (theme, auto-hide controls, previews, EQ gains) are saved locally.

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Indrajit-suzzi/auraplayer.git
   cd aura-player
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Run the player in development mode with Vite and Electron:
```bash
npm run electron
```

### Building for Production

To build the project for production (Windows):
```bash
npm run dist
```
The built installer will be located in the `release` folder.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Desktop Wrapper**: Electron
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Custom properties for theming)
- **Audio Processing**: Web Audio API
- **Metadata**: jsmediatags
- **Color Extraction**: colorthief

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
