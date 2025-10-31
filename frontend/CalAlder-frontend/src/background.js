// Track which tabs have content scripts loaded
const loadedTabs = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log("CalAIder installed and ready!");
});

// Listen for tab updates to track content script status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).then(() => {
      loadedTabs.add(tabId);
      console.log(`Content script loaded in tab ${tabId}`);
    }).catch(err => {
      console.error(`Failed to inject content script in tab ${tabId}:`, err);
    });
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});

// Handle communication between popup and content script
// NOTE: import the eventExtraction service statically to avoid Vite's DOM-dependent
// preload wrapper which fails inside service workers (no `window` / `document`).
import * as svc from './services/eventExtraction.js';

// Keep track of whether session is warm to reduce unnecessary recreations
let sessionWarmedUp = false;

// Try to prewarm the on-device model when the background worker starts up
// (or when the extension is installed). This reduces the latency for the
// first user extraction because the model download/compile happens ahead of time.
const tryPrewarmBackground = async () => {
  if (sessionWarmedUp) {
    console.log('[CalAIder] Session already warmed up, skipping prewarm');
    return;
  }
  try {
    console.log('[CalAIder] Background attempting to prewarm model...');
    await svc.prewarmModel({
      onStart: () => console.log('[CalAIder] Model prewarm started'),
      onProgress: (p) => console.log('[CalAIder] Model prewarm progress', p),
      onDone: () => {
        console.log('[CalAIder] Model prewarm done');
        sessionWarmedUp = true;
      }
    });
    sessionWarmedUp = true;
    console.log('[CalAIder] Background model prewarm complete');
  } catch (e) {
    console.warn('[CalAIder] Background prewarm failed or not available:', e?.message || e);
  }
};

chrome.runtime.onInstalled.addListener(() => {
  tryPrewarmBackground();
});

// Also attempt prewarm when the service worker starts (onStartup)
if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    tryPrewarmBackground();
  });
}

// ----- Background Analysis Session Management -----
// Tracks active analysis per URL; continues even when popup closes
const activeAnalyses = new Map(); // url -> { cancel: AbortController, promise: Promise }

// Keep service worker alive during active analysis
let keepaliveInterval = null;
const startKeepalive = () => {
  if (keepaliveInterval) return;
  keepaliveInterval = setInterval(() => {
    // Ping to keep service worker alive
    console.log('[CalAIder BG] Keepalive ping');
  }, 20000); // Every 20 seconds
};
const stopKeepalive = () => {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
};

// Helper: date correction for past dates
const correctPastDate = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const eventDate = new Date(dateStr);
  const now = new Date();
  const daysDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) {
    const currentYear = now.getFullYear();
    const [year, month, day] = dateStr.split('-');
    const correctedDate = `${currentYear}-${month}-${day}`;
    const correctedDateTime = new Date(correctedDate);
    if (correctedDateTime < now) {
      return `${currentYear + 1}-${month}-${day}`;
    }
    return correctedDate;
  }
  return dateStr;
};

// Helper: get event key for deduplication
const getEventKey = (ev) => (
  `${ev?.title || ev?.summary || ''}|${ev?.startDate || ''}|${ev?.location || ev?.address || ''}`
).toLowerCase();

// Helper: aggregate session events with deduplication
const aggregateSessionEvents = (session) => {
  if (!session) return [];
  const all = [];
  const seen = new Set();
  const sections = session.eventsPerSection || {};
  const completed = Array.isArray(session.completedIndices) ? new Set(session.completedIndices) : new Set();
  for (const [idx, evts] of Object.entries(sections)) {
    if (!completed.has(Number(idx))) continue;
    (evts || []).forEach(ev => {
      const key = getEventKey(ev);
      if (seen.has(key)) return;
      seen.add(key);
      all.push(ev);
    });
  }
  return all;
};

// Broadcast progress update to any listening popup/contexts
const broadcastProgress = (url, update) => {
  try {
    chrome.runtime.sendMessage({ type: 'ANALYSIS_PROGRESS', url, ...update });
  } catch (e) {
    // Popup may be closed; that's OK
  }
};

