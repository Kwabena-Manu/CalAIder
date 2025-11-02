# CalAIder Frontend - Chrome Extension

**Pronounced:** *Cal–eye–der* | `/kæl ˈaɪ dər/`

The frontend implementation of CalAIder - an intelligent Chrome extension that uses AI to detect events on web pages and sync them with Google Calendar.

![CalAIder Architecture](../../docs/images/architecture.png) <!-- Add architecture diagram -->

---

##  Architecture Overview

This Chrome extension is built with **React 19** and **Vite**, leveraging modern web technologies and Chrome's experimental Built-in AI API.

### Tech Stack

- **React 19** - UI framework with modern hooks
- **Vite** - Lightning-fast build tool
- **Material-UI (MUI)** - Component library
- **Chrome Extension Manifest V3** - Extension platform
- **Chrome Built-in AI (Gemini Nano)** - On-device language model
- **Google Calendar API** - Calendar integration
- **Day.js** - Date/time manipulation

---

## 📂 Project Structure

```
CalAIder-frontend/
├── src/
│   ├── popup/                      # Main popup UI
│   │   ├── Popup.jsx              # Main popup component
│   │   ├── Popup.css              # Popup styles
│   │   ├── mockData.js            # Test data for development
│   │   └── components/            # Popup sub-components
│   │       ├── EventListDisplay.jsx
│   │       └── DebugPanel.jsx
│   │
│   ├── components/                 # Shared components
│   │   ├── EditPaper.jsx          # Event editor component
│   │   └── EditPaper.css
│   │
│   ├── context/                    # React Context providers
│   │   ├── GoogleAPIContext.jsx   # Google OAuth & Calendar API
│   │   └── EventExtractionContext.jsx  # Event extraction state
│   │
│   ├── services/                   # Business logic
│   │   ├── eventExtraction.js     # AI-powered event extraction
│   │   └── schema.js              # Event data schema
│   │
│   ├── utils/                      # Helper functions
│   │   ├── dateFormatUtils.js     # Date formatting
│   │   └── timeFormatUtils.js     # Time parsing & formatting
│   │
│   ├── content/                    # Content script
│   │   └── content.js             # Page analysis script
│   │
│   ├── assets/                     # Static assets
│   │   └── css/                    # Stylesheets
│   │       └── styles.css
│   │
│   ├── background.js               # Service worker
│   ├── App.jsx                     # Root component
│   ├── main.jsx                    # Entry point
│   ├── App.css                     # App styles
│   └── index.css                   # Global styles
│
├── public/                         # Static assets
│   ├── manifest.json              # Active manifest (auto-generated)
│   ├── manifest.dev.json          # Development configuration
│   ├── manifest.prod.json         # Production configuration
│   └── content.js                 # Built content script
│
├── dist/                           # Build output (load in Chrome)
├── scripts/                        # Build scripts
│   └── post-build.js              # Post-build processing
│
├── CalAIder-for-judges.zip        # Packaged distribution
├── dist.pem                        # Extension private key (NOT COMMITTED)
├── dist.crx                        # Packed extension (NOT COMMITTED)
├── package-for-judges.ps1          # PowerShell packaging script
├── extract-public-key.js           # Public key extraction utility
│
├── vite.config.js                 # Vite configuration
├── eslint.config.js               # ESLint configuration
├── package.json                   # Dependencies
└── README.md                      # This file
```

---

## 🎯 Core Components

### 1. Popup UI (`src/popup/Popup.jsx`)

The main user interface displayed when clicking the extension icon.

**Features:**
- Sign in with Google
- View detected events
- Edit event details
- Add events to calendar
- Real-time extraction status
- Debug panel for developers

![Popup Interface](../../docs/images/popup-ui.png) <!-- Add popup screenshot -->

**Key Functionality:**
```javascript
// Main states
const [events, setEvents] = useState([]);           // Detected events
const [selectedEvent, setSelectedEvent] = useState(null);  // Event being edited
const [userEvents, setUserEvents] = useState(null);  // Calendar events
```

### 2. Background Service Worker (`src/background.js`)

Persistent background process that handles:
- Content script injection
- AI model warmup and management
- Event extraction coordination
- Storage management
- Service worker keepalive

**Key Features:**
- Model prewarming for faster first extraction
- Session-based analysis caching
- Automatic content script loading
- Message routing between components

### 3. Content Script (`public/content.js`)

Lightweight script injected into web pages to extract structured event data.

**Extraction Methods:**
1. **JSON-LD** - Schema.org Event structured data
2. **Microdata** - HTML microdata attributes
3. **Heuristics** - Text-based event detection

**Example:**
```javascript
// Detects JSON-LD events
<script type="application/ld+json">
{
  "@type": "Event",
  "name": "Tech Conference 2025",
  "startDate": "2025-12-01T09:00:00",
  "location": "San Francisco, CA"
}
</script>
```

### 4. Event Extraction Service (`src/services/eventExtraction.js`)

