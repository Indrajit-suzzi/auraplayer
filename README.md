# Aura Player 🚀 🎵

A premium, high-performance media player built with React 19, TypeScript, Vite, and Electron. Aura Player delivers a sleek, glassmorphic interface with **zero-jitter playback**, advanced audio/video capabilities, and a focus on minimalist elegance.

## ✨ Latest Core Features (v1.2.0)

- **Metadata-First Ingestion**: Optimized library scanner using an incremental batch-processing workflow. Your files appear instantly in the UI while high-fidelity metadata (artist, duration, art) loads gracefully in the background.
- **60fps Direct-to-DOM UI**: High-frequency progress updates are decoupled from the React render loop. By using Direct-to-DOM manipulation, the scrubber and time-text update with buttery-smooth 60fps precision without any UI jitter.
- **Deep Recursive Scanning**: Advanced directory engine that explores up to 10 levels of sub-folders (security-hardened) to find and index your entire media collection automatically.
- **Adaptive Aura Engine**: The interface background dynamically extracts and transitions to the dominant color of your media's album art, creating a fully immersive environment.
- **High-Fidelity Audio Stack**:
  - **10-Band Equalizer**: Precision control over your sound with professional presets (Bass Boost, Pop, Rock, Electronic).
  - **Audio Track Switching**: Easily toggle between multi-language audio tracks in video files.
  - **Custom Media Protocol**: High-performance `media://app/` protocol handler for low-latency streaming and instant seek support.
- **Professional Video Support**:
  - **Intelligent Previews**: Hover over the scrubber for YouTube-style timestamped video previews.
  - **Zero-Shift Logic**: Stabilized header and fixed-proportion UI prevents layout shifts during hover or resize.
- **Mini Player Mode**: A compact, ultra-focused view (320x380) that stays on top of other windows for the ultimate background listening experience.
- **Security-Hardened**: Strict path-normalization and recursion depth limits ensure the player is safe to use with any file structure.

## 🛠️ Built with Performance & Security

- **Frontend**: React 19, TypeScript, Vite (Clean, warning-free codebase)
- **Desktop Wrapper**: Electron (Isolated context, secure protocol handler)
- **Styling**: Vanilla Modern CSS (Zero utility overhead, Glassmorphism)
- **Engine**: Web Audio API & Hardware Accelerated Video Rendering
- **Libraries**: Lucide React, jsmediatags, ColorThief

## 🚀 Getting Started

### Installation
1. Clone the repository: `git clone https://github.com/Indrajit-suzzi/auraplayer.git`
2. Install dependencies: `npm install`
3. Run Development: `npm run electron`
4. Build Production: `npm run dist`

## 🔮 Future Possibilities

- **Native Crossfade 2.0**: Transitioning to a hardware-accelerated AudioNode-based crossfader for sample-perfect song transitions.
- **Online Metadata Sync**: Proactive fetching of missing lyrics (`.lrc`) and high-resolution album art from global media APIs.
- **Remote Mobile Link**: Control your Aura Player wirelessly from your smartphone using a secure internal web-socket bridge.
- **Cloud Library Sync**: Cross-device playlist synchronization for seamless listening across environments.

## 📄 License
Licensed under the MIT License. Crafted for high-performance media enthusiasts.
