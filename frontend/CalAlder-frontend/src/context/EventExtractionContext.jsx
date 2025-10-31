// EventExtractionContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { extractEventsReady, promptApiSupported, getWarmupStatus } from '../services/eventExtraction';

const EventExtractionContext = createContext();

// Status messages for various stages
const STATUS_MESSAGES = {
    warming: 'Warming up AI model...',
    extracting: 'Analyzing page content...',
    parsing: 'Processing extracted content...',
    ready: 'Ready to extract events',
    failed: 'Failed to initialize AI model'
};

export const EventExtractionProvider = ({ children }) => {
    const [detectedEvents, setDetectedEvents] = useState([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [lastError, setLastError] = useState(null);

    // Track model loading/download progress
    const [modelProgress, setModelProgress] = useState(0);
    const [modelReady, setModelReady] = useState(false);
    const [status, setStatus] = useState(''); // Current operation status

    // Track item-by-item progress
    const [currentItem, setCurrentItem] = useState(0);
    const [totalItems, setTotalItems] = useState(0);

    // Ref to hold the current extraction's AbortController
    const abortControllerRef = useRef(null);

    // Helper: compute a stable key to identify events across sessions/caches
    const getEventKey = (ev) => (
        `${ev?.title || ev?.summary || ''}|${ev?.startDate || ''}|${ev?.location || ev?.address || ''}`
    ).toLowerCase();

    // Helper: Correct past dates by inferring current or next year
    const correctPastDate = (dateStr) => {
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

        const eventDate = new Date(dateStr);
        const now = new Date();

        // If event is more than 30 days in the past, assume it's meant for current/next year
        const daysDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
            // Try current year
            const currentYear = now.getFullYear();
            const [year, month, day] = dateStr.split('-');
            const correctedDate = `${currentYear}-${month}-${day}`;
            const correctedDateTime = new Date(correctedDate);

            // If still in the past, use next year
            if (correctedDateTime < now) {
                return `${currentYear + 1}-${month}-${day}`;
            }
            return correctedDate;
        }

        return dateStr;
    };

    // Extracts events from the current page
    const checkContentScript = async () => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type: 'PING_CONTENT_SCRIPT' }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Failed to check content script status'));
                } else if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    };

    // Cancel any in-progress extraction
    const cancelExtraction = useCallback(() => {
        (async () => {
            const url = await getCurrentPageUrl();
            // Send cancel to background service worker
            chrome.runtime.sendMessage({
                type: 'CANCEL_ANALYSIS',
                url
            }, (response) => {
                console.log('[CalAIder] Cancel response:', response);
            });
            setIsExtracting(false);
            setModelProgress(0);
            console.log('[CalAIder] Cancelled in-progress extraction');
        })();
    }, []);

    // Remove a detected event by index or id
    const removeDetectedEvent = useCallback((indexOrId) => {
        setDetectedEvents(prev => {
            if (!Array.isArray(prev)) return prev;
            const updated = (typeof indexOrId === 'number')
                ? prev.filter((_, i) => i !== indexOrId)
                : prev.filter(ev => ev.id !== indexOrId);
            // Persist cache after removal
            (async () => {
                const url = await getCurrentPageUrl();
                if (url) await saveCachedEvents(url, updated);
            })();
            return updated;
        });
    }, []);

    // Mark a detected event as added to calendar
    const markEventAsAdded = useCallback((indexOrId) => {
        setDetectedEvents(prev => {
            if (!Array.isArray(prev)) return prev;
            const updated = (typeof indexOrId === 'number')
                ? prev.map((ev, i) => i === indexOrId ? { ...ev, addedToCalendar: true } : ev)
                : prev.map(ev => ev.id === indexOrId ? { ...ev, addedToCalendar: true } : ev);
            // Persist cache so the "Added" badge survives popup reopen
            (async () => {
                const url = await getCurrentPageUrl();
                if (url) await saveCachedEvents(url, updated);
            })();
            return updated;
        });
    }, []);

    // Update a detected event by index
    const updateDetectedEvent = useCallback((index, updatedFields) => {
        setDetectedEvents(prev => {
            if (!Array.isArray(prev)) return prev;
            const updated = prev.map((ev, i) => i === index ? { ...ev, ...updatedFields } : ev);
            // Persist cache after edit so changes survive popup reopen
            (async () => {
                const url = await getCurrentPageUrl();
                if (url) await saveCachedEvents(url, updated);
            })();
            return updated;
        });
    }, []);

    // Clear all detected events and remove cache for current page
    const clearDetectedEvents = useCallback(async () => {
        setDetectedEvents([]);
        const url = await getCurrentPageUrl();
        if (url) {
            // Remove cache entry for this URL
            chrome.storage.local.get(['detectedEventsCache'], (data) => {
                const cache = data?.detectedEventsCache || {};
                delete cache[url];
                chrome.storage.local.set({ detectedEventsCache: cache }, () => {
                    console.log(`[CalAIder] Cleared cache for ${url}`);
                });
            });
            // Also clear any persisted analysis session for this URL
            try {
                await clearAnalysisSession(url);
                console.log(`[CalAIder] Cleared analysis session for ${url}`);
            } catch (e) {
                console.warn('[CalAIder] Failed to clear analysis session:', e);
            }
        }
    }, []);

    // Helper: Get current page URL from active tab
    const getCurrentPageUrl = async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.url || null;
    };

    // Helper: Load cached events for current URL if recent (< 1 hour old)
    const loadCachedEvents = async (url) => {
        if (!url) return null;
        return new Promise((resolve) => {
            chrome.storage.local.get(['detectedEventsCache'], (data) => {
                const cache = data?.detectedEventsCache || {};
                const cached = cache[url];
                if (!cached || !cached.timestamp || !cached.events) {
                    return resolve(null);
                }
                const age = Date.now() - cached.timestamp;
                const oneHour = 60 * 60 * 1000;
                if (age < oneHour) {
                    console.log(`[CalAIder] Using cached events for ${url} (age: ${Math.round(age / 1000)}s)`);
                    return resolve(cached.events);
                }
                console.log(`[CalAIder] Cache expired for ${url} (age: ${Math.round(age / 1000)}s)`);
                resolve(null);
            });
        });
    };

    // Helper: Save detected events to cache for current URL
    const saveCachedEvents = async (url, events) => {
        if (!url) return;
        return new Promise((resolve) => {
            chrome.storage.local.get(['detectedEventsCache'], (data) => {
                const cache = data?.detectedEventsCache || {};
                // Preserve addedToCalendar flags from any existing cache entries
                const prevEvents = cache[url]?.events || [];
                if (Array.isArray(prevEvents) && prevEvents.length) {
                    const prevFlags = new Map(prevEvents.map(ev => [getEventKey(ev), !!ev.addedToCalendar]));
                    events = (events || []).map(ev => {
                        const key = getEventKey(ev);
                        // If the new event doesn't explicitly set the flag, carry it over
                        return prevFlags.has(key) && ev.addedToCalendar !== true
                            ? { ...ev, addedToCalendar: prevFlags.get(key) }
                            : ev;
                    });
                }
                cache[url] = { events, timestamp: Date.now() };
                chrome.storage.local.set({ detectedEventsCache: cache }, () => {
                    console.log(`[CalAIder] Saved ${events.length} events to cache for ${url}`);
                    resolve();
                });
            });
        });
    };

    // ----- Persistent analysis session helpers (per URL) -----
    const loadAnalysisSession = async (url) => {
        if (!url) return null;
        return new Promise((resolve) => {
            chrome.storage.local.get(['analysisSessions'], (data) => {
                const sessions = data?.analysisSessions || {};
                resolve(sessions[url] || null);
            });
        });
    };

    const saveAnalysisSession = async (url, session) => {
        if (!url) return;
        return new Promise((resolve) => {
            chrome.storage.local.get(['analysisSessions'], (data) => {
                const sessions = data?.analysisSessions || {};
                sessions[url] = { ...(sessions[url] || {}), ...session, lastUpdated: Date.now() };
                chrome.storage.local.set({ analysisSessions: sessions }, () => {
                    resolve();
                });
            });
        });
    };

    const clearAnalysisSession = async (url) => {
        if (!url) return;
        return new Promise((resolve) => {
            chrome.storage.local.get(['analysisSessions'], (data) => {
                const sessions = data?.analysisSessions || {};
                delete sessions[url];
                chrome.storage.local.set({ analysisSessions: sessions }, () => resolve());
            });
        });
    };

    // Aggregate session events across completed sections with dedupe and flag preservation
    const aggregateSessionEvents = (session) => {
        if (!session) return [];
        const all = [];
        const seen = new Set();
        const sections = session.eventsPerSection || {};
        const completed = Array.isArray(session.completedIndices) ? new Set(session.completedIndices) : new Set();
        for (const [idx, evts] of Object.entries(sections)) {
            if (!completed.has(Number(idx))) continue; // only include completed
            (evts || []).forEach(ev => {
                const key = getEventKey(ev);
                if (seen.has(key)) return;
                seen.add(key);
                all.push(ev);
            });
        }
        return all;
    };

    const extractEventsFromPage = useCallback(async (forceRefresh = false) => {
        const url = await getCurrentPageUrl();

        // Check if there's already cached content/session first
        if (!forceRefresh) {
            const cached = await loadCachedEvents(url);
            if (cached && cached.length > 0) {
                setDetectedEvents(cached);
                setStatus(`Loaded ${cached.length} cached events`);
                setIsExtracting(false);
                return;
            }
        }

        setIsExtracting(true);
        setLastError(null);
        setModelProgress(0);
        setCurrentItem(0);
        setTotalItems(0);

        try {
            // Check if content script is ready
            try {
                await checkContentScript();
            } catch (err) {
                console.error('Content script check failed:', err);
                throw new Error('Please refresh the page and try again. The content script needs to be reloaded.');
            }

            // Send message to content script to get page text
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]?.id) {
                throw new Error('No active tab found');
            }

            const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_TEXT' });
            if (!response || !response.text) {
                throw new Error('Failed to get page text');
            }

            console.log('[CalAIder] Extracted content size:', response.text.length);

            if (response.text.length > 50000) {
                console.warn('[CalAIder] Content exceeds AI quota limit, truncating...');
                response.text = response.text.slice(0, 50000);
            }

            // Parse the extracted payload and determine items to send one-by-one
            setStatus('Preparing analysis...');
            let parsed = null;
            try {
                parsed = typeof response.text === 'string' ? JSON.parse(response.text) : response.text;
            } catch (e) {
                console.log("[CalAIder] Content is not JSON, treating as text");
                parsed = { type: 'body_text', content: response.text };
            }

            // Validate and normalize the extracted content
            let items = [];
            if (parsed && parsed.type === 'extracted' && Array.isArray(parsed.content)) {
                items = parsed.content.map(item => {
                    if (typeof item === 'string') return { text: item };
                    const text = [
                        item.title,
                        item.description,
                        item.date,
                        item.location
                    ].filter(Boolean).join('\n');
                    return { text };
                }).filter(item => item.text?.trim());
            } else if (parsed && typeof parsed.content === 'string') {
                items = [{ text: parsed.content }];
            } else if (Array.isArray(parsed)) {
                items = parsed.map(p => typeof p === 'string' ? { text: p } : p);
            } else {
                items = [{ text: response.text }];
            }

            console.log(`[CalAIder] Prepared ${items.length} sections for analysis`);
            setTotalItems(items.length);

            // Delegate to background service worker for persistent analysis
            chrome.runtime.sendMessage({
                type: 'START_ANALYSIS',
                url,
                items,
                forceRefresh
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('[CalAIder] Failed to start background analysis:', chrome.runtime.lastError);
                    setLastError('Failed to start analysis in background');
                    setIsExtracting(false);
                } else {
                    console.log('[CalAIder] Background analysis started:', response);
                    setStatus('Analysis running in background...');
                }
            });

        } catch (err) {
            console.error('Event extraction failed:', err);
            setLastError(err.message || 'Event extraction failed');
            setIsExtracting(false);
        }
    }, []);

    // Listen for progress updates from background service worker
    useEffect(() => {
        const handleMessage = (message, sender, sendResponse) => {
            if (message.type === 'ANALYSIS_PROGRESS') {
                const url = getCurrentPageUrl();
                url.then(currentUrl => {
                    if (message.url === currentUrl) {
                        // Update UI with progress from background
                        if (message.currentItem !== undefined) setCurrentItem(message.currentItem);
                        if (message.totalItems !== undefined) setTotalItems(message.totalItems);
                        if (message.status !== undefined) setStatus(message.status);
                        if (message.modelProgress !== undefined) setModelProgress(message.modelProgress);
                        if (message.isExtracting !== undefined) setIsExtracting(message.isExtracting);
                        if (message.detectedEvents) setDetectedEvents(message.detectedEvents);
                    }
                });
            }
        };
        chrome.runtime.onMessage.addListener(handleMessage);
        return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, []);

    // On popup open: check background status and load cached events
    useEffect(() => {
        (async () => {
            if (!chrome?.tabs) return;
            const url = await getCurrentPageUrl();

            // Query background for analysis status
            chrome.runtime.sendMessage({
                type: 'GET_ANALYSIS_STATUS',
                url
            }, (response) => {
                if (response?.isRunning) {
                    setIsExtracting(true);
                    setStatus('Analysis in progress...');
                    if (response.session) {
                        setTotalItems(response.session.totalItems || 0);
                        const completedCount = Array.isArray(response.session.completedIndices) ? response.session.completedIndices.length : 0;
                        setCurrentItem(completedCount);
                        setModelProgress(response.session.totalItems ? (completedCount / response.session.totalItems) : 0);
                    }
                    if (response.detectedEvents?.length) {
                        setDetectedEvents(response.detectedEvents);
                    }
                } else {
                    // Load cached events
                    loadCachedEvents(url).then(cached => {
                        if (cached && cached.length) {
                            setDetectedEvents(cached);
                            setStatus(`Loaded ${cached.length} cached events`);
                        } else {
                            // Auto-start analysis if no cache
                            extractEventsFromPage();
                        }
                    });
                }
            });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = {
        detectedEvents,
        isExtracting,
        lastError,
        modelProgress,
        modelReady,
        status,
        currentItem,
        totalItems,
        extractEventsFromPage,
        cancelExtraction, // Expose cancel function to consumers
        removeDetectedEvent,
        markEventAsAdded,
        updateDetectedEvent,
        clearDetectedEvents
    };

    // Note: No cleanup on unmount - extraction continues in background
    // User must explicitly click cancel button to stop extraction

    return (
        <EventExtractionContext.Provider value={value}>
            {children}
        </EventExtractionContext.Provider>
    );
};

export const useEventExtraction = () => {
    const context = useContext(EventExtractionContext);
    if (!context) {
        throw new Error('useEventExtraction must be used within EventExtractionProvider');
    }
    return context;
};

// Explicit named exports to ensure bundlers pick them up
// Note: EventExtractionProvider and useEventExtraction are exported where declared above.