AI-powered service that uses Chrome's Built-in Gemini Nano model.

**Features:**
- Session caching for performance
- Download progress monitoring
- Fallback error handling
- Schema-based validation
- Past date correction

**API:**
```javascript
import { extractEventsWithAI, prewarmModel } from './services/eventExtraction';

// Warm up model (recommended at startup)
await prewarmModel({ onProgress: (p) => console.log(p) });

// Extract events from text
const events = await extractEventsWithAI(pageText, {
  onStart: () => console.log('Extracting...'),
  onProgress: (p) => console.log(`Progress: ${p}`),
  onDone: () => console.log('Done!')
});
```

### 5. Google API Context (`src/context/GoogleAPIContext.jsx`)

Manages Google OAuth authentication and Calendar API integration.

**Methods:**
- `signIn()` - Authenticate with Google
- `signOut()` - Revoke authentication
- `fetchUserInfo()` - Get user profile
- `fetchUserEvents()` - Retrieve calendar events
- `createCalendarEvent()` - Add event to calendar

**Usage:**
```javascript
const { signIn, createCalendarEvent, user } = useGoogleAPIContext();

// Sign in
await signIn();

// Add event
await createCalendarEvent(eventData);
```

---

## 🚀 Development Guide

### Initial Setup

```bash
# Install dependencies
npm install

# Build for development
npm run build:dev

# Load extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select the dist/ folder
```

### Development Workflow

```bash
# Make changes to source files
# ...

# Rebuild
npm run build:dev

# Reload extension in Chrome
# Go to chrome://extensions and click Reload button
```

### Available Scripts

```json
{
  "dev": "vite",                    // Dev server (for UI testing only)
  "build": "vite build",            // Standard build
  "build:extension": "vite build && node scripts/post-build.js",
  "build:dev": "Copy manifest.dev.json → manifest.json + build",
  "build:prod": "Copy manifest.prod.json → manifest.json + build",
  "lint": "eslint .",               // Lint source code
  "preview": "vite preview"         // Preview build
}
```

### Testing

#### Test UI Components
```bash
npm run dev
# Opens http://localhost:5173 for component development
```

#### Test Extension
```bash
npm run build:dev
# Load dist/ folder in chrome://extensions
```

#### Test AI Extraction
1. Open extension popup
2. Enable debug panel
3. Visit a page with events (e.g., eventbrite.com)
4. Check extraction logs in debug panel

---

## 🔧 Configuration

### Vite Configuration (`vite.config.js`)

Custom build configuration for Chrome extension:

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: './index.html',
        background: './src/background.js'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js'
      }
    }
  }
})
```

### Manifest Configuration

Three manifest files for different environments:

- **`manifest.json`** - Current active manifest (git-ignored during build)
- **`manifest.dev.json`** - Development (local testing)
- **`manifest.prod.json`** - Production (Chrome Web Store)

**Key Permissions:**
```json
{
  "permissions": ["identity", "storage", "activeTab", "scripting", "tabs"],
  "host_permissions": ["https://www.googleapis.com/*"],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["calendar.events", "userinfo.email", "userinfo.profile"]
  }
}
```

---

## 🎨 Styling

### Material-UI Theme

Custom theme configuration in `src/main.jsx`:

```javascript
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#4285f4' },    // Google Blue
    secondary: { main: '#34a853' }   // Google Green
  }
});
```

### CSS Organization

- `src/index.css` - Global styles
- `src/App.css` - App-level styles
- `src/popup/Popup.css` - Popup-specific styles
- Component-specific CSS files alongside components

---

## 🐛 Debugging

### Chrome DevTools

**For Popup:**
1. Right-click extension icon → "Inspect popup"
2. Opens DevTools for popup UI

**For Background Service Worker:**
1. Go to `chrome://extensions`
2. Click "Service worker" under extension
3. Opens DevTools for background script

**For Content Script:**
1. Open DevTools on any webpage (`F12`)
2. Content script runs in page context
3. Look for `[CalAIder]` logs in console

### Debug Panel

Built-in debug panel in popup:
- View raw extraction data
- Monitor AI model status
- Inspect cached events
- Clear storage

![Debug Panel](../../docs/images/debug-panel.png) <!-- Add debug panel screenshot -->

---

## 📦 Building for Production

### Preparation Checklist

- [ ] Update version in `manifest.prod.json`
- [ ] Verify production OAuth client ID is configured
- [ ] Test all features with production build
- [ ] Remove debug code and console logs
- [ ] Add extension icons (16x16, 48x48, 128x128)
- [ ] Update privacy policy URL

### Build Steps

```bash
# 1. Update manifest.prod.json with production client ID
# 2. Build
npm run build:prod

# 3. Test the build
# Load dist/ in chrome://extensions

# 4. Package for upload
cd dist
# Zip all contents (not the dist folder itself)
```

### Chrome Web Store Submission

