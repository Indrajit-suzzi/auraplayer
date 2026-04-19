# Aura Player - How to Preview After Code Updates

## Quick Start Guide

### Prerequisites
- Node.js v20+ (v22.12.0 recommended)
- npm or yarn package manager

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   This will start Vite development server, typically on `http://localhost:5173`

3. **Open in Browser**
   - Navigate to the URL shown in terminal (usually http://localhost:5173)
   - You'll see a warning that you're not in desktop mode (this is normal for browser preview)
   - Note: Full playback functionality requires the Electron desktop app

### For Full Desktop Experience

4. **Build and Run Electron App**
   ```bash
   # Development mode with hot reload
   npm run electron:dev
   
   # Or build production version
   npm run build
   npm run electron
   ```

### Testing the Fixes

After starting the dev server, test these improvements:

1. **No More Alert Popups**: Try loading an invalid media file - you should see a toast notification instead of a browser alert

2. **Accessibility Features**:
   - Press `Tab` to navigate through controls - focus should be visible
   - Use a screen reader to verify ARIA labels are announced
   - Test keyboard navigation on player controls

3. **Performance**: The duplicate state update bug has been fixed - playback should be smoother

### Troubleshooting

**Port Already in Use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
# Or use a different port
npm run dev -- --port 3000
```

**Disk Space Issues:**
```bash
# Clean node_modules and reinstall
rm -rf node_modules
npm cache clean --force
npm install --legacy-peer-deps
```

**Node Version Warning:**
The app works on Node 20, but shows warnings. For production, upgrade to Node 22.12.0+.

### Key Files Modified

- `src/hooks/useAudioEngine.ts` - Fixed duplicate state updates
- `src/components/MainViewport.tsx` - Replaced alert() with showNotify()
- `src/components/PlayerControls.tsx` - Added comprehensive ARIA labels
- `src/App.css` - Added accessibility CSS (focus styles, reduced motion, high contrast)

### What Changed?

#### Bug Fixes:
✅ Removed duplicate `setCurrentIndex`, `setIsPlaying`, `setIsCrossfading` calls
✅ Replaced intrusive `alert()` with elegant toast notifications

#### Accessibility Improvements:
✅ All buttons now have proper `aria-label` attributes
✅ Slider controls have `role="slider"` with value ranges
✅ Focus indicators for keyboard navigation
✅ Screen reader only text for icons
✅ Support for reduced motion preferences
✅ High contrast mode support

#### UI/UX Enhancements:
✅ Consistent notification system
✅ Better keyboard accessibility
✅ Semantic HTML structure
