# Aura Player 🎵

A premium, feature-rich media player built with React, TypeScript, Vite, and Electron. Aura Player offers a sleek, modern interface with advanced audio/video capabilities and a focus on aesthetics and user experience.

## ✨ Features

- **Advanced Playback**: Supports a wide range of audio and video formats using a custom `media://` protocol for high performance.
- **Custom Context Menu**: Professional right-click menu for quick access to playback controls, shuffle, repeat modes, and utility actions like "Copy Media Name".
- **Intelligent Previews**:
  - **Video**: YouTube-style thumbnail previews with timestamps on hover.
  - **Audio**: Minimal, elegant time-bubble preview on hover.
- **Smart Volume Control**:
  - **Click to Mute**: Instant mute/unmute by clicking the speaker icon.
  - **Scroll to Adjust**: Hover over the volume bar and scroll your mouse wheel for fine-grained control.
- **Adaptive Aura**: The interface background dynamically adapts to the dominant color of the current media's album art using high-performance color extraction.
- **10-Band Equalizer**: Fine-tune your audio experience with 10 frequency bands and professional presets (Bass Boost, Rock, Pop, Electronic, etc.).
- **Professional Library Management**:
  - **Smart Scanning**: Automatically indexes folders and detects media types.
  - **Granular Control**: Remove individual files or entire folder trees from your view.
  - **Advanced Sorting**: Sort by Name, Type, Size, Date Added, or Playable Duration.
  - **Custom Playlists**: Create and manage your own collections.
- **Subtitles & Audio Tracks**: Supports `.srt` and `.vtt` subtitles with auto-conversion and allows switching between multiple audio tracks in video files.
- **Crossfade & Dual-Player**: Smooth transitions between tracks using a dual-audio-engine system.
- **Mini Player Mode**: Compact, always-on-top view for background listening and viewing.
- **Customizable Themes**: Choose from several premium accent colors (Blue, Purple, Emerald, Amber, Rose).
- **Persistent Settings**: Your preferences (theme, auto-hide controls, previews, EQ gains) are saved locally and persist across sessions.

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Indrajit-suzzi/auraplayer.git
   cd auraplayer
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

To build and package the project for production (Windows):
```bash
npm run dist
```
The installer will be generated in the `release` folder.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Desktop Wrapper**: Electron
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Modern CSS Properties & Glassmorphism)
- **Audio Processing**: Web Audio API (Equalizer, Crossfade)
- **Metadata**: jsmediatags
- **Color Extraction**: ColorThief

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