See [PUBLISHING_GUIDE.md](../../PUBLISHING_GUIDE.md) for complete instructions.

---

## 🔐 Security Notes

- OAuth client IDs are safe to commit (they're public)
- Never commit `.pem` files or client secrets
- All AI processing happens on-device
- No user data sent to external servers
- See [SECURITY_ANALYSIS.md](../../SECURITY_ANALYSIS.md) for full audit

---

## 🏆 For Judges - Technical Deep Dive

### Chrome Built-in AI Architecture

**CalAIder demonstrates advanced integration of Chrome's Gemini Nano via the Prompt API.**

#### AI Session Management (`src/services/eventExtraction.js`)

```javascript
// Session caching for performance
let cachedSession = null;

async function getSession() {
  if (cachedSession) return cachedSession;
  
  // Capability check
  const { available, defaultTemperature, defaultTopK } = 
    await window.ai.languageModel.capabilities();
  
  if (available !== "readily") {
    throw new Error("Model not available");
  }
  
  // Create session with system prompt
  cachedSession = await window.ai.languageModel.create({
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.3,
    topK: 3
  });
  
  return cachedSession;
}
```

#### Model Prewarming (`src/background.js`)

```javascript
// Background service worker prewarms model on install
chrome.runtime.onInstalled.addListener(() => {
  tryPrewarmBackground();
});

async function tryPrewarmBackground() {
  // Lazy-load AI service only when needed
  const { prewarmModel } = await import('./services/eventExtraction.js');
  await prewarmModel();
}
```

#### Prompt Engineering Strategy

**System Prompt**: Instructs Gemini Nano to extract structured event data
**Schema Validation**: AI output validated against strict JSON schema
**Past Date Correction**: Intelligent year adjustment for historical dates
**Fallback Logic**: Graceful degradation to structured data extraction

#### Key Evaluation Points

1. **On-Device Processing**: 100% local - verify with Chrome DevTools Network tab (zero AI-related network requests)
2. **Session Persistence**: Model session cached across page navigations for instant responses
3. **Error Handling**: Download progress monitoring, capability checks, session recovery
4. **Privacy**: Event details never transmitted off-device during AI extraction

### Technical Highlights for Evaluation

- **Manifest V3 Best Practices**: Service worker architecture, dynamic content script injection
- **React 19 Patterns**: Modern hooks, context providers, suspense-ready
- **Vite Multi-Entry Build**: Separate bundles for popup, background, content scripts
- **Material-UI Integration**: Professional UI with accessibility features
- **OAuth 2.0 Flow**: Chrome Identity API with token refresh and revocation

### Demo Recommendations

1. **Network Inspection**: Open DevTools → Network, extract events, observe zero AI API calls
2. **Model Status**: Check `chrome://components` for Gemini Nano version
3. **Performance**: Measure time-to-extraction with cached vs. fresh sessions
4. **Fallback Testing**: Disable AI flags, verify structured data extraction still works

### Files to Review

- `src/services/eventExtraction.js` - Core AI integration (180 lines)
- `src/background.js` - Service worker with prewarming (220 lines)
- `public/content.js` - Multi-stage extraction (350 lines)
- `src/context/GoogleAPIContext.jsx` - OAuth & Calendar API (380 lines)

---

## 📚 Additional Documentation

- [Main README](../../README.md) - Project overview
- [Frontend README](../README.md) - Extension installation guide
- [Manifest Guide](../../MANIFEST_GUIDE.md) - OAuth configuration
- [Publishing Guide](../../PUBLISHING_GUIDE.md) - Chrome Web Store deployment
- [Security Analysis](../../SECURITY_ANALYSIS.md) - Security audit
- [Privacy Policy](../../privacy-policy.html) - CCPA-compliant privacy policy

---

## 🤝 Contributing to Frontend

### Code Style

- Use functional components with hooks
- Follow Material-UI patterns
- Use PropTypes for type checking
- Keep components under 300 lines
- Extract reusable logic to hooks or utils

### Adding Features

1. Create feature branch
2. Add components to appropriate directories
3. Update tests if applicable
4. Build and test in Chrome
5. Submit pull request

---

## 🆘 Troubleshooting

### Common Build Issues

**"Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**"Vite build fails"**
```bash
# Check for syntax errors
npm run lint
```

### Extension Issues

**"Extension won't load"**
- Verify `manifest.json` exists in `dist/`
- Check Chrome console for errors
- Ensure all permissions are valid

**"AI model not available"**
- Enable Chrome flags (see [Frontend README](../README.md))
- Wait for model download (check `chrome://components`)

---

## 📞 Support

For frontend-specific issues:
1. Check console logs (popup + background + content script)
2. Enable debug panel for detailed extraction logs
3. Review [Troubleshooting Guide](../README.md#troubleshooting)
4. Open issue on GitHub with:
   - Chrome version
   - Extension version
   - Console error messages
   - Steps to reproduce

---

**Built with React + Vite + ❤️**
