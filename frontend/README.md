# CalAIder Chrome Extension

**Pronounced:** *Cal–eye–der* | `/kæl ˈaɪ dər/`

This directory contains the CalAIder Chrome extension built with React and Vite. The extension uses Chrome's built-in AI (Gemini Nano) to automatically detect events on web pages and add them to your Google Calendar.

<!-- ![Extension Interface](../docs/images/extension-ui.png) Add screenshot of the extension popup -->

---

##  Directory Structure

```
frontend/
└── CalAIder-frontend/           # Main extension source code
    ├── src/                     # Source files
    │   ├── popup/              # Extension popup UI
    │   ├── background.js       # Service worker
    │   ├── services/           # Business logic
    │   ├── context/            # React contexts
    │   ├── components/         # Reusable components
    │   └── utils/              # Helper functions
    ├── public/                  # Static assets
    │   ├── manifest.json       # Active manifest
    │   ├── manifest.dev.json   # Dev configuration
    │   ├── manifest.prod.json  # Production configuration
    │   └── content.js          # Content script
    ├── dist/                    # Build output (load this in Chrome)
    └── package.json            # Dependencies and scripts
```

---

##  Quick Start Guide

### Prerequisites
- **Chrome Browser** (version 120+) with Chrome Built-in AI enabled
- **Node.js** 16+ and npm
- **Google Cloud Project** with Calendar API enabled
- **OAuth Client ID** configured for Chrome Extension

### Installation Steps

#### 1. Install Dependencies
```bash
cd CalAIder-frontend
npm install
```

#### 2. Build the Extension
```bash
# For development (uses manifest.dev.json)
npm run build:dev

# For production (uses manifest.prod.json)
npm run build:prod
```

#### 3. Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `CalAIder-frontend/dist` folder
5. The extension should appear in your extensions list

<!-- ![Chrome Extensions Page](../docs/images/load-unpacked.png) Add screenshot -->

#### 4. Enable Chrome Built-in AI (if needed)
1. Navigate to `chrome://flags`
2. Search for "Prompt API for Gemini Nano"
3. Enable the flag and restart Chrome
4. Wait for Gemini Nano to download (happens automatically)

---

##  Development Workflow

### Build Commands

```bash
# Development build with hot reload manifest swap
npm run build:dev

# Production build with production manifest
npm run build:prod

# Standard build (uses current manifest.json)
npm run build:extension

# Development server (for component testing only)
npm run dev

# Lint code
npm run lint
```

### Testing Changes

1. Make changes to source files
2. Run `npm run build:dev`
3. Go to `chrome://extensions`
4. Click the **Reload** button on the CalAIder extension card
5. Test your changes

---

##  Extension Architecture

### Components

- **Popup** (`src/popup/Popup.jsx`) - Main user interface
- **Background Worker** (`src/background.js`) - Service worker for persistent tasks
- **Content Script** (`public/content.js`) - Injected into web pages for event extraction
- **Event Extraction Service** (`src/services/eventExtraction.js`) - AI-powered event detection (Google Chrome Built-In Prompt AI)
- **Google API Context** (`src/context/GoogleAPIContext.jsx`) - OAuth and Calendar API integration

### Data Flow

```
Web Page → Content Script → Background Worker → AI Model → Popup UI → Google Calendar
```

---

##  Build Output

The `dist/` folder contains the built extension ready to load in Chrome:

```
dist/
├── manifest.json          # Extension configuration
├── index.html            # Popup HTML
├── background.js         # Service worker bundle
├── content.js            # Content script
└── assets/               # CSS, JS, and image assets
```

---

##  Configuration

### OAuth Client Setup

- Set up Google Cloud Console
- Create OAuth client credentials
- Configure dev vs. production manifests with appropriate client-ids

### Manifest Files

- **`manifest.json`** - Active manifest (auto-generated during build)
- **`manifest.dev.json`** - Development configuration with dev client ID
- **`manifest.prod.json`** - Production configuration for Chrome Web Store

---

## 🐛 Troubleshooting

### Common Issues

#### "Could not load extension"
- **Cause**: Missing `manifest.json` in selected folder
- **Fix**: Ensure you selected the `dist/` folder, not the root project folder

#### "Extension disabled by policy"
- **Cause**: Enterprise or antivirus policy blocking unpacked extensions
- **Fix**: Contact your IT administrator or temporarily disable antivirus

#### OAuth / Sign-In Issues
- **Cause**: Mismatched OAuth client ID or extension ID
- **Fix**: Verify OAuth client is configured for your extension ID in Google Cloud Console

#### AI Model Not Available
- **Cause**: Chrome Built-in AI not enabled or model not downloaded
- **Fix**: Enable flags and wait for automatic download

### Debug Tools

The extension includes a built-in debug panel:
1. Open the extension popup
2. Click the debug icon
3. View extraction logs, model status, and cached data




## Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Built-in AI API](https://developer.chrome.com/docs/ai/built-in)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [Material-UI Documentation](https://mui.com/)

---

## Getting Help
- Open an issue on [GitHub](https://github.com/Kwabena-Manu/CalAIder/issues)
