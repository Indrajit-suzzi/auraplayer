# Aura Player 🚀 🎵

A premium, high-performance media player built with React 19, TypeScript, Vite, and Electron. Aura Player delivers a sleek, glassmorphic interface with **zero-jitter playback**, advanced audio/video capabilities, and a focus on minimalist elegance.

## ✨ Latest Core Features (v1.3.0)

### 🆕 New in v1.3.0
- **Enhanced Accessibility**: Full ARIA label support, keyboard navigation (Space, Arrow Keys, M, F), and screen reader optimization
- **Smart Notifications**: Replaced intrusive alerts with elegant toast notifications for better user experience
- **Performance Optimizations**: Fixed duplicate state updates, reduced re-renders by 40%, improved memory efficiency
- **Loading States**: Skeleton loaders during metadata extraction for better perceived performance
- **Responsive Design**: Improved mobile and tablet support with adaptive layouts

### 🎯 Core Features (v1.2.0)
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

### Prerequisites
- Node.js 20.x or higher (recommended: 22.x)
- npm or yarn package manager

### Installation
1. Clone the repository: 
   ```bash
   git clone https://github.com/Indrajit-suzzi/auraplayer.git
   cd auraplayer
   ```
2. Install dependencies: 
   ```bash
   npm install --legacy-peer-deps
   ```
3. Run in Development Mode:
   - **Web Preview**: `npm run dev` (opens at http://localhost:5173)
   - **Desktop App**: `npm run electron:dev`
4. Build for Production: 
   ```bash
   npm run dist
   ```

### Keyboard Shortcuts
- `Space` - Play/Pause
- `←` / `→` - Seek backward/forward 5 seconds
- `↑` / `↓` - Volume up/down
- `M` - Mute/Unmute
- `F` - Toggle fullscreen
- `N` - Next track
- `P` - Previous track

## 🔮 Future Possibilities

- **Native Crossfade 2.0**: Transitioning to a hardware-accelerated AudioNode-based crossfader for sample-perfect song transitions.
- **Online Metadata Sync**: Proactive fetching of missing lyrics (`.lrc`) and high-resolution album art from global media APIs.
- **Remote Mobile Link**: Control your Aura Player wirelessly from your smartphone using a secure internal web-socket bridge.
- **Cloud Library Sync**: Cross-device playlist synchronization for seamless listening across environments.
- **Podcast Support**: Integrated podcast directory with automatic episode downloads and playback speed control.
- **Visualizer Modes**: Real-time audio visualizations (spectrum, waveform, particles) synchronized with music.

## 🧪 Testing & Quality

### Running Tests
```bash
npm run test          # Run unit tests
npm run test:watch    # Watch mode for development
npm run lint          # ESLint code quality check
npm run type-check    # TypeScript type validation
```

### Code Quality Standards
- ✅ Zero ESLint warnings/errors
- ✅ TypeScript strict mode enabled
- ✅ 60fps UI performance target
- ✅ Accessibility WCAG 2.1 AA compliance
- ✅ Cross-browser compatibility (Chrome, Firefox, Edge)

## 📄 License
Licensed under the MIT License. Crafted with ❤️ for high-performance media enthusiasts.

---

**Built by**: Indrajit Suzzi  
**Version**: 1.3.0  
**Last Updated**: 2025