// Background analysis loop: runs section-by-section, persists progress, survives popup close
const runBackgroundAnalysis = async (url, items, forceRefresh = false) => {
  console.log(`[CalAIder BG] Starting analysis for ${url}, ${items.length} sections`);

  // Start keepalive to prevent service worker termination during analysis
  startKeepalive();

  // Load or create session
  const sessionData = await new Promise((resolve) => {
    chrome.storage.local.get(['analysisSessions'], (data) => {
      const sessions = data?.analysisSessions || {};
      resolve(sessions[url] || null);
    });
  });

  let session = sessionData;
  if (!session || forceRefresh) {
    session = {
      items,
      totalItems: items.length,
      completedIndices: [],
      eventsPerSection: {},
      isRunning: true,
      startedAt: Date.now(),
    };
  } else {
    if (!Array.isArray(session.items) || session.items.length === 0) {
      session.items = items;
      session.totalItems = items.length;
    }
    session.isRunning = true;
  }

  // Save session
  await new Promise((resolve) => {
    chrome.storage.local.get(['analysisSessions'], (data) => {
      const sessions = data?.analysisSessions || {};
      sessions[url] = { ...session, lastUpdated: Date.now() };
      chrome.storage.local.set({ analysisSessions: sessions }, resolve);
    });
  });

  const abortController = new AbortController();
  const signal = abortController.signal;
  activeAnalyses.set(url, { cancel: abortController });

  broadcastProgress(url, {
    currentItem: session.completedIndices.length,
    totalItems: session.totalItems,
    status: 'Starting analysis...',
    modelProgress: session.totalItems ? (session.completedIndices.length / session.totalItems) : 0
  });

  try {
    for (let i = 0; i < session.items.length; i++) {
      if (signal.aborted) throw new Error('Analysis cancelled');

      // Skip already completed sections
      if (Array.isArray(session.completedIndices) && session.completedIndices.includes(i)) {
        continue;
      }

      const item = session.items[i] || {};
      broadcastProgress(url, {
        currentItem: i + 1,
        totalItems: session.totalItems,
        status: `Analyzing section ${i + 1} of ${session.totalItems}...`,
        modelProgress: i / Math.max(1, session.totalItems)
      });

      const inputText = typeof item === 'string'
        ? item
        : (item.title || item.description || item.text || JSON.stringify(item));

      if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));

      let result = null;
      try {
        result = await svc.extractEventsReady(inputText, {
          onStart: () => console.log(`[CalAIder BG] Section ${i + 1} started`),
          onProgress: (p) => {
            broadcastProgress(url, {
              currentItem: i + 1,
              totalItems: session.totalItems,
              status: `Analyzing section ${i + 1} (${Math.round((p || 0) * 100)}%)...`,
              modelProgress: (i + (p || 0)) / session.totalItems
            });
          },
          onDone: () => console.log(`[CalAIder BG] Section ${i + 1} done`)
        });
      } catch (err) {
        console.error(`[CalAIder BG] Section ${i + 1} failed:`, err);
        continue;
      }

      if (result?.events?.length) {
        const correctedEvents = result.events.map(ev => ({
          ...ev,
          startDate: correctPastDate(ev.startDate),
          endDate: ev.endDate ? correctPastDate(ev.endDate) : ev.endDate
        }));
        session.eventsPerSection = session.eventsPerSection || {};
        session.eventsPerSection[i] = correctedEvents;
        session.completedIndices = Array.from(new Set([...(session.completedIndices || []), i]));

        // Save session progress
        await new Promise((resolve) => {
          chrome.storage.local.get(['analysisSessions'], (data) => {
            const sessions = data?.analysisSessions || {};
            sessions[url] = { ...session, lastUpdated: Date.now() };
            chrome.storage.local.set({ analysisSessions: sessions }, resolve);
          });
        });

        // Aggregate and save to cache
        const agg = aggregateSessionEvents(session);
        await new Promise((resolve) => {
          chrome.storage.local.get(['detectedEventsCache'], (data) => {
            const cache = data?.detectedEventsCache || {};
            cache[url] = { events: agg, timestamp: Date.now() };
            chrome.storage.local.set({ detectedEventsCache: cache }, resolve);
          });
        });

        broadcastProgress(url, {
          currentItem: i + 1,
          totalItems: session.totalItems,
          status: `Found ${result.events.length} events in section ${i + 1}`,
          modelProgress: (i + 1) / session.totalItems,
          detectedEvents: agg
        });
      }
    }

    // Fallback full-page extraction if no events found
    const dedupedEvents = aggregateSessionEvents(session);
    if (dedupedEvents.length === 0) {
      broadcastProgress(url, { status: 'No events in sections, trying full-page extraction...' });
      try {
        const fullText = session.items.map(item =>
          typeof item === 'string' ? item : (item.title || item.description || item.text || JSON.stringify(item))
        ).join('\n\n');

        const fullResult = await svc.extractEventsReady(fullText, {
          onStart: () => broadcastProgress(url, { status: 'Running full-page extraction...' }),
          onProgress: (p) => broadcastProgress(url, { modelProgress: p }),
          onDone: () => { }
        });

        if (fullResult?.events?.length) {
          const correctedEvents = fullResult.events.map(ev => ({
            ...ev,
            startDate: correctPastDate(ev.startDate),
            endDate: ev.endDate ? correctPastDate(ev.endDate) : ev.endDate
          }));
          session.eventsPerSection[-1] = correctedEvents;
          session.completedIndices.push(-1);

          const agg2 = aggregateSessionEvents(session);
          await new Promise((resolve) => {
            chrome.storage.local.get(['detectedEventsCache'], (data) => {
              const cache = data?.detectedEventsCache || {};
              cache[url] = { events: agg2, timestamp: Date.now() };
              chrome.storage.local.set({ detectedEventsCache: cache }, resolve);
            });
          });

          broadcastProgress(url, {
            status: `Found ${correctedEvents.length} events (full-page)`,
            detectedEvents: agg2
          });
        }
      } catch (e) {
        console.error('[CalAIder BG] Full-page extraction failed:', e);
      }
    }

    // Mark session complete
    session.isRunning = false;
    await new Promise((resolve) => {
      chrome.storage.local.get(['analysisSessions'], (data) => {
        const sessions = data?.analysisSessions || {};
        sessions[url] = { ...session, lastUpdated: Date.now() };
        chrome.storage.local.set({ analysisSessions: sessions }, resolve);
      });
    });

    broadcastProgress(url, {
      status: 'Analysis complete!',
      modelProgress: 1,
      isExtracting: false,
      detectedEvents: aggregateSessionEvents(session)
    });

  } catch (err) {
    if (!signal.aborted) {
      console.error('[CalAIder BG] Analysis error:', err);
      broadcastProgress(url, { status: `Error: ${err.message}`, isExtracting: false });
    }
  } finally {
    activeAnalyses.delete(url);
    // Stop keepalive if no more active analyses
    if (activeAnalyses.size === 0) {
      stopKeepalive();
    }
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PING_CONTENT_SCRIPT') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ error: 'No active tab found' });
        return;
      }

      const tabId = tabs[0].id;

      try {
        // Check if content script needs to be injected
        if (!loadedTabs.has(tabId)) {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          });
          loadedTabs.add(tabId);
        }

        // Try to communicate with the content script
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
          if (chrome.runtime.lastError) {
            loadedTabs.delete(tabId); // Mark as unloaded
            sendResponse({ error: 'Content script not responding' });
          } else {
            sendResponse({ status: 'content_script_ready' });
          }
        });
      } catch (err) {
        console.error('Error checking content script:', err);
        sendResponse({ error: err.message || 'Failed to check content script' });
      }
    });
    return true; // Keep the message channel open for async response
  }

  // Start background analysis
  if (request.type === 'START_ANALYSIS') {
    const { url, items, forceRefresh } = request;
    if (activeAnalyses.has(url)) {
      sendResponse({ status: 'already_running' });
      return true;
    }
    runBackgroundAnalysis(url, items, forceRefresh).catch(err => {
      console.error('[CalAIder BG] Analysis failed:', err);
    });
    sendResponse({ status: 'started' });
    return true;
  }

  // Cancel background analysis
  if (request.type === 'CANCEL_ANALYSIS') {
    const { url } = request;
    const active = activeAnalyses.get(url);
    if (active) {
      active.cancel.abort();
      activeAnalyses.delete(url);
      // Mark session as not running
      chrome.storage.local.get(['analysisSessions'], (data) => {
        const sessions = data?.analysisSessions || {};
        if (sessions[url]) {
          sessions[url].isRunning = false;
          chrome.storage.local.set({ analysisSessions: sessions });
        }
      });
      sendResponse({ status: 'cancelled' });
    } else {
      sendResponse({ status: 'not_running' });
    }
    return true;
  }

  // Get analysis status
  if (request.type === 'GET_ANALYSIS_STATUS') {
    const { url } = request;
    const isRunning = activeAnalyses.has(url);
    chrome.storage.local.get(['analysisSessions'], (data) => {
      const sessions = data?.analysisSessions || {};
      const session = sessions[url];
      sendResponse({
        isRunning,
        session: session || null,
        detectedEvents: session ? aggregateSessionEvents(session) : []
      });
    });
    return true;
  }

  // Handle prompt requests from other contexts and run them in background
  if (request.type === 'PROMPT_EXTRACT') {
    (async () => {
      const { requestId, text } = request;
      try {
        // Use the statically imported service module to perform extraction here
        // Define handlers that forward progress events back to the requester
        const monitor = {
          onStart: () => {
            try { chrome.runtime.sendMessage({ type: 'PROMPT_PROGRESS', requestId, progress: 0 }); } catch (e) { }
          },
          onProgress: (p) => {
            try { chrome.runtime.sendMessage({ type: 'PROMPT_PROGRESS', requestId, progress: p }); } catch (e) { }
          },
          onDone: () => {
            try { chrome.runtime.sendMessage({ type: 'PROMPT_PROGRESS', requestId, progress: 1 }); } catch (e) { }
          }
        };

        const result = await svc.extractEvents(text, monitor);

        // Send final result
        sendResponse({ type: 'PROMPT_RESULT', requestId, result });
      } catch (e) {
        console.error('[CalAIder] Background prompt failed:', e);
        sendResponse({ type: 'PROMPT_RESULT', requestId, error: e.message });
      }
    })();
    return true; // async
  }
});


